import { test, expect } from '@playwright/test'
import { FieldValue } from 'firebase-admin/firestore'
import { db, adminAuth } from './admin'
import { loginAsQaUser, QA_EMAIL } from './helpers'

const DRAMA_ID = 'BjRRCG4bsY8iTRQ4J7P1'
const FREE_EP_ID = 1
const STATS_KEY = `${DRAMA_ID}_${FREE_EP_ID}`

async function qaUserRef() {
  const user = await adminAuth.getUserByEmail(QA_EMAIL)
  return db.collection('users').doc(user.uid)
}

// Tapping the screen to reveal the action rail (it auto-hides after 3s with
// pointer-events:none) also toggles play/pause on the same tap-to-pause
// overlay — force the video back to paused afterward so a short episode
// can't autoplay-advance to the next one while we're clicking.
async function revealAndClickLike(page: import('@playwright/test').Page, likeLabel: ReturnType<import('@playwright/test').Page['getByText']>) {
  const vp = page.viewportSize()!
  await expect(async () => {
    await page.mouse.click(vp.width / 2, vp.height / 2)
    await page.evaluate(() => document.querySelector('video')?.pause())
    await expect
      .poll(() => likeLabel.evaluate(el => getComputedStyle(el.parentElement!.parentElement!).pointerEvents))
      .toBe('auto')
    // The same tap also briefly shows a play/pause icon overlay (~600ms) that
    // can intercept the click right after revealing the rail — let it clear.
    await page.waitForTimeout(700)
    await likeLabel.click({ timeout: 3_000 })
  }).toPass({ timeout: 15_000 })
}

test('liking an episode increments the shared counter', async ({ page }) => {
  const userRef = await qaUserRef()
  await userRef.update({ likedEpisodes: FieldValue.arrayRemove(STATS_KEY) })
  const statsRef = db.collection('episodeStats').doc(STATS_KEY)
  const before = (await statsRef.get()).data()?.likes ?? 0

  await loginAsQaUser(page)
  await page.goto(`/feed?id=${DRAMA_ID}&ep=${FREE_EP_ID}`)
  await page.waitForTimeout(1_500)

  const likeLabel = page.getByText('Gosto').first()
  await expect(likeLabel).toBeVisible()
  await revealAndClickLike(page, likeLabel)

  await expect.poll(async () => (await statsRef.get()).data()?.likes ?? 0, { timeout: 5_000 }).toBe(before + 1)

  // clean up so this test doesn't inflate the real counter permanently
  await userRef.update({ likedEpisodes: FieldValue.arrayRemove(STATS_KEY) })
  await statsRef.set({ likes: FieldValue.increment(-1) }, { merge: true })
})

test('unliking an already-liked episode decrements the shared counter', async ({ page }) => {
  const userRef = await qaUserRef()
  await userRef.update({ likedEpisodes: FieldValue.arrayUnion(STATS_KEY) })
  const statsRef = db.collection('episodeStats').doc(STATS_KEY)
  await statsRef.set({ likes: FieldValue.increment(1) }, { merge: true })
  const before = (await statsRef.get()).data()?.likes ?? 0

  await loginAsQaUser(page)
  await page.goto(`/feed?id=${DRAMA_ID}&ep=${FREE_EP_ID}`)
  await page.waitForTimeout(1_500)

  const likeLabel = page.getByText('Gosto').first()
  await expect(likeLabel).toBeVisible()
  await revealAndClickLike(page, likeLabel)

  await expect.poll(async () => (await statsRef.get()).data()?.likes ?? 0, { timeout: 5_000 }).toBe(before - 1)
})
