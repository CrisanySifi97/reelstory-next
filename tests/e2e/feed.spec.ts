import { test, expect } from '@playwright/test'
import { loginAsQaUser } from './helpers'

// "Da Rua ao Topo" — episode 1 is free and has a real Bunny.net url, so this
// exercises the actual video path (not the locked/resolvedUrls one).
const DRAMA_ID = 'BjRRCG4bsY8iTRQ4J7P1'
const FREE_EP_ID = 1

test('free episode loads and the video element becomes playable', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', e => pageErrors.push(e.message))

  await loginAsQaUser(page)
  await page.goto(`/feed?id=${DRAMA_ID}&ep=${FREE_EP_ID}`)

  const video = page.locator('video').first()
  await expect(video).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 15_000 })
    .toBeGreaterThan(0)

  expect(pageErrors).toEqual([])
})
