// Versioned state migrations (release plan T4, eng finding 3).
//
// MIGRATIONS is the single source of truth for the schema version:
// CURRENT_SCHEMA_VERSION derives from the last entry, so adding a migration
// IS the version bump — one edit, no drift between the reducer's initial
// state, the backup payload, and the write-time skew guard.
//
//   stored state ──▶ runMigrations ──▶ chain of matching steps ──▶ current
//        │                                     │
//        └── schemaVersion > CURRENT ──▶ caller refuses (skew guard)
//        └── a step throws ─────────────▶ caller quarantines (corrupt path)

export const MIGRATIONS = [
  {
    // v1 → v2:
    // - dailyHistory entries gain a `targets` snapshot ({taskId: dailyTarget})
    //   captured at rollover. Pre-existing entries default to the CURRENT
    //   counter targets and are marked approximated (plan tension T3).
    // - onboarding flags: any state that existed before v2 belongs to an
    //   already-active user → onboarded: true, demoMode: false.
    from: 1,
    to: 2,
    migrate(state) {
      const targets = {}
      for (const def of state.settings?.taskDefs || []) {
        if (def.type === 'counter') targets[def.id] = def.target || 1
      }
      return {
        ...state,
        onboarded: state.onboarded ?? true,
        demoMode: state.demoMode ?? false,
        demoSeeded: state.demoSeeded ?? false,
        dailyHistory: (state.dailyHistory || []).map(d =>
          d.targets ? d : { ...d, targets, targetsApproximated: true }
        ),
      }
    },
  },
  {
    // v2 → v3: settings gain the configurable screening field (decision 11B),
    // defaulting to the halal configuration existing users already have.
    from: 2,
    to: 3,
    migrate(state) {
      if (state.settings?.screening) return state
      return {
        ...state,
        settings: {
          ...state.settings,
          screening: {
            enabled: true,
            label: 'Halal status',
            statuses: {
              permissible: { label: 'Permissible', icon: '✅', color: 'text-green-400' },
              'needs-review': { label: 'Needs review', icon: '⚠️', color: 'text-yellow-400' },
              avoid: { label: 'Avoid', icon: '❌', color: 'text-red-400' },
              unknown: { label: 'Unknown', icon: '❓', color: 'text-gray-400' },
            },
          },
        },
      }
    },
  },
]

export const CURRENT_SCHEMA_VERSION =
  MIGRATIONS.length > 0 ? MIGRATIONS[MIGRATIONS.length - 1].to : 1

// Runs every migration step whose `from` matches the state's version, in
// order. Unknown fields are untouched (steps spread `...state`) — the
// spread-preserve rule from the release plan. Throws propagate to the
// caller, which treats the payload as corrupt (quarantine, never overwrite).
export function runMigrations(state) {
  let version = state.schemaVersion || 1
  let out = state
  for (const step of MIGRATIONS) {
    if (step.from === version) {
      out = step.migrate(out)
      version = step.to
    }
  }
  return { ...out, schemaVersion: version }
}
