// Public website ↔ API integration (Milestone 4): live business details, catalogue, pricing,
// product details, services, gallery, branding, SEO, enquiries, fallbacks and permissions.
// Runs against the seeded Atlas test database; anything changed here is restored afterwards.
import { expect, test } from '@playwright/test'

const WEB_ORIGIN = 'http://localhost:4175'
let api // signed-in admin API context
let csrf
let site // GET /api/public/site as the website sees it

const headers = () => ({ Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf })
const productId = async (slug) => (await (await api.get('/api/products', { params: { limit: 100 } })).json()).data.find((p) => p.slug === slug).id

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL: WEB_ORIGIN })
  const res = await api.post('/api/auth/login', { headers: { Origin: WEB_ORIGIN }, data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD } })
  expect(res.status()).toBe(200)
  csrf = (await res.json()).data.csrfToken
  site = (await (await api.get('/api/public/site')).json()).data
})

test.afterAll(async () => {
  await api.dispose()
})

test('home page shows live business details, featured products and services', async ({ page }) => {
  await page.goto('/')
  const primary = site.business.contactNumbers.find((c) => c.isPrimary)
  await expect(page.getByRole('link', { name: primary.displayNumber }).first()).toBeVisible()
  await expect(page.locator('a[href^="https://wa.me/"]').first()).toHaveAttribute('href', new RegExp(primary.dialNumber.replace('+', '')))
  const featured = site.products.filter((p) => p.featured).slice(0, 3)
  for (const p of featured) await expect(page.getByRole('heading', { name: p.name, exact: true })).toBeVisible()
  for (const s of site.services) await expect(page.getByRole('heading', { name: s.title, exact: true }).first()).toBeVisible()
  // The hero "Categories" stat opens the products page.
  await page.getByRole('link', { name: 'Categories', exact: true }).click()
  await expect(page).toHaveURL(/\/products$/)
})

test('products page lists live products with search, category filter and photo placeholders', async ({ page }) => {
  await page.goto('/products')
  const cards = page.locator('article')
  await expect(cards).toHaveCount(site.products.length)
  await expect(page.getByText('Photo coming soon').first()).toBeVisible() // products without photos
  await expect(cards.first().getByTestId('price')).toHaveText('Price on request')

  await page.getByLabel('Search products').fill('printer')
  await expect(cards).toHaveCount(1)
  await expect(page).toHaveURL(/q=printer/)
  await page.getByLabel('Search products').fill('')

  const category = site.categories.find((c) => site.products.some((p) => p.category.id === c.id))
  await page.getByRole('group', { name: 'Filter products by category' }).getByRole('button', { name: new RegExp(category.name) }).click()
  await expect(cards).toHaveCount(site.products.filter((p) => p.category.id === category.id).length)
  await expect(page).toHaveURL(new RegExp(`category=${category.slug}`))
})

test('pricing entered in the admin panel shows on the website; request quote hides it', async ({ page }) => {
  const id = await productId('jumbo-display')
  const set = (pricing) => api.patch(`/api/products/${id}`, { headers: headers(), data: { pricing } })
  expect((await set({ type: 'fixed', originalPrice: 20000, sellingPrice: 15000, gst: 'exclusive', gstRate: 18, additionalCharges: 'Transport extra', availability: 'in-stock' })).status()).toBe(200)
  try {
    await page.goto('/products/jumbo-display')
    const price = page.getByTestId('product-price')
    await expect(price).toContainText('₹15,000')
    await expect(price).toContainText('₹20,000')
    await expect(price).toContainText('You save ₹5,000 (25% off)')
    await expect(price).toContainText('Plus GST @ 18%')
    await expect(price).toContainText('Transport extra')
    await expect(price).toContainText('In stock')

    await page.goto('/products?q=jumbo')
    await expect(page.locator('article').getByTestId('price')).toContainText('₹15,000')
    await expect(page.locator('article').getByTestId('price')).toContainText('25% off')

    await set({ type: 'starting-from', sellingPrice: 15000, gst: 'inclusive' })
    await page.goto('/products/jumbo-display')
    await expect(page.getByTestId('product-price')).toContainText('Starting from')
    await expect(page.getByTestId('product-price')).toContainText('Inclusive of GST')
    await expect(page.getByTestId('product-price')).not.toContainText('You save')
  } finally {
    await set({ type: 'request-quote', originalPrice: null, sellingPrice: null, gst: 'not-specified', gstRate: null, additionalCharges: '', availability: 'not-specified' })
  }
  await page.goto('/products/jumbo-display')
  await expect(page.getByTestId('product-price')).toContainText('Price on request')
  await expect(page.getByTestId('product-price')).not.toContainText('₹')
})

test('product details: direct URL, live content, SEO tags and not-found', async ({ page }) => {
  const product = site.products.find((p) => p.images.length)
  await page.goto(`/products/${product.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()
  await expect(page.getByText(product.description)).toBeVisible()
  await expect(page.getByRole('link', { name: product.category.name }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: `Enlarge photo of ${product.name}` })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Price' })).toHaveCount(0) // the price block replaces the old spec row
  await expect(page).toHaveTitle(new RegExp(product.name))
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${WEB_ORIGIN}/products/${product.slug}`)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', new RegExp(product.name))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible()

  await page.goto('/products/no-such-product')
  await expect(page.getByText(/not found/i).first()).toBeVisible()
})

test('page SEO comes from the admin SEO settings', async ({ page }) => {
  await page.goto('/about')
  await expect(page).toHaveTitle(site.seo.about.title)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', site.seo.about.description)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${WEB_ORIGIN}/about`)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /^http/)
})

test('services and gallery come from the API', async ({ page }) => {
  await page.goto('/services')
  for (const s of site.services) await expect(page.getByRole('heading', { name: s.title, exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Calibration' })).toHaveCount(0) // unpublished service
  await page.getByRole('link', { name: `Send an enquiry about ${site.services[0].title}` }).click()
  await expect(page).toHaveURL(new RegExp(`/contact\\?service=${site.services[0].slug}`))
  await expect(page.getByLabel(/Interested in/)).toHaveValue(`service:${site.services[0].slug}`)

  await page.goto('/gallery')
  await expect(page.getByRole('button', { name: /^Open image:/ })).toHaveCount(site.gallery.length)
})

test('contact enquiry is saved through the enquiry API', async ({ page }) => {
  await page.goto('/contact?product=printer')
  await expect(page.getByLabel(/Interested in/)).toHaveValue('product:printer')
  await page.getByLabel(/Full name/).fill('E2E Enquirer')
  await page.getByLabel(/Phone number/).fill('98765 43210')
  await page.getByLabel(/Message/).fill('Please share details for a printer.')
  await page.getByRole('button', { name: 'Submit enquiry' }).click()
  await expect(page.getByText('Your enquiry has been received')).toBeVisible()

  const list = await (await api.get('/api/enquiries', { params: { type: 'product', limit: 10 } })).json()
  const saved = list.data.find((e) => e.name === 'E2E Enquirer')
  expect(saved).toMatchObject({ type: 'product', interest: 'Printer', status: 'new' })
  await api.delete(`/api/enquiries/${saved.id}`, { headers: headers() })
})

test('branding uploaded in the admin panel replaces the built-in logo and banner', async ({ page }) => {
  // Simulates Branding & Media assets in the public bundle (no Cloudinary upload needed).
  const logo = 'https://res.cloudinary.com/demo/image/upload/v1/visat/logo.png'
  const banner = 'https://res.cloudinary.com/demo/image/upload/v1/visat/banner.jpg'
  await page.route('**/api/public/site', async (route) => {
    const res = await route.fetch()
    const json = await res.json()
    json.data.assets = { 'header-logo': [{ image: { url: logo, alt: 'Uploaded logo' } }], 'home-banner': [{ title: 'Banner', image: { url: banner, alt: 'Uploaded banner' } }] }
    await route.fulfill({ response: res, json })
  })
  await page.goto('/')
  await expect(page.locator('header').getByAltText('Uploaded logo')).toHaveAttribute('src', /f_auto,q_auto/) // optimised Cloudinary delivery
  await expect(page.getByAltText('Uploaded banner')).toHaveAttribute('src', /visat\/banner\.jpg/)
})

test('when the API is unreachable: built-in catalogue fallback and friendly messages', async ({ page }) => {
  await page.route('**/api/public/site', (route) => route.abort())
  await page.goto('/products')
  await expect(page.getByText('The latest catalogue could not be loaded')).toBeVisible()
  await expect(page.locator('article').first()).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('Customer reviews could not be loaded right now.')).toBeVisible()
})

test('admin-only endpoints are not public', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: WEB_ORIGIN })
  for (const path of ['/api/enquiries', '/api/products', '/api/dashboard', '/api/testimonials']) expect((await anon.get(path)).status()).toBe(401)
  expect((await anon.get('/api/public/site')).status()).toBe(200)
  await anon.dispose()
})
