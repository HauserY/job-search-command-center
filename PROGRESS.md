# Job Search Command Center (JSCC) — Progress Reference

## Current status (2026-07-22)

**Publicly released.** Live app: https://hausery.github.io/job-search-command-center/ · Repo: https://github.com/HauserY/job-search-command-center (public repo has fresh history; this local repo keeps the full private history on `master`).

- Release scope: the full Discipline-First Release plan (docs/designs/discipline-first-release.md), all 25 tasks (T1–T17 + eng E-tasks) complete
- Quality gates: 137 unit tests + 2 Playwright smoke tests green; lint 0 errors; CEO + Eng reviews CLEARED
- The app is a PWA: installable from the live URL, works offline
- Data does NOT sync between computers by design — move data via Settings → Export JSON / Import
- Post-launch backlog lives in TODOS.md (presets, forecast stat, playbooks, backup nudge, table primitive)

## What is this app?

A local browser-based tool to manage an active job search. No backend, no account — all data is stored in your browser's `localStorage` under the key `jscc_v1`. Run it locally with `npm run dev`.

---

## Tabs & Features

### 1. Today (`src/tabs/Today.jsx`)
Your daily dashboard.
- **Task checklist** — mix of checkbox tasks (e.g. "Reply to ALL recruiter messages"), counter tasks with targets (LinkedIn/Dice/ZipRecruiter/Hiring.cafe/proactive messages), and a live "follow-ups due" indicator that counts open pipeline items due today.
- **Progress rings** — "All" and "Core" completion percentages for the day.
- **Streaks** — full-day and core-only consecutive streak counters.
- **History section:**
  - Heatmap calendar (last 26 weeks, color-coded by completion %)
  - **Daily totals table** — per-day application counts (Today row + last 13 days from history)
  - **Weekly totals table** — same counters summed per week (last 8 weeks)

### 2. Pipeline (`src/tabs/Pipeline.jsx` + `src/pipeline/`)
Track job opportunities end-to-end.
- **Stages:** New/Outreach → Screening → Submitted → Manager Interview → Technical Interview → Offer → Closed
- **Views:** Kanban board (`KanbanBoard.jsx`) or Table (`TableView.jsx`)
- **Quick-add:** `Company / Role / Recruiter` — press Enter
- **Opportunity detail panel** (`OpportunityDetail.jsx`) — edit all fields inline: stage, halal status, source, engagement type, rate, remote, recruiter name/agency/contact, resume version, tech stack tags, next action + due date
- **Interaction log** (`InteractionLog.jsx`) — per-opportunity log of inbound/outbound contacts (channel, direction, note, response)
- **Overdue badge** on nav tab (red circle with count)
- **Overdue/Due-today strips** at top of Pipeline view

### 3. Insights (`src/tabs/Insights.jsx`)
Analytics over your pipeline data — conversion rates and activity metrics.

### 4. Recruiters (`src/tabs/Recruiters.jsx` + `src/recruiters/RecruiterCard.jsx`)
Track staffing recruiters you want to stay in touch with for future roles.
- **Compact list view** — each recruiter is one row: name, agency, Active/Paused status, next follow-up date
- **Expandable detail panel** (click any row) — edit name/agency/notes, set follow-up cadence (default 7 days), log a follow-up (channel + optional note), view contact history
- **Overdue strip** at top of tab for recruiters with follow-ups due/overdue
- **Nav badge** (red circle) for due/overdue follow-up count
- Logging a follow-up auto-advances `nextFollowUpDue` by `cadenceDays`

### 5. Settings (`src/tabs/Settings.jsx`)
Configure the daily task definitions shown on the Today tab (labels, targets, order).

---

## Data Model

All state lives in `src/state/` and is persisted to localStorage (`jscc_v1`).

| Array | File | Description |
|---|---|---|
| `opportunities[]` | `reducer.js` | Job opportunities with stage, halal status, recruiter info, next action |
| `interactions[]` | `reducer.js` | Per-opportunity contact log entries |
| `recruiters[]` | `reducer.js` | Recruiter relationships with follow-up cadence |
| `recruiterContacts[]` | `reducer.js` | Per-recruiter follow-up log entries |
| `dailyHistory[]` | `reducer.js` | Archived daily task snapshots (used for streaks, heatmap, weekly/daily tables) |
| `settings` | `reducer.js` | Task definitions for the Today checklist |
| `today` | `reducer.js` | Live task state for the current day (rolls over at midnight/on focus) |

Key files:
- `src/state/reducer.js` — all state logic and action handlers
- `src/state/store.jsx` — React context + localStorage persistence (debounced 400ms, flush on unload)
- `src/state/defaults.js` — constants: STAGES, SOURCES, CHANNELS, DEFAULT_TASK_DEFS, etc.
- `src/state/migrate.js` — daily rollover logic (archives yesterday, backfills skipped days)
- `src/lib/dates.js` — date utilities: `localDateKey`, `addDays`, `isOverdue`, `isDueToday`, `formatDate`, etc.

---

## Commands

```bash
npm run dev    # start dev server → http://localhost:5173 (or next free port)
npm test       # run Vitest suite (77 tests, ~2s)
npm run build  # production build into dist/
npm run lint   # ESLint
```

---

## Changelog

| Date | What was added |
|---|---|
| 2026-06-11 | Initial implementation: Today, Pipeline, Insights, Settings tabs; reducer, store, defaults, migrate |
| 2026-06-11 | Recruiters tab — track recruiter relationships with weekly follow-up reminders, contact log, nav badge |
| 2026-06-12 | Daily totals table added to Today → History section (shows per-day counter values) |
| 2026-06-18 | Recruiters redesigned from expanded cards to compact list + expandable detail panel |
| 2026-07-17 | Fixed Rules-of-Hooks violations in Today.jsx (WeeklyTable + DailyTable) |
| 2026-07-18 | Landed in-flight work (release plan T1): lint → 0 errors, store split into context/useStore/provider, dead code removed from Insights overdue stat. Release plan (CEO + eng reviewed) committed to docs/designs/ |
| 2026-07-18 | Full release build-out: versioned persistence layer (migrations, quarantine + recovery screen, write-time skew guard, persist-failure banner, cross-tab sync), validated backup import/export, onboarding + demo mode, error boundary, lazy Insights, weekly retro card, MIN_SAMPLE gating, configurable screening field, a11y baseline, PWA, hardened CI + Playwright smoke |
| 2026-07-22 | Kanban outcome columns (🏆 Won / ✖ Didn't work out) added on user request; demo-data vocabulary bug fixed (crashed Pipeline in prod build) + vocabulary-enforcement tests; README/LICENSE/CONTRIBUTING written; deployed to GitHub Pages under HauserY |
