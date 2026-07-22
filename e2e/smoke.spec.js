// Launch-critical smoke (release plan T16 / eng finding 5):
// the demo link works for a stranger, the PWA registers, offline works —
// all under the GitHub Pages subpath. Cold-offline-first-visit is explicitly
// out of scope (documented in the release plan).
import { test, expect } from '@playwright/test'

const BASE = '/job-search-command-center/'

test('stranger flow: onboarding → demo seeds → SW active → offline reload → lazy Insights offline', async ({ page, context }) => {
  await page.goto(BASE)

  // Onboarding renders (D12 wireframe)
  await expect(page.getByRole('heading', { name: /Show up for your job search/ })).toBeVisible()

  // One click seeds the demo and lands on a populated Today tab
  await page.getByRole('button', { name: 'Start with demo data' }).click()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByText(/demo data/)).toBeVisible() // banner present

  // Service worker installs and activates (precache complete when ready)
  const swActive = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    return !!reg.active
  })
  expect(swActive).toBe(true)

  // The lazy Insights chunk is in the precache manifest (clarification 8)
  const swSource = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready
    const res = await fetch(reg.active.scriptURL)
    return res.text()
  })
  expect(swSource).toMatch(/Insights-/)

  // Offline: reload still serves the app with state intact
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect(page.getByText(/demo data/)).toBeVisible()

  // Offline: the LAZY tab loads from precache too
  await page.getByRole('button', { name: 'Insights' }).click()
  await expect(page.getByText('Last week')).toBeVisible()

  await context.setOffline(false)
})

test('leaving onboarding without choosing does not mark the browser onboarded', async ({ page }) => {
  await page.goto(BASE)
  await expect(page.getByRole('heading', { name: /Show up for your job search/ })).toBeVisible()
  // Wait past the store's 400ms debounced save — the regression this guards:
  // auto-save must not suppress onboarding for a visitor who never chose.
  await page.waitForTimeout(800)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Show up for your job search/ })).toBeVisible()
})
