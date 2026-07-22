// Backup export/import (release plan T6).
//
// Two different trust models, deliberately (plan clarification 1):
//   - FILE boundary (here): strict. Unknown top-level keys rejected, newer
//     versions refused, size capped, field types checked.
//   - RUNTIME storage (persistence.js): tolerant. Unknown fields are
//     spread-preserved so version-skewed builds never strip data.
//
//   file ──▶ size cap ──▶ JSON.parse ──▶ shape checks ──▶ version check
//                │             │              │               │
//                ▼             ▼              ▼               ▼
//             too big       not JSON      unknown key      newer build
//             (named err)   (named err)   (named err)      (named err)
//                                                            │ ok
//                                              runMigrations ◀┘
//                                                    ▼
//                                             current-version state

import { runMigrations, CURRENT_SCHEMA_VERSION } from '../state/migrations'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024 // 10 MB

const KNOWN_KEYS = new Set([
  'schemaVersion', 'onboarded', 'demoMode', 'demoSeeded',
  'settings', 'today', 'dailyHistory',
  'opportunities', 'interactions', 'recruiters', 'recruiterContacts',
])

const ARRAY_KEYS = ['dailyHistory', 'opportunities', 'interactions', 'recruiters', 'recruiterContacts']

export function serializeBackup(state) {
  return JSON.stringify(state, null, 2)
}

// While demo mode is active, import always replaces (eng finding 4):
// merging would union fake seeded entities into a real backup.
export function effectiveImportMode(demoMode, selectedMode) {
  return demoMode ? 'replace' : selectedMode
}

export function parseBackup(raw) {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Backup file could not be read.' }
  }
  if (raw.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'Backup exceeds the 10 MB import limit.' }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "That file isn't valid JSON." }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "That file isn't a JSCC backup (expected an object)." }
  }

  const unknown = Object.keys(parsed).filter(k => !KNOWN_KEYS.has(k))
  if (unknown.length > 0) {
    return { ok: false, error: `Unrecognized fields in backup: ${unknown.join(', ')}. Is this a JSCC backup?` }
  }

  const version = parsed.schemaVersion || 1
  if (version > CURRENT_SCHEMA_VERSION) {
    return { ok: false, error: 'This backup is from a newer version of the app. Refresh to update, then import again.' }
  }

  for (const key of ARRAY_KEYS) {
    if (key in parsed && !Array.isArray(parsed[key])) {
      return { ok: false, error: `Backup field "${key}" has the wrong shape.` }
    }
  }
  if ('settings' in parsed && (typeof parsed.settings !== 'object' || parsed.settings === null || !Array.isArray(parsed.settings.taskDefs))) {
    return { ok: false, error: 'Backup field "settings" has the wrong shape.' }
  }
  if ('today' in parsed && (typeof parsed.today !== 'object' || parsed.today === null)) {
    return { ok: false, error: 'Backup field "today" has the wrong shape.' }
  }

  try {
    return { ok: true, state: runMigrations(parsed) }
  } catch {
    return { ok: false, error: 'Backup could not be upgraded to the current format.' }
  }
}
