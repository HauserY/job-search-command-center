import { describe, it, expect } from 'vitest'
import { MIGRATIONS, CURRENT_SCHEMA_VERSION, runMigrations } from './migrations'

const v1State = () => ({
  schemaVersion: 1,
  settings: {
    taskDefs: [
      { id: 'linkedin', type: 'counter', target: 25, order: 1 },
      { id: 'reply-all', type: 'checkbox', order: 2 },
    ],
  },
  today: { dateKey: '2026-07-01', taskState: {} },
  dailyHistory: [
    { dateKey: '2026-06-30', taskState: { linkedin: { count: 10 } }, completionPct: 50, corePct: 100 },
  ],
  opportunities: [],
  interactions: [],
  recruiters: [],
  recruiterContacts: [],
})

describe('migrations registry', () => {
  it('CURRENT_SCHEMA_VERSION derives from the last migration step', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(MIGRATIONS[MIGRATIONS.length - 1].to)
  })

  it('registry steps form an unbroken chain from 1', () => {
    let v = 1
    for (const step of MIGRATIONS) {
      expect(step.from).toBe(v)
      expect(step.to).toBe(v + 1)
      v = step.to
    }
  })

  it('v1→v2 defaults history targets from current counter defs, marked approximated', () => {
    const out = runMigrations(v1State())
    expect(out.dailyHistory[0].targets).toEqual({ linkedin: 25 })
    expect(out.dailyHistory[0].targetsApproximated).toBe(true)
  })

  it('v1→v2 marks pre-existing users as onboarded, not in demo mode', () => {
    const out = runMigrations(v1State())
    expect(out.onboarded).toBe(true)
    expect(out.demoMode).toBe(false)
  })

  it('composite chain lands exactly on CURRENT_SCHEMA_VERSION from v1', () => {
    const out = runMigrations(v1State())
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
  })

  it('is a no-op on already-current state (does not re-approximate)', () => {
    const once = runMigrations(v1State())
    const twice = runMigrations(once)
    expect(twice).toEqual(once)
  })

  it('spread-preserves unknown top-level fields through the chain', () => {
    const out = runMigrations({ ...v1State(), futureFeatureData: { x: 1 } })
    expect(out.futureFeatureData).toEqual({ x: 1 })
  })

  it('v2→v3 adds the screening field defaulting to the halal configuration', () => {
    const out = runMigrations(v1State())
    expect(out.settings.screening.enabled).toBe(true)
    expect(out.settings.screening.label).toBe('Halal status')
    expect(out.settings.screening.statuses.avoid.label).toBe('Avoid')
  })

  it('v2→v3 leaves an existing screening config untouched', () => {
    const custom = { enabled: true, label: 'Visa sponsorship', statuses: { avoid: { label: 'No sponsorship' } } }
    const s = { ...v1State(), settings: { ...v1State().settings, screening: custom } }
    const out = runMigrations(s)
    expect(out.settings.screening).toEqual(custom)
  })

  it('entries that already have targets are left untouched', () => {
    const s = v1State()
    s.dailyHistory[0].targets = { linkedin: 10 }
    const out = runMigrations(s)
    expect(out.dailyHistory[0].targets).toEqual({ linkedin: 10 })
    expect(out.dailyHistory[0].targetsApproximated).toBeUndefined()
  })
})
