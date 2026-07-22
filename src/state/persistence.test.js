import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  STORAGE_KEY, HYDRATE_DEBOUNCE_MS,
  loadState, save, subscribeExternal, listQuarantined, _resetForTests,
} from './persistence'
import { CURRENT_SCHEMA_VERSION } from './migrations'
import { makeInitialState } from './reducer'

const fireStorage = (newValue) => {
  const e = new Event('storage')
  Object.assign(e, { key: STORAGE_KEY, newValue })
  window.dispatchEvent(e)
}

beforeEach(() => {
  localStorage.clear()
  _resetForTests()
})

describe('loadState', () => {
  it('returns fresh when no key exists', () => {
    expect(loadState().status).toBe('fresh')
  })

  it('loads and migrates a valid v1 payload', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      settings: { taskDefs: [{ id: 'a', type: 'counter', target: 5 }] },
      today: { dateKey: '2026-07-01', taskState: {} },
      dailyHistory: [{ dateKey: '2026-06-30', taskState: {}, completionPct: 0, corePct: 0 }],
    }))
    const result = loadState()
    expect(result.status).toBe('ok')
    expect(result.state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state.dailyHistory[0].targets).toEqual({ a: 5 })
  })

  it('refuses a newer-schema payload without touching it', () => {
    const raw = JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })
    localStorage.setItem(STORAGE_KEY, raw)
    const result = loadState()
    expect(result.status).toBe('newer')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('quarantines corrupt payloads before returning (raw preserved verbatim)', () => {
    localStorage.setItem(STORAGE_KEY, '{definitely not json')
    const result = loadState()
    expect(result.status).toBe('corrupt')
    expect(result.quarantineKey).toMatch(new RegExp(`^${STORAGE_KEY}_corrupt_`))
    expect(localStorage.getItem(result.quarantineKey)).toBe('{definitely not json')
    expect(listQuarantined()).toContain(result.quarantineKey)
  })
})

describe('save', () => {
  it('writes the serialized state', () => {
    const s = makeInitialState()
    expect(save(s).ok).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('refuses at WRITE time when the stored payload is from a newer schema', () => {
    const s = makeInitialState()
    // Simulate a newer build writing after this context loaded:
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }))
    const result = save(s)
    expect(result).toEqual({ ok: false, reason: 'newer' })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).schemaVersion).toBe(CURRENT_SCHEMA_VERSION + 1)
  })

  it('reports storage errors instead of swallowing them', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    const result = save(makeInitialState())
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('error')
    spy.mockRestore()
  })
})

describe('subscribeExternal', () => {
  afterEach(() => vi.useRealTimers())

  it('debounces a burst of external writes into one hydrate', () => {
    vi.useFakeTimers()
    const cb = vi.fn()
    const unsub = subscribeExternal(cb)
    const payload = JSON.stringify(makeInitialState())
    localStorage.setItem(STORAGE_KEY, payload)
    fireStorage(payload)
    fireStorage(payload)
    fireStorage(payload)
    vi.advanceTimersByTime(HYDRATE_DEBOUNCE_MS + 10)
    expect(cb).toHaveBeenCalledTimes(1)
    unsub()
  })

  it('skips events whose value matches what this context last wrote (storm guard)', () => {
    vi.useFakeTimers()
    const s = makeInitialState()
    save(s)
    const cb = vi.fn()
    const unsub = subscribeExternal(cb)
    fireStorage(localStorage.getItem(STORAGE_KEY))
    vi.advanceTimersByTime(HYDRATE_DEBOUNCE_MS + 10)
    expect(cb).not.toHaveBeenCalled()
    unsub()
  })

  it('ignores other keys and stops after unsubscribe', () => {
    vi.useFakeTimers()
    const cb = vi.fn()
    const unsub = subscribeExternal(cb)
    const e = new Event('storage')
    Object.assign(e, { key: 'other_key', newValue: '{}' })
    window.dispatchEvent(e)
    vi.advanceTimersByTime(HYDRATE_DEBOUNCE_MS + 10)
    expect(cb).not.toHaveBeenCalled()
    unsub()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeInitialState()))
    fireStorage(localStorage.getItem(STORAGE_KEY))
    vi.advanceTimersByTime(HYDRATE_DEBOUNCE_MS + 10)
    expect(cb).not.toHaveBeenCalled()
  })
})
