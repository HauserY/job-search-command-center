# TODOs

## Deferred from the 2026-07-17 CEO review (Discipline-First Release plan)

Plan: `~/.gstack/projects/JobSearchtrackermyself/ceo-plans/2026-07-17-discipline-first-release.md`

- [ ] **Task-pack presets at onboarding** (P2, S — human ~½ day / CC ~30 min)
  2-3 named presets ("Steady pace" / "Full sprint" / "Getting back in") shown at
  first run alongside demo/empty. Deferred so real user feedback names the presets.
  Reuses DEFAULT_TASK_DEFS machinery; no new state shape. Trigger: post-launch feedback.
- [ ] **Forecast stat on Insights** (P2, S-M — human ~1 day / CC ~45 min)
  "At your current response rate…" projection. Sequenced behind the retro card;
  MUST hide below a minimum sample size. Cohort-based conversion math lives here
  (decision T4 kept the retro card to plain counts). Depends on: retro card shipped,
  real usage data for thresholds.
- [ ] **Shareable playbook JSON** (P3, S-M — human ~1 day / CC ~45 min)
  Export/import task-def packs (no personal data) — the Approach-C bridge. Public
  file formats are one-way doors: design WITH real users. Depends on: launch + users.
- [ ] **Auto-backup nudge** (P2, S — human ~2-3 hrs / CC ~20 min)
  lastExportAt-driven dismissible banner. Revisit FAST if early users don't export
  on their own; the persist-failure banner (finding 2B) covers only the catastrophic case.
- [ ] **Shared stats-table primitive** (P3, S — human ~2-3 hrs / CC ~15 min)
  Extract shared table component from DailyTable/WeeklyTable (src/tabs/Today.jsx:134-214)
  once the retro card becomes the third consumer. DRY flag from CEO review Section 5.
  Depends on: retro card landed.
- [ ] **Revision-based cross-context conflict detection** (P3, M — human ~2-3 days / CC ~1-2 hrs)
  From eng review tension 7 (2026-07-18, Codex-raised, review position kept): persisted
  state could carry a monotonic revision; saves against a changed revision would
  detect-and-reconcile instead of last-writer-wins. Deliberately NOT built: the exposed
  window is the sub-second debounce race between the user's own two contexts, already
  mitigated by focus-defer + hydrate-storm guard and documented as a limit. Trigger:
  any real-world report of dual-context data loss. Start at src/state/persistence.js
  (save path). Resolution UX is the hard part — detection alone is not shippable.
- [ ] **Campaigns & Playbooks (Approach C, full)** (P3, L — human ~2-3 wks / CC ~1-2 days)
  Post-launch direction toward the copilot North Star. See design doc + CEO plan.

## Pre-existing lint issues — SCHEDULED into the release (CEO review finding 5A)

The items below are now part of the release's "land in-flight work" step; success
criterion is `npm run lint`: 0 errors. Kept here until that commit lands.

Pre-existing issues found during the 2026-06-09 engineering review
(`/plan-eng-review`). None of these were introduced by that review's fixes —
`npm run lint` went from 14 → 11 problems as a result of that session.
Listed here so they don't get lost; not currently scheduled.

## Worth fixing soon

- [x] **FIXED 2026-07-17** (both WeeklyTable and DailyTable; tests+build green) — `src/tabs/Today.jsx:139` — `WeeklyTable`'s `useMemo` is called
  *after* an early `if (counterDefs.length === 0) return null`, which
  violates React's Rules of Hooks (`react-hooks/rules-of-hooks`). Doesn't
  misfire today because `counterDefs` is stable for a given `taskDefs`, but
  if it ever toggles between empty/non-empty within a session React will
  throw "rendered fewer hooks than expected". Fix: move the `useMemo` above
  the early return (compute on `dailyHistory`/`counterDefs` regardless, and
  only skip rendering — not the hook — when `counterDefs.length === 0`).

## Cosmetic — unused vars/imports (one-line deletions each)

- [ ] `src/lib/dates.js:52` — unused `today`
- [ ] `src/lib/insights.js:2` — unused `daysBetween` import
- [ ] `src/lib/insights.js:108` — unused `today`
- [ ] `src/tabs/Insights.jsx:3` — unused `BarChart`, `Bar` imports
- [ ] `src/tabs/Insights.jsx:52` — unused `today2`
- [ ] `src/tabs/Pipeline.jsx:38` — unused `today`

## Lower priority

- [ ] `src/state/store.jsx:27` — empty `catch {}` block in `save()`
  (`no-empty`); intentional (best-effort localStorage write) but could use a
  comment or `// eslint-disable-next-line no-empty` to document intent.
- [ ] `src/state/store.jsx:66` — `useStore` export trips
  `react-refresh/only-export-components` since `StoreProvider` is also
  exported from the same file. Cosmetic; would need a separate hooks file to
  fully satisfy the rule.
- [ ] `src/tabs/Today.jsx:183` — `react-hooks/exhaustive-deps` warning: wrap
  `taskState` initialization in its own `useMemo`.
