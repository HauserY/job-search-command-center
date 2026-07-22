import { defineConfig } from '@playwright/test'

// Smoke tests run against the PRODUCTION build served under the GitHub Pages
// subpath (release plan clarification 8) — the exact failure class (base
// path, SW scope, precache) that unit tests cannot see. Service worker
// registration is permitted on localhost without HTTPS.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run build:pages && npm run preview:pages',
    url: 'http://localhost:4173/job-search-command-center/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
