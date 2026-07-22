import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computeRetro } from './retro'

// System time: Friday 2026-07-17 → current week starts Mon 2026-07-13,
// last complete week is Mon 2026-07-06 … Sun 2026-07-12.

const DEFS = [
  { id: 'apps', label: 'Applications', type: 'counter', target: 10, order: 1 },
  { id: 'reply', label: 'Reply to recruiters', type: 'checkbox', core: true, order: 2 },
]

const day = (dateKey, count, target, extra = {}) => ({
  dateKey,
  taskState: { apps: { count } },
  completionPct: count >= target ? 100 : 50,
  corePct: 100,
  targets: { apps: target },
  ...extra,
})

const state = (overrides = {}) => ({
  settings: { taskDefs: DEFS },
  dailyHistory: [],
  interactions: [],
  opportunities: [],
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 17, 12, 0, 0)) // Fri 2026-07-17 local
})
afterEach(() => vi.useRealTimers())

describe('computeRetro', () => {
  it('returns null when no complete prior week exists (first week)', () => {
    expect(computeRetro(state())).toBeNull()
    // Entries in the CURRENT week don't count:
    expect(computeRetro(state({ dailyHistory: [day('2026-07-14', 10, 10)] }))).toBeNull()
  })

  it('picks the most recent complete week and ignores current-week entries', () => {
    const s = state({
      dailyHistory: [
        day('2026-06-30', 10, 10),  // older week
        day('2026-07-08', 7, 10),   // last complete week
        day('2026-07-15', 3, 10),   // current week — excluded
      ],
    })
    const retro = computeRetro(s)
    expect(retro.week).toBe('2026-07-06')
    expect(retro.startDate).toBe('2026-07-08')
    expect(retro.counters[0].total).toBe(7)
  })

  it('sums per-day SNAPSHOTTED targets — a mid-week target change is honored', () => {
    const s = state({
      dailyHistory: [
        day('2026-07-06', 25, 25),
        day('2026-07-07', 25, 25),
        day('2026-07-08', 10, 10), // user lowered the target mid-week
        day('2026-07-09', 10, 10),
        day('2026-07-10', 10, 10),
        day('2026-07-11', 0, 10),
        day('2026-07-12', 0, 10),
      ],
    })
    const retro = computeRetro(s)
    // 25+25+10+10+10+10+10 = 100, NOT current def target × 7
    expect(retro.counters[0].weeklyTarget).toBe(100)
    expect(retro.counters[0].total).toBe(80)
  })

  it('days without entries borrow the last known snapshot (app started mid-week)', () => {
    const s = state({
      dailyHistory: [
        day('2026-07-09', 5, 10),
        day('2026-07-10', 5, 10),
        day('2026-07-11', 5, 10),
        day('2026-07-12', 5, 10),
      ],
    })
    const retro = computeRetro(s)
    expect(retro.daysTracked).toBe(4)
    expect(retro.counters[0].weeklyTarget).toBe(70) // 4 tracked + 3 borrowed, all ×10
  })

  it('marks approximated when entries predate target snapshots', () => {
    const s = state({
      dailyHistory: [
        { dateKey: '2026-07-08', taskState: { apps: { count: 4 } }, completionPct: 40, corePct: 0 },
      ],
    })
    const retro = computeRetro(s)
    expect(retro.counters[0].approximated).toBe(true)
    // Falls back to current def target: 7 days × 10
    expect(retro.counters[0].weeklyTarget).toBe(70)
  })

  it('counts outreach sent and replies received as separate honest counts, bucketed by week', () => {
    const s = state({
      dailyHistory: [day('2026-07-08', 5, 10)],
      interactions: [
        { id: '1', direction: 'outbound', createdAt: '2026-07-07T15:00:00.000Z' },
        { id: '2', direction: 'outbound', createdAt: '2026-07-10T15:00:00.000Z' },
        { id: '3', direction: 'inbound', createdAt: '2026-07-11T15:00:00.000Z' },
        { id: '4', direction: 'outbound', createdAt: '2026-07-15T15:00:00.000Z' }, // current week
        { id: '5', direction: 'inbound', createdAt: '2026-06-20T15:00:00.000Z' }, // older week
      ],
    })
    const retro = computeRetro(s)
    expect(retro.outreachSent).toBe(2)
    expect(retro.repliesReceived).toBe(1)
  })

  it('top source = most new opportunities created that week', () => {
    const s = state({
      dailyHistory: [day('2026-07-08', 5, 10)],
      opportunities: [
        { id: 'a', source: 'LinkedIn', createdAt: '2026-07-07T10:00:00.000Z' },
        { id: 'b', source: 'LinkedIn', createdAt: '2026-07-09T10:00:00.000Z' },
        { id: 'c', source: 'Dice', createdAt: '2026-07-10T10:00:00.000Z' },
        { id: 'd', source: 'Dice', createdAt: '2026-07-16T10:00:00.000Z' }, // current week
      ],
    })
    const retro = computeRetro(s)
    expect(retro.topSource).toEqual({ source: 'LinkedIn', count: 2 })
    expect(retro.newOpportunities).toBe(3)
  })
})
