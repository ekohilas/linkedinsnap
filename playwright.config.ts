import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__snapshots__',
  use: {
    baseURL: 'http://localhost:5173/linkedinsnap/',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/linkedinsnap/',
    reuseExistingServer: !process.env.CI,
  },
})
