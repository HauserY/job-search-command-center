import { DEFAULT_TASK_DEFS, DEFAULT_SCREENING, STAGES, DEFAULT_RECRUITER_CADENCE_DAYS } from './defaults'
import { maybeRollover } from './migrate'
import { CURRENT_SCHEMA_VERSION } from './migrations'
import { localDateKey, addDays } from '../lib/dates'

export function makeInitialState() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    onboarded: false,
    demoMode: false,
    demoSeeded: false,
    settings: { taskDefs: DEFAULT_TASK_DEFS, screening: DEFAULT_SCREENING },
    today: { dateKey: localDateKey(), taskState: {} },
    dailyHistory: [],
    opportunities: [],
    interactions: [],
    recruiters: [],
    recruiterContacts: [],
  }
}

export function reducer(state, action) {
  switch (action.type) {
    // ── Onboarding / demo lifecycle ──────────────────────────────────────────
    case 'ONBOARD_DEMO': {
      // Idempotent at the reducer level (codex bundle item 4): double-dispatch
      // from double-click, keyboard repeat, or a slow device seeds once.
      if (state.demoSeeded) return state
      return action.demoState
    }
    case 'ONBOARD_EMPTY': {
      return { ...state, onboarded: true, demoMode: false }
    }
    case 'DEMO_KEEP': {
      // "Keep this data": user turned demo data into real data — banner goes
      // away, everything stays (T6 clarification 2, second demo exit).
      return { ...state, demoMode: false }
    }
    case 'DEMO_CLEAR': {
      // Confirmed via dialog (finding 4A). Wipes to empty REAL state.
      return { ...makeInitialState(), onboarded: true }
    }

    // ── Persistence / sync ───────────────────────────────────────────────────
    case 'HYDRATE': {
      // Full-state replace from another context's write (release plan eng
      // finding 2). The payload already went through loadState() → migrations,
      // so it is a valid current-version state. Selection state lives in
      // component useState and must null-check its entity after this.
      return action.state
    }

    // ── Today ───────────────────────────────────────────────────────────────
    case 'TODAY_SET_COUNT': {
      const { taskId, count } = action
      return {
        ...state,
        today: {
          ...state.today,
          taskState: {
            ...state.today.taskState,
            [taskId]: { ...state.today.taskState[taskId], count: Math.max(0, count) },
          },
        },
      }
    }
    case 'TODAY_TOGGLE_CHECK': {
      const { taskId } = action
      const prev = state.today.taskState[taskId]?.checked || false
      return {
        ...state,
        today: {
          ...state.today,
          taskState: {
            ...state.today.taskState,
            [taskId]: { ...state.today.taskState[taskId], checked: !prev },
          },
        },
      }
    }
    case 'TODAY_RESET': {
      return { ...state, today: { dateKey: localDateKey(), taskState: {} } }
    }
    case 'ROLLOVER': {
      return maybeRollover(state)
    }

    // ── Opportunities ────────────────────────────────────────────────────────
    case 'OPP_ADD': {
      const now = new Date().toISOString()
      const opp = {
        id: crypto.randomUUID(),
        createdAt: now,
        stage: 'new',
        stageEnteredAt: now,
        stageHistory: { new: now },
        maxStageIndex: 0,
        halalStatus: 'unknown',
        techTags: [],
        ...action.opp,
      }
      return { ...state, opportunities: [opp, ...state.opportunities] }
    }
    case 'OPP_UPDATE': {
      const { id, changes } = action
      return {
        ...state,
        opportunities: state.opportunities.map(o => {
          if (o.id !== id) return o
          const updated = { ...o, ...changes }
          if (changes.stage && changes.stage !== o.stage) {
            const newIdx = STAGES.indexOf(changes.stage)
            const now = new Date().toISOString()
            updated.stageEnteredAt = now
            updated.maxStageIndex = Math.max(o.maxStageIndex || 0, newIdx)
            if (!o.stageHistory?.[changes.stage]) {
              updated.stageHistory = { ...(o.stageHistory || {}), [changes.stage]: now }
            }
          }
          return updated
        }),
      }
    }
    case 'OPP_DELETE': {
      return {
        ...state,
        opportunities: state.opportunities.filter(o => o.id !== action.id),
        interactions: state.interactions.filter(i => i.opportunityId !== action.id),
      }
    }

    // ── Interactions ─────────────────────────────────────────────────────────
    case 'INTERACTION_ADD': {
      const interaction = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        response: 'pending',
        ...action.interaction,
      }
      let interactions = [interaction, ...state.interactions]

      // Auto-flip pending → yes for earlier outbound entries on same opportunity
      if (interaction.direction === 'inbound') {
        interactions = interactions.map(i => {
          if (
            i.id !== interaction.id &&
            i.opportunityId === interaction.opportunityId &&
            i.direction === 'outbound' &&
            i.response === 'pending'
          ) {
            return { ...i, response: 'yes' }
          }
          return i
        })
      }

      return { ...state, interactions }
    }
    case 'INTERACTION_UPDATE': {
      return {
        ...state,
        interactions: state.interactions.map(i =>
          i.id === action.id ? { ...i, ...action.changes } : i
        ),
      }
    }
    case 'INTERACTION_DELETE': {
      return {
        ...state,
        interactions: state.interactions.filter(i => i.id !== action.id),
      }
    }

    // ── Recruiters ───────────────────────────────────────────────────────────
    case 'RECRUITER_ADD': {
      const now = new Date().toISOString()
      const cadenceDays = action.recruiter?.cadenceDays || DEFAULT_RECRUITER_CADENCE_DAYS
      const recruiter = {
        id: crypto.randomUUID(),
        createdAt: now,
        status: 'active',
        notes: '',
        cadenceDays,
        lastContactAt: now,
        nextFollowUpDue: addDays(localDateKey(), cadenceDays),
        ...action.recruiter,
      }
      return { ...state, recruiters: [recruiter, ...state.recruiters] }
    }
    case 'RECRUITER_UPDATE': {
      const { id, changes } = action
      return {
        ...state,
        recruiters: state.recruiters.map(r => (r.id === id ? { ...r, ...changes } : r)),
      }
    }
    case 'RECRUITER_DELETE': {
      return {
        ...state,
        recruiters: state.recruiters.filter(r => r.id !== action.id),
        recruiterContacts: state.recruiterContacts.filter(c => c.recruiterId !== action.id),
      }
    }
    case 'RECRUITER_CONTACT_ADD': {
      const now = new Date().toISOString()
      const contact = {
        id: crypto.randomUUID(),
        createdAt: now,
        ...action.contact,
      }
      return {
        ...state,
        recruiterContacts: [contact, ...state.recruiterContacts],
        recruiters: state.recruiters.map(r => {
          if (r.id !== contact.recruiterId) return r
          return {
            ...r,
            lastContactAt: now,
            nextFollowUpDue: addDays(localDateKey(), r.cadenceDays || DEFAULT_RECRUITER_CADENCE_DAYS),
          }
        }),
      }
    }
    case 'RECRUITER_CONTACT_DELETE': {
      return {
        ...state,
        recruiterContacts: state.recruiterContacts.filter(c => c.id !== action.id),
      }
    }

    // ── Settings ─────────────────────────────────────────────────────────────
    case 'SETTINGS_UPDATE': {
      return { ...state, settings: { ...state.settings, ...action.settings } }
    }

    // ── Import ────────────────────────────────────────────────────────────────
    case 'IMPORT_REPLACE': {
      return maybeRollover({ ...makeInitialState(), ...action.data })
    }
    case 'IMPORT_MERGE': {
      const data = action.data
      const mergeBy = (keyField) => (existing, incoming) => {
        const map = new Map(existing.map(e => [e[keyField], e]))
        for (const item of (incoming || [])) map.set(item[keyField], item)
        return [...map.values()]
      }
      const mergeById = mergeBy('id')
      // dailyHistory entries have no id — they key on dateKey. Merging by a
      // missing field collapses the whole history into one entry.
      const mergeByDate = mergeBy('dateKey')
      return maybeRollover({
        ...state,
        settings: data.settings || state.settings,
        opportunities: mergeById(state.opportunities, data.opportunities),
        interactions: mergeById(state.interactions, data.interactions),
        dailyHistory: mergeByDate(state.dailyHistory, data.dailyHistory),
        recruiters: mergeById(state.recruiters, data.recruiters),
        recruiterContacts: mergeById(state.recruiterContacts, data.recruiterContacts),
      })
    }

    // ── Danger zone ───────────────────────────────────────────────────────────
    case 'CLEAR_ALL': {
      return makeInitialState()
    }

    default:
      return state
  }
}
