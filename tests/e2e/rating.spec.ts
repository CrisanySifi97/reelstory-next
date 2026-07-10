import { test, expect } from '@playwright/test'
import { loginAsQaUser } from './helpers'

const DRAMA_ID = 'BjRRCG4bsY8iTRQ4J7P1'

// Rating the same value repeatedly is a no-op for ratingDist (useRating
// decrements the old bucket and increments the new one — equal buckets net
// to zero), so this is safe to run against the real drama on every deploy.
test('submitting a 5-star rating persists and displays', async ({ page }) => {
  await loginAsQaUser(page)
  await page.goto(`/detalhe/${DRAMA_ID}`)

  const label = page.getByText(/Avalia esta série|A tua avaliação/)
  await expect(label).toBeVisible({ timeout: 10_000 })

  const stars = label.locator('..').locator('svg')
  await stars.nth(4).click()

  await expect(page.getByText('Tu deste 5 ★')).toBeVisible({ timeout: 10_000 })
})
