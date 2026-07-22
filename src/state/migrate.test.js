import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { maybeRollover } from './migrate'

const TASK_DEFS = [
  { id: 'recruiter-replies', type: 'checkbox', core: true },
  { id: 'followups', type: 'followups', core: true },
  { id: 'linkedin-apps', type: 'counter', target: 25 },
]

function baseState(overrides = {}) {
  return {
    settings: { taskDefs: TASK_DEFS },
    opportunities: [],
    dailyHistory: [],
    today: { dateKey: '2026-06-09', taskState: {} },
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 5, 9)) // "today" is 2026-06-09
})

afterEach(() => {
  vi.useRealTimers()
})

describe('maybeRollover', () => {
  it('returns state unchanged when today.dateKey already matches', () => {
    const state = baseState()
    expect(maybeRollover(state)).toBe(state)
  })

  it('snapshots the counter targets in force into the archived entry (T5)', () => {
    const state = baseState({ today: { dateKey: '2026-06-08', taskState: {} } })
    const result = maybeRollover(state)
    const archived = result.dailyHistory.find(d => d.dateKey === '2026-06-08')
    expect(archived.targets).toEqual({ 'linkedin-apps': 25 })
    expect(archived.targetsApproximated).toBeUndefined()
  })

  it('backfilled skipped days also carry the target snapshot', () => {
    const state = baseState({ today: { dateKey: '2026-06-06', taskState: {} } })
    const result = maybeRollover(state)
    const backfilled = result.dailyHistory.find(d => d.dateKey === '2026-06-07')
    expect(backfilled.completionPct).toBe(0)
    expect(backfilled.targets).toEqual({ 'linkedin-apps': 25 })
  })

  it('archives a fully-completed yesterday into dailyHistory and resets today', () => {
    const state = baseState({
      today: {
        dateKey: '2026-06-08',
        taskState: {
          'recruiter-replies': { checked: true },
          followups: {},
          'linkedin-apps': { count: 25 },
        },
      },
    })
    const result = maybeRollover(state)

    expect(result.today).toEqual({ dateKey: '2026-06-09', taskState: {} })
    expect(result.dailyHistory).toHaveLength(1)
    expect(result.dailyHistory[0]).toMatchObject({
      dateKey: '2026-06-08',
      completionPct: 100,
      corePct: 100,
    })
  })

  it('archives a partially-completed yesterday with the correct percentages', () => {
    const state = baseState({
      today: {
        dateKey: '2026-06-08',
        taskState: {
          'recruiter-replies': { checked: true },
          followups: {},
          'linkedin-apps': { count: 0 },
        },
      },
    })
    const result = maybeRollover(state)

    // 2 of 3 tasks hit overall; 1 of 2 core tasks hit (followups counts as hit
    // because there are no overdue opportunities).
    expect(result.dailyHistory[0].completionPct).toBe(67)
    expect(result.dailyHistory[0].corePct).toBe(100)
  })

  it('backfills fully-skipped days as 0% so streaks break correctly', () => {
    // Last opened the app on 2026-06-05; it's now 2026-06-09 — a 3-day gap
    // (06-06, 06-07, 06-08) with zero app usage.
    const state = baseState({
      today: {
        dateKey: '2026-06-05',
        taskState: {
          'recruiter-replies': { checked: true },
          followups: {},
          'linkedin-apps': { count: 25 },
        },
      },
    })
    const result = maybeRollover(state)

    const byDate = Object.fromEntries(result.dailyHistory.map(h => [h.dateKey, h]))
    expect(Object.keys(byDate).sort()).toEqual([
      '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08',
    ])
    expect(byDate['2026-06-05']).toMatchObject({ completionPct: 100, corePct: 100 })
    for (const skipped of ['2026-06-06', '2026-06-07', '2026-06-08']) {
      expect(byDate[skipped]).toMatchObject({ completionPct: 0, corePct: 0, taskState: {} })
    }
    expect(result.today).toEqual({ dateKey: '2026-06-09', taskState: {} })
  })

  it('overwrites an existing dailyHistory entry for the same date instead of duplicating', () => {
    const state = baseState({
      dailyHistory: [
        { dateKey: '2026-06-08', taskState: {}, completionPct: 0, corePct: 0 },
      ],
      today: {
        dateKey: '2026-06-08',
        taskState: {
          'recruiter-replies': { checked: true },
          followups: {},
          'linkedin-apps': { count: 25 },
        },
      },
    })
    const result = maybeRollover(state)

    expect(result.dailyHistory).toHaveLength(1)
    expect(result.dailyHistory[0].completionPct).toBe(100)
  })

  it('does not archive when today.dateKey is missing (first run)', () => {
    const state = baseState({ today: { dateKey: null, taskState: {} } })
    const result = maybeRollover(state)

    // lastDateKey falls back to "yesterday" (2026-06-08), which is < todayKey.
    // taskState is empty, but the followups task auto-hits when there are no
    // overdue opportunities, so completion is 1/3.
    expect(result.dailyHistory).toHaveLength(1)
    expect(result.dailyHistory[0]).toMatchObject({ dateKey: '2026-06-08', completionPct: 33 })
    expect(result.today).toEqual({ dateKey: '2026-06-09', taskState: {} })
  })
})
