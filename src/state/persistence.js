// Persistence layer (release plan T0, eng finding 1).
//
// ALL localStorage access flows through this module. Pure JS, no React —
// every data-safety rule here is unit-testable without a component mount.
//
//   loadState() ─▶ no key            → { status:'fresh',   state }
//              ├─▶ ok                → { status:'ok',      state }  (migrated)
//              ├─▶ newer schema      → { status:'newer',   state:null, raw }
//              └─▶ corrupt / throw   → { status:'corrupt', state:null, raw,
//                                        quarantineKey }   (raw copied FIRST)
//   save(state) ─▶ re-reads stored version AT WRITE TIME (skew guard):
//              ├─▶ stored newer      → { ok:false, reason:'newer' }
//              ├─▶ storage error     → { ok:false, reason:'error', error }
//              └─▶ written           → { ok:true }
//   subscribeExternal(cb) ─▶ storage events from OTHER contexts only,
//              skip-identical + trailing debounce (eng finding 6).

import { runMigrations, CURRENT_SCHEMA_VERSION } from './migrations'

export const STORAGE_KEY = 'jscc_v1'
export const HYDRATE_DEBOUNCE_MS = 300

// Last serialized value this context read or wrote. Used by the storm guard
// (skip echo events) — NOT a concurrency token (see plan tension 7).
let lastSerialized = null

export function loadState() {
  let raw
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unreadable (privacy mode / disabled): run in-memory.
    return { status: 'fresh', state: null }
  }
  if (raw === null) return { status: 'fresh', state: null }

  try {
    const parsed = JSON.parse(raw)
    const version = parsed.schemaVersion || 1
    if (version > CURRENT_SCHEMA_VERSION) {
      // A newer build wrote this state. Never migrate down, never write.
      return { status: 'newer', state: null, raw }
    }
    const state = runMigrations(parsed)
    lastSerialized = raw
    return { status: 'ok', state }
  } catch {
    // Corrupt JSON or a throwing migration: quarantine the raw payload
    // BEFORE anything can write over it, then hand control to the recovery
    // screen. Silent reset is the one forbidden outcome (finding 2A).
    const quarantineKey = quarantine(raw)
    return { status: 'corrupt', state: null, raw, quarantineKey }
  }
}

function quarantine(raw) {
  const key = `${STORAGE_KEY}_corrupt_${new Date().toISOString().replace(/[:.]/g, '-')}`
  try {
    localStorage.setItem(key, raw)
    return key
  } catch {
    return null // storage full — recovery screen still offers the in-memory raw
  }
}

export function listQuarantined() {
  const keys = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(`${STORAGE_KEY}_corrupt_`)) keys.push(k)
    }
  } catch { /* unreadable storage — nothing to list */ }
  return keys.sort()
}

export function save(state) {
  let serialized
  try {
    serialized = JSON.stringify(state)
  } catch (error) {
    return { ok: false, reason: 'error', error }
  }
  try {
    // Write-time skew guard (checked here, not at load — a stale tab loaded
    // before the newer tab wrote would pass a load-time check and clobber).
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null && stored !== serialized) {
      try {
        const storedVersion = JSON.parse(stored).schemaVersion || 1
        if (storedVersion > CURRENT_SCHEMA_VERSION) {
          return { ok: false, reason: 'newer' }
        }
      } catch { /* stored is corrupt — our write replaces it; load already quarantined */ }
    }
    localStorage.setItem(STORAGE_KEY, serialized)
    lastSerialized = serialized
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'error', error }
  }
}

// Subscribe to writes from OTHER contexts (tab / installed PWA). The browser
// only fires `storage` in documents that did NOT write, so no self-echo —
// but we still skip values identical to what we last read/wrote, and
// debounce trailing so a burst of debounced saves over there becomes ONE
// hydrate over here. Returns an unsubscribe function.
export function subscribeExternal(onExternalState) {
  let timer = null
  const handler = (e) => {
    if (e.key !== STORAGE_KEY) return
    if (e.newValue === null || e.newValue === lastSerialized) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const result = loadState()
      if (result.status === 'ok') onExternalState(result.state)
      // 'newer' / 'corrupt' from another context: do nothing here — the next
      // save() refuses on newer, and corrupt is already quarantined by load.
    }, HYDRATE_DEBOUNCE_MS)
  }
  window.addEventListener('storage', handler)
  return () => {
    if (timer) clearTimeout(timer)
    window.removeEventListener('storage', handler)
  }
}

// Test hook: reset module state between tests.
export function _resetForTests() {
  lastSerialized = null
}
