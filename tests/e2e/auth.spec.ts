import { test, expect } from '@playwright/test'
import { loginAsQaUser } from './helpers'

test('login with email/password redirects to /inicio with no page errors', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', e => pageErrors.push(e.message))

  await loginAsQaUser(page)

  await expect(page).toHaveURL(/\/inicio/)
  expect(pageErrors).toEqual([])
})
