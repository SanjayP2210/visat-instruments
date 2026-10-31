// Admin panel workflows against the real API, Atlas test database and Cloudinary test folder.
import { deflateSync, crc32 } from 'node:zlib'
import { expect, test } from '@playwright/test'

// Tests run in file order (one worker) but independently, so one failure does not hide others.

// Valid 16×16 solid-colour PNGs generated in memory (test images for the Cloudinary test folder).
function makePng(r, g, b) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const size = 16
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 2, 0, 0, 0], 8) // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => [r, g, b][i % 3])])
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
let colour = 0
const png = (name) => ({ name, mimeType: 'image/png', buffer: makePng(20 + (colour += 37) % 200, 90, 160) })
const WEB_ORIGIN = 'http://localhost:4175'

async function signIn(page, who = 'ADMIN') {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(process.env[`E2E_${who}_EMAIL`])
  await page.getByLabel('Password').fill(process.env[`E2E_${who}_PASSWORD`])
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible()
}

const toast = (page, text) => expect(page.getByRole('status').filter({ hasText: text }).first()).toBeVisible()

test('redirects to login when signed out and rejects a wrong password', async ({ page }) => {
  await page.goto('/admin/products')
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fproducts/)
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL)
  await page.getByLabel('Password').fill('Wrong-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
})

test('signs in, returns to the requested page and shows dashboard counts', async ({ page }) => {
  await page.goto('/admin/categories')
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL)
  await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin\/categories$/)
  await expect(page.getByText('/load-cells', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByTestId('stat-products')).toHaveText('11')
  await expect(page.getByTestId('stat-categories')).toHaveText('8')
  await expect(page.getByTestId('stat-services')).toHaveText('5')
  await expect(page.getByTestId('stat-galleryImages')).toHaveText('6')
})

test('manages categories with validation, product counts and delete confirmation', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/categories')
  await expect(page.getByRole('row', { name: /Printers & Accessories/ })).toContainText('2')

  await page.getByRole('link', { name: 'Add category' }).click()
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('Category name is required.')).toBeVisible()
  await page.getByLabel('Category name').first().fill('E2E Test Category')
  await expect(page.getByLabel('Web address (slug)')).toHaveValue('e2e-test-category')
  await page.getByRole('button', { name: 'Create' }).click()
  await toast(page, 'created')

  await page.getByRole('link', { name: 'Back to list' }).click()
  await page.getByPlaceholder('Search…').fill('E2E Test')
  await expect(page.getByRole('row', { name: /E2E Test Category/ })).toBeVisible()
  await page.getByRole('button', { name: 'Delete E2E Test Category' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await toast(page, 'deleted')
  await expect(page.getByText('No matches for your search')).toBeVisible()

  // A category that still has products cannot be deleted.
  await page.getByPlaceholder('Search…').fill('Load Cells')
  await page.getByRole('button', { name: 'Delete Load Cells' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'still has 1 product' })).toBeVisible()
})

test('creates a product and manages its images in Cloudinary', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/products/new')
  await page.getByLabel('Product name').first().fill('E2E Weighing Product')
  await page.getByLabel('Category').selectOption({ label: 'Load Cells' })
  await page.getByLabel('Product type').selectOption('part')
  await page.getByRole('button', { name: 'Create' }).click()
  await toast(page, 'created')
  await expect(page.getByRole('heading', { name: 'Product images' })).toBeVisible()
  await expect(page.getByText('No images yet')).toBeVisible()

  // Client-side validation of file type.
  await page.locator('input[type=file][multiple]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(page.getByRole('alert').filter({ hasText: 'only JPG, PNG and WebP' })).toBeVisible()

  // Upload two images → stored in Cloudinary (HTTPS URLs that load).
  await page.locator('input[type=file][multiple]').setInputFiles([png('front.png'), png('side.png')])
  await toast(page, '2 images uploaded')
  const images = page.locator('li.card img')
  await expect(images).toHaveCount(2)
  const src = await images.first().getAttribute('src')
  expect(src).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/visat-instruments-test\//)
  await expect.poll(() => images.first().evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true)

  // Reorder, edit alt text, replace and delete.
  const secondSrc = await images.nth(1).getAttribute('src')
  await page.getByRole('button', { name: 'Move image 2 earlier' }).click()
  await toast(page, 'Image order saved')
  await expect(images.first()).toHaveAttribute('src', secondSrc)

  await page.getByLabel('Alt text').first().fill('E2E product front view')
  await page.getByLabel('Alt text').first().blur()
  await toast(page, 'Image details saved')

  await page.getByLabel('Replace image 1').setInputFiles(png('replacement.png'))
  await toast(page, 'Image replaced')
  await expect(images.first()).not.toHaveAttribute('src', secondSrc)

  await page.getByRole('button', { name: 'Delete image 2' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await toast(page, 'Image deleted')
  await expect(images).toHaveCount(1)

  // SEO fields and saving changes.
  await page.getByLabel('Meta title').first().fill('E2E Weighing Product')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await toast(page, 'Changes saved')

  // Delete the product (its images are removed from Cloudinary by the server).
  await page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page).toHaveURL(/\/admin\/products$/)
  await toast(page, 'deleted')
})

test('manages branding assets and blocks deleting images that are in use', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/branding')
  await page.getByLabel('Upload Business logo').setInputFiles(png('logo.png'))
  await toast(page, 'Business logo uploaded')
  const logoSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Business logo' }) })
  await expect(logoSection.locator('img')).toHaveAttribute('src', /res\.cloudinary\.com/)
  await expect(logoSection.getByRole('button', { name: 'Delete image' })).toBeDisabled()

  await logoSection.getByText('In use', { exact: true }).click() // the visible toggle label
  await toast(page, 'no longer in use')
  await logoSection.getByRole('button', { name: 'Delete image' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click()
  await toast(page, 'Image deleted')
  await expect(logoSection.getByText('Not uploaded yet')).toBeVisible()
})

test('edits the business profile primary contact', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/business-profile')
  await expect(page.getByLabel('Number as shown').first()).toHaveValue('+91 98799 92228')
  await page.getByLabel('Primary contact').nth(1).check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await toast(page, 'Business profile saved')
  await page.getByLabel('Primary contact').nth(0).check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await toast(page, 'Business profile saved')
  await page.reload()
  await expect(page.getByLabel('Primary contact').nth(0)).toBeChecked()
})

test('social media links set in the admin panel appear on the website without a redeploy', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/business-profile')
  await page.getByLabel('Facebook profile URL').fill('https://example.com/not-facebook')
  await expect(page.getByText('Enter the full https:// link to the Facebook page.')).toBeVisible()
  await page.getByLabel('Facebook profile URL').fill('https://www.facebook.com/e2e-test-page')
  await page.getByLabel('Show Facebook').check({ force: true })
  await page.getByLabel('Instagram profile URL').fill('https://www.instagram.com/e2e-test-page')
  await page.getByLabel('Show Instagram').uncheck({ force: true })
  await page.getByRole('button', { name: 'Save changes' }).click()
  await toast(page, 'Business profile saved')

  try {
    await page.goto('/contact')
    for (const area of [page.locator('footer'), page.locator('main')]) {
      const facebook = area.getByRole('link', { name: /Facebook/ })
      await expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/e2e-test-page')
      await expect(facebook).toHaveAttribute('target', '_blank')
      await expect(facebook).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(area.getByRole('link', { name: /Instagram|YouTube|LinkedIn/ })).toHaveCount(0) // disabled or empty
    }
  } finally {
    // clear the test links again
    await page.goto('/admin/business-profile')
    for (const name of ['Facebook', 'Instagram']) await page.getByLabel(`${name} profile URL`).fill('')
    await page.getByLabel('Show Facebook').uncheck({ force: true })
    await page.getByRole('button', { name: 'Save changes' }).click()
    await toast(page, 'Business profile saved')
  }
})

test('handles a customer enquiry from the website', async ({ page }) => {
  const res = await page.request.post('/api/public/enquiries', {
    headers: { Origin: WEB_ORIGIN },
    data: { name: 'E2E Customer', phone: '9876543210', message: 'Please share AMC details.', type: 'service', service: 'amc' },
  })
  expect(res.status()).toBe(201)

  await signIn(page)
  await page.goto('/admin/enquiries?status=new')
  await page.getByRole('button', { name: 'View enquiry from E2E Customer' }).click()
  await expect(page.getByRole('dialog')).toContainText('Annual Maintenance Contract (AMC)')
  const dialog = page.getByRole('dialog', { name: /Enquiry from E2E Customer/ })
  await dialog.getByLabel('Status').selectOption('in-progress')
  await dialog.getByLabel('Internal notes').fill('Called the customer.')
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await toast(page, 'Enquiry updated')
  await page.goto('/admin/enquiries?status=in-progress')
  await expect(page.getByRole('row', { name: /E2E Customer/ })).toContainText('In progress')
})

test('asks for confirmation before publishing unconfirmed content', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/content')
  await page.getByRole('button', { name: 'Edit Manufacturing capabilities' }).click()
  await expect(page.getByRole('dialog')).toContainText('not confirmed by the business')
  await page.getByText('Published on the website', { exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Publish unconfirmed content?')).toBeVisible()
  await page.getByRole('dialog', { name: 'Publish unconfirmed content?' }).getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('dialog', { name: 'Manufacturing capabilities' }).getByRole('button', { name: 'Cancel' }).click()
  await expect(page.locator('li').filter({ hasText: 'Manufacturing capabilities' })).toContainText('Unpublished')
})

test('limits Editors to content management', async ({ page }) => {
  await signIn(page, 'EDITOR')
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'Admins only' })).toBeVisible()
  await page.goto('/admin/brands')
  await expect(page.getByText('Brands can only be changed by an Admin.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Add brand' })).toHaveCount(0)
  await page.goto('/admin/categories')
  await expect(page.getByRole('button', { name: /^Delete / })).toHaveCount(0)

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('Admins manage users', async ({ page }) => {
  await signIn(page)
  await page.goto('/admin/users/new')
  await page.getByLabel('Full name').fill('E2E New Editor')
  await page.getByLabel('Email').fill('e2e-new-editor@example.com')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.locator('#f-password-error')).toContainText('At least 10 characters')
  await page.getByLabel('Password').fill('Editor-Password-123')
  await page.getByRole('button', { name: 'Create' }).click()
  await toast(page, 'created')
  await page.goto('/admin/users')
  await expect(page.getByRole('row', { name: /E2E New Editor/ })).toContainText('Editor')
})

test('works on a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('dialog', { name: 'Admin menu' }).getByRole('link', { name: 'Products' }).click()
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
})
