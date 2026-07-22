import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  localDateKey,
  addDays,
  weekKey,
  daysBetween,
  formatDate,
  formatDateTime,
  isOverdue,
  isDueToday,
  getLast26Weeks,
  getDaysInRange,
} from './dates'

describe('localDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('pads single-digit months and days', () => {
    expect(localDateKey(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
})

describe('addDays', () => {
  it('adds days within the same month', () => {
    expect(addDays('2026-06-09', 1)).toBe('2026-06-10')
  })

  it('subtracts days', () => {
    expect(addDays('2026-06-09', -1)).toBe('2026-06-08')
  })

  it('rolls over a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('rolls over a year boundary', () => {
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('handles multi-day spans across a month boundary', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02')
  })
})

describe('weekKey', () => {
  it('returns the Monday for a mid-week date', () => {
    // 2026-06-09 is a Tuesday
    expect(weekKey('2026-06-09')).toBe('2026-06-08')
  })

  it('returns the same date for a Monday', () => {
    expect(weekKey('2026-06-08')).toBe('2026-06-08')
  })

  it('rolls a Sunday back to the preceding Monday', () => {
    expect(weekKey('2026-06-14')).toBe('2026-06-08')
  })
})

describe('daysBetween', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetween('2026-06-09', '2026-06-09')).toBe(0)
  })

  it('returns a positive count for a later date', () => {
    expect(daysBetween('2026-06-09', '2026-06-12')).toBe(3)
  })

  it('returns a negative count for an earlier date', () => {
    expect(daysBetween('2026-06-12', '2026-06-09')).toBe(-3)
  })
})

describe('formatDate', () => {
  it('returns an empty string for falsy input', () => {
    expect(formatDate('')).toBe('')
    expect(formatDate(null)).toBe('')
  })

  it('formats a date key as a readable date', () => {
    expect(formatDate('2026-06-09')).toBe('Jun 9, 2026')
  })
})

describe('formatDateTime', () => {
  it('returns an empty string for falsy input', () => {
    expect(formatDateTime('')).toBe('')
    expect(formatDateTime(null)).toBe('')
  })

  it('formats an ISO timestamp with date and time', () => {
    const result = formatDateTime('2026-06-09T14:30:00')
    expect(result).toContain('Jun 9')
    expect(result).toContain('2:30')
  })
})

describe('isOverdue / isDueToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 9)) // 2026-06-09
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('isOverdue is false for falsy input', () => {
    expect(isOverdue('')).toBe(false)
    expect(isOverdue(null)).toBe(false)
  })

  it('isOverdue is true for a date before today', () => {
    expect(isOverdue('2026-06-08')).toBe(true)
  })

  it('isOverdue is false for today or a future date', () => {
    expect(isOverdue('2026-06-09')).toBe(false)
    expect(isOverdue('2026-06-10')).toBe(false)
  })

  it('isDueToday is false for falsy input', () => {
    expect(isDueToday('')).toBe(false)
    expect(isDueToday(null)).toBe(false)
  })

  it('isDueToday is true only for today', () => {
    expect(isDueToday('2026-06-09')).toBe(true)
    expect(isDueToday('2026-06-08')).toBe(false)
    expect(isDueToday('2026-06-10')).toBe(false)
  })
})

describe('getLast26Weeks', () => {
  it('returns 26 unique, ascending Monday-keyed weeks', () => {
    const weeks = getLast26Weeks()
    expect(weeks.length).toBe(26)
    expect(new Set(weeks).size).toBe(26)
    const sorted = [...weeks].sort()
    expect(weeks).toEqual(sorted)
    for (const wk of weeks) {
      // Every entry should itself be a Monday (weekKey is idempotent on Mondays)
      expect(weekKey(wk)).toBe(wk)
    }
  })
})

describe('getDaysInRange', () => {
  it('returns a single day when start equals end', () => {
    expect(getDaysInRange('2026-06-09', '2026-06-09')).toEqual(['2026-06-09'])
  })

  it('returns an inclusive range of consecutive days', () => {
    expect(getDaysInRange('2026-06-08', '2026-06-11')).toEqual([
      '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11',
    ])
  })

  it('returns an empty array when start is after end', () => {
    expect(getDaysInRange('2026-06-11', '2026-06-09')).toEqual([])
  })

  it('handles a range crossing a month boundary', () => {
    expect(getDaysInRange('2026-01-30', '2026-02-01')).toEqual([
      '2026-01-30', '2026-01-31', '2026-02-01',
    ])
  })
})
