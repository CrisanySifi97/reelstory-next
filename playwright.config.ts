import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  // One retry absorbs environment-level timing hiccups (dev machine under
  // load, occasional slow hydration) without masking a genuine regression —
  // a real bug fails consistently across the retry too.
  retries: 1,
  reporter: 'list',
  globalSetup: require.resolve('./tests/e2e/global-setup'),
  // A real production build avoids Turbopack's on-demand dev-compile pauses,
  // which otherwise make first-visit navigations flaky to wait on — and it's
  // what actually ships, so this suite is testing the real deploy artifact.
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 180_000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
