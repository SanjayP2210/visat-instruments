// Analytics consent on the public site and the Admin-only Analytics & Logs pages.
import { expect, test } from '@playwright/test'

const isTrack = (req) => req.url().endsWith('/api/public/track') && req.method() === 'POST'

async function signIn(page, who = 'ADMIN') {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(process.env[`E2E_${who}_EMAIL`])
  await page.getByLabel('Password').fill(process.env[`E2E_${who}_PASSWORD`])
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible()
}

test.describe('analytics consent', () => {
  test.use({
    storageState: { cookies: [], origins: [] }, // first visit: no choice made yet
    // The API ignores "HeadlessChrome" (and other bots), so present as a regular desktop browser.
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  })

  test('tracks nothing before consent, then tracks after "Allow analytics"', async ({ page, browser }) => {
    const tracked = []
    page.on('request', (req) => isTrack(req) && tracked.push(req.postDataJSON()))

    await page.goto('/')
    const banner = page.getByRole('dialog', { name: 'Help us improve this website' })
    await expect(banner).toBeVisible()
    await page.goto('/about')
    await page.waitForTimeout(500)
    expect(tracked).toHaveLength(0)
    expect(await page.evaluate(() => document.querySelector('script[src*="googletagmanager"]'))).toBeNull()

    // The current page is counted once consent is given; batches are sent after a few seconds.
    const sent = page.waitForRequest(isTrack, { timeout: 10_000 })
    await banner.getByRole('button', { name: 'Allow analytics' }).click()
    await expect(banner).toBeHidden()
    const body = (await sent).postDataJSON()
    expect(body.events).toEqual([{ type: 'page_view', path: '/about' }])
    expect(body.session).toMatchObject({ landing: '/about' }) // page.goto is a full page load
    expect(JSON.stringify(body)).not.toMatch(/@|password/i)

    // Contact clicks are recorded; leaving the page sends the queue straight away.
    await page.goto('/contact')
    const exit = page.waitForRequest(isTrack, { timeout: 10_000 })
    await page.evaluate(() => {
      const a = document.querySelector('a[href^="tel:"]')
      a.addEventListener('click', (e) => e.preventDefault(), { once: true }) // stay on the page
      a.click()
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await exit // sent with sendBeacon (Playwright cannot read its body), so check what the server stored
    const admin = await browser.newContext()
    const adminPage = await admin.newPage()
    await signIn(adminPage)
    await expect
      .poll(async () => (await (await adminPage.request.get('/api/analytics/events?type=phone_click')).json()).meta.total)
      .toBe(1)
    await admin.close()
  })

  test('rejecting stops tracking and the choice can be changed from the footer', async ({ page }) => {
    const tracked = []
    page.on('request', (req) => isTrack(req) && tracked.push(req))

    await page.goto('/')
    await page.getByRole('button', { name: 'Reject' }).click()
    await page.goto('/products')
    await page.goto('/services')
    expect(tracked).toHaveLength(0)

    await page.getByRole('button', { name: 'Cookie preferences' }).click()
    const banner = page.getByRole('dialog', { name: 'Help us improve this website' })
    await expect(banner.getByText('Analytics is currently off.')).toBeVisible()
    await banner.getByRole('button', { name: 'Close' }).click()
    await expect(banner).toBeHidden()
  })
})

test('Admins see Analytics & Logs; Editors cannot open them', async ({ page, browser }) => {
  await signIn(page)
  const nav = page.getByRole('navigation', { name: 'Admin' })
  await nav.getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByRole('heading', { name: 'Analytics overview' })).toBeVisible()
  await expect(page.getByText('Page views').first()).toBeVisible()

  await nav.getByRole('link', { name: 'Visitor analytics' }).click()
  await expect(page.getByRole('heading', { name: 'Traffic sources' })).toBeVisible()

  await nav.getByRole('link', { name: 'Visitor activity' }).click()
  await expect(page.getByRole('heading', { name: 'Visitor activity' })).toBeVisible()

  await nav.getByRole('link', { name: 'System logs' }).click()
  await expect(page.getByRole('heading', { name: 'System logs' })).toBeVisible()

  await nav.getByRole('link', { name: 'Admin activity' }).click()
  await expect(page.getByRole('heading', { name: 'Admin activity' })).toBeVisible()
  await expect(page.getByText('auth · login').first()).toBeVisible() // this sign-in was recorded

  if (!process.env.E2E_EDITOR_EMAIL) return
  const editorContext = await browser.newContext()
  const editor = await editorContext.newPage()
  await signIn(editor, 'EDITOR')
  await expect(editor.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'System logs' })).toHaveCount(0)
  await editor.goto('/admin/logs/system')
  await expect(editor.getByRole('heading', { name: 'Admins only' })).toBeVisible()
  expect((await editor.request.get('/api/logs/system')).status()).toBe(403)
  await editorContext.close()
})
