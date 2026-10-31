// English / Gujarati language support: switching without reload, persistence, Gujarati content
// from the admin panel with English fallback, reviews in their original language, Gujarati
// font rendering, translated validation and SEO, and dictionary completeness.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import en from '../src/i18n/en.js'
import gu from '../src/i18n/gu.js'

const WEB_ORIGIN = 'http://localhost:4175'
let api
let csrf
const headers = () => ({ Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf })
const cleanup = []

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL: WEB_ORIGIN })
  const res = await api.post('/api/auth/login', { headers: { Origin: WEB_ORIGIN }, data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD } })
  expect(res.status()).toBe(200)
  csrf = (await res.json()).data.csrfToken
})

test.afterAll(async () => {
  for (const fn of cleanup.reverse()) await fn()
  await api.dispose()
})

const productId = async (slug) => (await (await api.get('/api/products', { params: { limit: 100 } })).json()).data.find((p) => p.slug === slug).id
const nav = (page) => page.getByRole('navigation', { name: /Main|મુખ્ય મેનુ/ })
const chooseGujarati = (page) => page.getByRole('button', { name: 'ગુજરાતી' }).click()

test('English is the default; switching to Gujarati needs no reload and is remembered', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(nav(page).getByRole('link', { name: 'About Us' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'EN', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.evaluate(() => (window.__noReload = true))
  await chooseGujarati(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
  await expect(nav(page).getByRole('link', { name: 'અમારા વિશે' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('વેબ્રિજ સોલ્યુશન્સ')
  await expect(page).toHaveTitle(/વજનકાંટા/)
  expect(await page.evaluate(() => window.__noReload)).toBe(true) // same page instance: no reload

  // Navigation and refresh keep Gujarati.
  await nav(page).getByRole('link', { name: 'પ્રોડક્ટ્સ' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'પ્રોડક્ટ્સ' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu')
  await expect(page.getByLabel('પ્રોડક્ટ્સ શોધો')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('vi_lang'))).toBe('gu')

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByLabel('Search products')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('Gujarati content entered in the admin panel is shown, with English fallback when missing', async ({ page }) => {
  const id = await productId('printer')
  const res = await api.patch(`/api/products/${id}`, { headers: headers(), data: { gu: { name: 'પ્રિન્ટર', summary: 'વેબ્રિજ ટિકિટ માટે પ્રિન્ટર.' } } })
  expect(res.status()).toBe(200)
  expect((await res.json()).data.name).toBe('Printer') // English is not overwritten
  cleanup.push(() => api.patch(`/api/products/${id}`, { headers: headers(), data: { gu: {} } }))

  await page.goto('/products/printer')
  await expect(page.getByRole('heading', { level: 1, name: 'Printer' })).toBeVisible()
  await chooseGujarati(page)
  await expect(page.getByRole('heading', { level: 1, name: 'પ્રિન્ટર' })).toBeVisible()
  await expect(page).toHaveTitle(/પ્રિન્ટર/)
  await expect(page.getByTestId('product-price')).toContainText('કિંમત વિનંતી પર')

  // A product without a Gujarati version keeps its English name and text.
  await page.goto('/products/jumbo-display')
  await expect(page.getByRole('heading', { level: 1, name: 'Jumbo Display' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'પરિચય' })).toBeVisible() // interface text still Gujarati
})

test('page SEO uses the Gujarati SEO settings when the site is in Gujarati', async ({ page }) => {
  const before = (await (await api.get('/api/seo/about')).json()).data
  await api.put('/api/seo/about', { headers: headers(), data: { gu: { title: 'અમારા વિશે | VISAT INSTRUMENTS', description: 'ચાંદલોડિયા, અમદાવાદમાં વજનકાંટા.' } } })
  cleanup.push(() => api.put('/api/seo/about', { headers: headers(), data: { gu: before.gu ?? {} } }))

  await page.goto('/about')
  await expect(page).toHaveTitle(before.title)
  await chooseGujarati(page)
  await expect(page).toHaveTitle('અમારા વિશે | VISAT INSTRUMENTS')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'ચાંદલોડિયા, અમદાવાદમાં વજનકાંટા.')
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'gu_IN')
})

test('customer reviews are shown in the language they were written in', async ({ page }) => {
  const res = await api.post('/api/testimonials', { headers: headers(), data: { name: 'English Reviewer', rating: 5, message: 'Prompt installation and helpful support.', consentConfirmed: true, published: true } })
  expect(res.status()).toBe(201)
  const id = (await res.json()).data.id
  cleanup.push(() => api.delete(`/api/testimonials/${id}`, { headers: headers() }))

  await page.goto('/reviews')
  await chooseGujarati(page)
  await expect(page.getByRole('heading', { name: 'મંજૂર થયેલા ગ્રાહક રિવ્યૂ' })).toBeVisible()
  await expect(page.getByText('Prompt installation and helpful support.')).toBeVisible() // not translated
})

test('validation and form messages are translated', async ({ page }) => {
  await page.goto('/contact')
  await chooseGujarati(page)
  await page.getByRole('button', { name: 'પૂછપરછ મોકલો' }).click()
  await expect(page.getByText('કૃપા કરીને તમારું નામ લખો.')).toBeVisible()
  await expect(page.getByText('કૃપા કરીને તમારો ફોન નંબર લખો.')).toBeVisible()
})

for (const [label, width] of [['desktop', 1366], ['mobile', 390]]) {
  test(`Gujarati text renders with the Gujarati font (${label})`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await chooseGujarati(page)
    await page.evaluate(() => document.fonts.ready)
    const font = await page.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily)
    expect(font).toMatch(/Noto Sans Gujarati/)
    expect(await page.evaluate(() => document.fonts.check('16px "Noto Sans Gujarati"', 'ગુજરાતી'))).toBe(true)
    // No untranslated keys (e.g. "nav.about") and no horizontal overflow.
    expect(await page.locator('body').innerText()).not.toMatch(/\b(?:nav|home|cta|products|reviews|price|contact)\.[a-z][A-Za-z0-9]+\b/)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  })
}

test('every interface text key has English and Gujarati text with matching placeholders', () => {
  const files = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) {
        if (name !== 'admin' && name !== 'i18n') walk(p)
      } else if (/\.(jsx?|mjs)$/.test(name)) files.push(p)
    }
  }
  walk(fileURLToPath(new URL('../src', import.meta.url)))
  const used = new Set()
  for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z]+\.[a-zA-Z0-9]+)'/g)) used.add(m[1])
  expect(used.size).toBeGreaterThan(200)
  const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  expect([...used].filter((k) => !(k in en))).toEqual([])
  expect([...used].filter((k) => !(k in gu))).toEqual([])
  expect(Object.keys(gu).filter((k) => gu[k] && placeholders(gu[k]) !== placeholders(en[k] ?? ''))).toEqual([])
})
