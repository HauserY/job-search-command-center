// Captures README screenshots from DEMO data only (sanitization gate:
// launch media never comes from real data). Requires the pages-base preview
// running on :4173. Run: node scripts/capture-screenshots.mjs
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:4173/job-search-command-center/'
mkdirSync('docs/media', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 })

await page.goto(BASE)
await page.getByRole('heading', { name: /Show up for your job search/ }).waitFor()
await page.screenshot({ path: 'docs/media/onboarding.png' })

await page.getByRole('button', { name: 'Start with demo data' }).click()
await page.getByRole('heading', { name: 'Today', exact: true }).waitFor()
await page.waitForTimeout(400)
await page.screenshot({ path: 'docs/media/today.png' })

await page.getByRole('button', { name: 'Pipeline' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'docs/media/pipeline.png' })

await page.getByRole('button', { name: 'Insights' }).click()
await page.getByText('Last week').waitFor()
await page.waitForTimeout(600)
await page.screenshot({ path: 'docs/media/insights.png' })

await browser.close()
console.log('screenshots written to docs/media/')
