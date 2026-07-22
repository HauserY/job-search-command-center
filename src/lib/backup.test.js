import { describe, it, expect } from 'vitest'
import { serializeBackup, parseBackup, effectiveImportMode, MAX_IMPORT_BYTES } from './backup'
import { makeStateFixture } from '../state/fixtures'
import { CURRENT_SCHEMA_VERSION } from '../state/migrations'

describe('backup round-trip', () => {
  it('export → import is lossless for the canonical fixture', () => {
    const fixture = makeStateFixture()
    const result = parseBackup(serializeBackup(fixture))
    expect(result.ok).toBe(true)
    expect(result.state).toEqual(fixture)
  })

  it('demoMode travels in the payload (finding 1A: truthful restore)', () => {
    const demo = { ...makeStateFixture(), demoMode: true, demoSeeded: true }
    const result = parseBackup(serializeBackup(demo))
    expect(result.ok).toBe(true)
    expect(result.state.demoMode).toBe(true)
  })

  it('migrates a v1 backup on import (targets approximated, flags defaulted)', () => {
    const v1 = makeStateFixture()
    delete v1.onboarded; delete v1.demoMode; delete v1.demoSeeded
    v1.schemaVersion = 1
    v1.dailyHistory = v1.dailyHistory.map(d => {
      const rest = { ...d }
      delete rest.targets
      delete rest.targetsApproximated
      return rest
    })
    const result = parseBackup(serializeBackup(v1))
    expect(result.ok).toBe(true)
    expect(result.state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(result.state.onboarded).toBe(true)
    expect(result.state.dailyHistory[0].targets).toEqual({ 'linkedin-apps': 25 })
    expect(result.state.dailyHistory[0].targetsApproximated).toBe(true)
  })
})

describe('backup validation', () => {
  it('rejects files over the 10 MB cap with a named error', () => {
    const huge = '"' + 'x'.repeat(MAX_IMPORT_BYTES) + '"'
    const result = parseBackup(huge)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/10 MB/)
  })

  it('rejects invalid JSON loudly', () => {
    expect(parseBackup('{nope').ok).toBe(false)
  })

  it('rejects non-object JSON', () => {
    expect(parseBackup('42').ok).toBe(false)
    expect(parseBackup('[1,2]').ok).toBe(false)
  })

  it('rejects unknown top-level keys and names them', () => {
    const bad = { ...makeStateFixture(), evilField: 1 }
    const result = parseBackup(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/evilField/)
  })

  it('refuses backups from a newer schema version', () => {
    const newer = { ...makeStateFixture(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 }
    const result = parseBackup(JSON.stringify(newer))
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/newer version/)
  })

  it('rejects wrong-shaped fields', () => {
    const bad = { ...makeStateFixture(), opportunities: 'not-an-array' }
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false)
    const badSettings = { ...makeStateFixture(), settings: { taskDefs: 'nope' } }
    expect(parseBackup(JSON.stringify(badSettings)).ok).toBe(false)
  })
})

describe('effectiveImportMode (demo gate, eng finding 4)', () => {
  it('forces replace while in demo mode', () => {
    expect(effectiveImportMode(true, 'merge')).toBe('replace')
    expect(effectiveImportMode(true, 'replace')).toBe('replace')
  })
  it('respects the selected mode outside demo mode', () => {
    expect(effectiveImportMode(false, 'merge')).toBe('merge')
    expect(effectiveImportMode(false, 'replace')).toBe('replace')
  })
})
