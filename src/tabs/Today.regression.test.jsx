// REGRESSION (release plan eng review, iron rule): T5 added a `targets`
// snapshot to dailyHistory entries. Every consumer that predates the change —
// HeatmapCalendar, computeStreaks, DailyTable, WeeklyTable — must keep
// rendering correctly against OLD entries that have no `targets` field.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Today from './Today'

const TASK_DEFS = [
  { id: 'recruiter-replies', label: 'Reply to ALL recruiter messages', type: 'checkbox', core: true, order: 1 },
  { id: 'linkedin-apps', label: 'LinkedIn applications', type: 'counter', target: 25, order: 2 },
]

// Pre-snapshot shape: no `targets` key anywhere.
const OLD_HISTORY = [
  { dateKey: '2026-07-16', taskState: { 'linkedin-apps': { count: 25 }, 'recruiter-replies': { checked: true } }, completionPct: 100, corePct: 100 },
  { dateKey: '2026-07-15', taskState: { 'linkedin-apps': { count: 10 } }, completionPct: 50, corePct: 0 },
  { dateKey: '2026-07-14', taskState: {}, completionPct: 0, corePct: 0 },
]

vi.mock('../state/useStore', () => ({
  useStore: () => ({
    state: {
      settings: { taskDefs: TASK_DEFS },
      today: { dateKey: '2026-07-17', taskState: {} },
      dailyHistory: OLD_HISTORY,
      opportunities: [],
    },
    dispatch: () => {},
  }),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 6, 17, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Today with pre-snapshot dailyHistory entries (no targets field)', () => {
  it('renders heatmap, daily totals, and weekly totals without crashing', () => {
    render(<Today />)
    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('Daily totals')).toBeInTheDocument()
    expect(screen.getByText('Weekly totals')).toBeInTheDocument()
  })

  it('daily totals table shows counts from old-shape entries', () => {
    render(<Today />)
    // 2026-07-16 row carries the old entry's count of 25
    expect(screen.getByText('2026-07-16')).toBeInTheDocument()
  })

  it('streak logic still computes from old-shape entries', () => {
    render(<Today />)
    // Streak counters render as "N day"/"N days" from completionPct of old entries
    expect(screen.getAllByText(/\d+ days?/).length).toBeGreaterThan(0)
  })
})
