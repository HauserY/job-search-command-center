# Contributing

Thanks for your interest! This is a small, opinionated project — the fastest way to get a change merged is to align with its non-negotiables first.

## Ground rules (the product's identity)

1. **No backend, no accounts, ever.** All data lives in the user's browser. Features requiring a server belong in a fork.
2. **No analytics or tracking code** — and no third-party scripts, badges, or CDN assets on the page. The privacy claim covers the whole deployment.
3. **State changes require migrations.** Any change to the persisted state shape adds a step to `src/state/migrations.js` (the version number derives from the registry — adding a step IS the bump) and updates the canonical fixture in `src/state/fixtures.js`. The round-trip test will hold you to it.
4. **Data safety is load-bearing.** Anything touching `src/state/persistence.js` (quarantine, write-time skew guard, cross-tab sync) needs tests for the failure path, not just the happy path.
5. **Real vocabulary only.** Demo/fixture values must come from the enums in `src/state/defaults.js` — vocabulary tests enforce this.

## Dev loop

```bash
npm install
npm run dev        # dev server
npm test           # Vitest unit suite (fast, run it constantly)
npm run lint       # ESLint — zero errors is the bar
npm run test:e2e   # Playwright smoke vs production build (needs: npx playwright install chromium)
```

CI runs lint → unit tests → pages-base build → Playwright smoke on every PR; all must pass.

## Where things live

- `src/state/` — reducer, persistence layer, migrations, fixtures
- `src/tabs/` — the five screens; `src/pipeline/`, `src/recruiters/`, `src/onboarding/` — their components
- `src/lib/` — pure logic (dates, streaks, retro, insights, backup)
- `docs/designs/discipline-first-release.md` — the reviewed design doc behind the current release
- `e2e/` — Playwright smoke tests

## Roadmap direction

Deferred-with-intent items live in [TODOS.md](TODOS.md) (task-pack presets, forecast stat, shareable playbooks…). Picking one of those up is the highest-value contribution you can make — each entry carries its context.
