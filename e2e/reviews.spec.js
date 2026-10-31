// Public customer review → moderation in the admin panel → published on the website.
import { expect, test } from '@playwright/test'

async function signIn(page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL)
  await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /^Welcome/ })).toBeVisible()
}

test('a customer review is moderated before it appears on the website', async ({ page }) => {
  // 1. Public form: validation, then submission.
  await page.goto('/reviews')
  await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible()
  await expect(page.getByText('No customer reviews published yet')).toBeVisible()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByText('Please choose a rating from 1 to 5 stars.')).toBeVisible()
  await expect(page.getByText('Please agree to your review being published.')).toBeVisible()

  await page.getByLabel('Your name').fill('E2E Reviewer')
  await page.getByLabel('4 stars').check({ force: true })
  await page.getByLabel('Service / work received').selectOption('Installation')
  await page.getByLabel('Your review').fill('The weighbridge was installed neatly and the team explained everything.')
  await page.getByLabel(/I agree that my name, rating and review may be published/).check()
  await page.getByRole('button', { name: 'Submit review' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you for your review' })).toBeVisible()

  // 2. Not public while pending.
  await page.goto('/reviews')
  await expect(page.getByText('No customer reviews published yet')).toBeVisible()

  // 3. Admin: pending count, cannot publish before approving, approve, publish.
  await signIn(page)
  await expect(page.getByTestId('stat-pendingReviews')).toHaveText('1')
  await page.goto('/admin/reviews?status=pending')
  const row = page.getByRole('row', { name: /E2E Reviewer/ })
  await expect(row).toContainText('Installation')
  await expect(row).toContainText('Pending')
  await expect(row.getByRole('button', { name: /^Publish/ })).toHaveCount(0)
  await row.getByRole('button', { name: 'Approve review by E2E Reviewer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Review approved' })).toBeVisible()

  await page.goto('/admin/reviews?status=approved')
  await page.getByRole('row', { name: /E2E Reviewer/ }).getByRole('button', { name: 'Publish review by E2E Reviewer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Review published' })).toBeVisible()
  await expect(page.getByRole('row', { name: /E2E Reviewer/ })).toContainText('Published')

  // 4. Visible on the website with rating and service.
  await page.goto('/reviews')
  const card = page.locator('li').filter({ hasText: 'E2E Reviewer' })
  await expect(card).toContainText('The weighbridge was installed neatly')
  await expect(card).toContainText('Installation')
  await expect(card.getByLabel('4 out of 5 stars')).toBeVisible()

  // 4b. The live rating and review count on the home page scroll to "What our customers say".
  for (const name of ['Customer rating', 'Customer Reviews']) {
    await page.goto('/')
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: 'What our customers say' })).toBeInViewport()
  }

  // 5. Rejecting hides it again.
  await page.goto('/admin/reviews')
  await page.getByRole('row', { name: /E2E Reviewer/ }).getByRole('button', { name: 'Reject review by E2E Reviewer' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Review rejected' })).toBeVisible()
  await page.goto('/reviews')
  await expect(page.getByText('No customer reviews published yet')).toBeVisible()
})
