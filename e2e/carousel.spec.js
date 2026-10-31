// Home page "What our customers say" carousel: layout, autoplay, pause/resume, loop, swipe,
// responsive behaviour and reduced motion. Uses real approved + published reviews created
// through the admin API in the test database (removed again afterwards).
import { expect, test } from '@playwright/test'

const WEB_ORIGIN = 'http://localhost:4175'
let created = []
let api // signed-in admin API context
let csrf

async function createReviews(names) {
  for (const name of names) {
    const res = await api.post('/api/testimonials', {
      headers: { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf },
      data: { name, rating: 5, serviceReceived: 'Installation', message: `Review from ${name}: good installation and support.`, consentConfirmed: true, published: true },
    })
    expect(res.status()).toBe(201)
    created.push((await res.json()).data.id)
  }
}

test.beforeAll(async ({ playwright }) => {
  api = await playwright.request.newContext({ baseURL: WEB_ORIGIN })
  const res = await api.post('/api/auth/login', { headers: { Origin: WEB_ORIGIN }, data: { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD } })
  expect(res.status()).toBe(200)
  csrf = (await res.json()).data.csrfToken
})

async function deleteCreated() {
  for (const id of created) await api.delete(`/api/testimonials/${id}`, { headers: { Origin: WEB_ORIGIN, 'X-CSRF-Token': csrf } })
  created = []
}

// Each group owns its reviews, so a worker restart after a failure cannot leave stale counts.
test.afterAll(async () => {
  await deleteCreated()
  await api.dispose()
})

/** Names, clone flags and positions of the slides fully inside the carousel viewport. */
function visibleSlides(page) {
  return page.evaluate(() => {
    const vp = document.querySelector('[data-testid="reviews-viewport"]').getBoundingClientRect()
    return [...document.querySelectorAll('[data-testid="review-slide"]')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.left >= vp.left - 2 && r.right <= vp.right + 2)
      .map(({ el, r }) => ({ name: el.querySelector('footer p').textContent, clone: el.dataset.clone === 'true', top: Math.round(r.top), height: Math.round(r.height) }))
  })
}
const firstName = async (page) => (await visibleSlides(page))[0]?.name

async function openCarousel(page) {
  await page.goto('/')
  const carousel = page.getByTestId('reviews-carousel')
  await carousel.scrollIntoViewIfNeeded()
  await expect(carousel).toBeVisible()
  return carousel
}

test.describe('with 2 reviews', () => {
  test.beforeAll(() => createReviews(['Reviewer 1', 'Reviewer 2']))
  test.afterAll(deleteCreated)

  test('shows both once, no copies, no controls', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await openCarousel(page)
    const slides = page.getByTestId('review-slide')
    await expect(slides).toHaveCount(2)
    await expect(page.locator('[data-testid="review-slide"][data-clone="true"]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next reviews' })).toHaveCount(0)
  })
})

test.describe('with 7 reviews', () => {
  test.beforeAll(() => createReviews(['Reviewer 1', 'Reviewer 2', 'Reviewer 3', 'Reviewer 4', 'Reviewer 5', 'Reviewer 6', 'Reviewer 7']))
  test.afterAll(deleteCreated)

  test('desktop: 5 equal-height cards in one row, arrows and dots, seamless loop', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await openCarousel(page)
    const visible = await visibleSlides(page)
    expect(visible).toHaveLength(5)
    expect(new Set(visible.map((s) => s.top)).size).toBe(1) // one row
    expect(new Set(visible.map((s) => s.height)).size).toBe(1) // equal heights
    expect(new Set(visible.map((s) => s.name)).size).toBe(5) // no duplicates in view
    await expect(page.getByRole('group', { name: 'Choose reviews' }).getByRole('button')).toHaveCount(2)

    // Click "Next" several times: always 5 distinct cards once the slide settles. Edge copies
    // may be in view at rest (7 reviews, 5 per view) but never the same review twice.
    const seen = []
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Next reviews' }).click()
      await page.waitForTimeout(1000)
      const now = await visibleSlides(page)
      expect(now).toHaveLength(5)
      expect(new Set(now.map((s) => s.name)).size).toBe(5)
      seen.push(now[0].name)
    }
    expect(new Set(seen).size).toBeGreaterThan(1)

    await page.getByRole('button', { name: 'Previous reviews' }).click()
    await page.waitForTimeout(1000)
    const back = await visibleSlides(page)
    expect(back).toHaveLength(5)
    expect(new Set(back.map((s) => s.name)).size).toBe(5)
  })

  test('autoplay advances every 5 s, pauses on hover and resumes on leave', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    const carousel = await openCarousel(page)
    await page.mouse.move(5, 5) // pointer away from the carousel
    const start = await firstName(page)
    await expect.poll(() => firstName(page), { timeout: 8000 }).not.toBe(start)

    await carousel.hover()
    await expect(carousel).toHaveAttribute('data-paused', 'true')
    await page.waitForTimeout(1000) // let a slide already in motion settle
    const paused = await firstName(page)
    await page.waitForTimeout(6500)
    expect(await firstName(page)).toBe(paused)

    await page.mouse.move(5, 5)
    await expect(carousel).toHaveAttribute('data-paused', 'false')
    await expect.poll(() => firstName(page), { timeout: 8000 }).not.toBe(paused)
  })

  test('manual navigation resets the autoplay timer', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await openCarousel(page)
    await page.mouse.move(5, 5)
    await page.waitForTimeout(4000) // almost time for autoplay…
    await page.getByRole('button', { name: 'Next reviews' }).click()
    await page.mouse.move(5, 5) // leave the button so hover does not pause
    await page.waitForTimeout(1000)
    const afterClick = await firstName(page)
    await page.waitForTimeout(2500) // 3.5 s after the click: the timer restarted, so no move yet
    expect(await firstName(page)).toBe(afterClick)
  })

  test('pauses while the browser tab is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    const carousel = await openCarousel(page)
    await page.mouse.move(5, 5)
    const setHidden = (hidden) =>
      page.evaluate((h) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => h })
        document.dispatchEvent(new Event('visibilitychange'))
      }, hidden)
    await setHidden(true)
    await expect(carousel).toHaveAttribute('data-paused', 'true')
    const before = await firstName(page)
    await page.waitForTimeout(6500)
    expect(await firstName(page)).toBe(before)
    await setHidden(false)
    await expect.poll(() => firstName(page), { timeout: 8000 }).not.toBe(before)
  })

  test('supports drag / swipe', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 })
    await openCarousel(page)
    const box = await page.getByTestId('reviews-viewport').boundingBox()
    const before = await firstName(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 250, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(1000)
    expect(await firstName(page)).not.toBe(before)
  })

  for (const [label, width, perView] of [['tablet', 900, 3], ['small tablet', 700, 2], ['mobile', 390, 1]]) {
    test(`${label}: ${perView} card(s) in one row`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openCarousel(page)
      const visible = await visibleSlides(page)
      expect(visible).toHaveLength(perView)
      expect(new Set(visible.map((s) => s.top)).size).toBe(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
    })
  }

  test('reduced motion: no autoplay, arrows still work', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 1366, height: 900 })
    await openCarousel(page)
    await page.mouse.move(5, 5)
    const before = await firstName(page)
    await page.waitForTimeout(6000)
    expect(await firstName(page)).toBe(before)
    await page.getByRole('button', { name: 'Next reviews' }).click()
    await expect.poll(() => firstName(page)).not.toBe(before)
  })
})
