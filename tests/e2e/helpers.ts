import { Page, expect } from '@playwright/test'

export const QA_EMAIL = 'qa-smoke@reelstory.test'
export const QA_PASSWORD = 'QaSmoke123!'

export async function loginAsQaUser(page: Page) {
  // Next's SSR hydration can occasionally reset the controlled inputs (or
  // swallow the submit click) if we interact right as it reconciles — retry
  // the whole flow from a fresh navigation rather than patching a sub-step,
  // since a partial retry can still land on a stale, about-to-be-replaced DOM.
  await expect(async () => {
    await page.goto('/login')

    const emailInput = page.getByPlaceholder('email@exemplo.com')
    const passInput = page.getByPlaceholder('Mínimo 6 caracteres')
    await expect(emailInput).toBeVisible({ timeout: 15_000 })

    await emailInput.fill(QA_EMAIL)
    await passInput.fill(QA_PASSWORD)
    await expect(emailInput).toHaveValue(QA_EMAIL)
    await expect(passInput).toHaveValue(QA_PASSWORD)

    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL('**/inicio', { timeout: 8_000 })
  }).toPass({ timeout: 45_000 })
}
