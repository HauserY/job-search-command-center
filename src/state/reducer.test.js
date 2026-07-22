import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { reducer, makeInitialState } from './reducer'
import { STAGES } from './defaults'

describe('reducer — Today actions', () => {
  it('TODAY_SET_COUNT sets a counter, clamped to a minimum of 0', () => {
    const state = makeInitialState()
    const result = reducer(state, { type: 'TODAY_SET_COUNT', taskId: 'linkedin-apps', count: 5 })
    expect(result.today.taskState['linkedin-apps']).toEqual({ count: 5 })

    const clamped = reducer(state, { type: 'TODAY_SET_COUNT', taskId: 'linkedin-apps', count: -3 })
    expect(clamped.today.taskState['linkedin-apps']).toEqual({ count: 0 })
  })

  it('TODAY_TOGGLE_CHECK flips a checkbox task', () => {
    const state = makeInitialState()
    const checked = reducer(state, { type: 'TODAY_TOGGLE_CHECK', taskId: 'recruiter-replies' })
    expect(checked.today.taskState['recruiter-replies'].checked).toBe(true)

    const unchecked = reducer(checked, { type: 'TODAY_TOGGLE_CHECK', taskId: 'recruiter-replies' })
    expect(unchecked.today.taskState['recruiter-replies'].checked).toBe(false)
  })

  it('TODAY_RESET clears taskState but keeps today\'s date', () => {
    const state = makeInitialState()
    const withCount = reducer(state, { type: 'TODAY_SET_COUNT', taskId: 'linkedin-apps', count: 5 })
    const reset = reducer(withCount, { type: 'TODAY_RESET' })
    expect(reset.today.taskState).toEqual({})
    expect(reset.today.dateKey).toBe(state.today.dateKey)
  })
})

describe('reducer — opportunities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-09T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('OPP_ADD creates an opportunity with stage "new" and a stageHistory entry', () => {
    const state = makeInitialState()
    const result = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    const opp = result.opportunities[0]

    expect(opp.company).toBe('Acme')
    expect(opp.stage).toBe('new')
    expect(opp.maxStageIndex).toBe(0)
    expect(opp.stageHistory).toEqual({ new: '2026-06-09T12:00:00.000Z' })
  })

  it('OPP_UPDATE on a stage change updates stageEnteredAt, maxStageIndex, and records stageHistory', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    const oppId = created.opportunities[0].id

    vi.setSystemTime(new Date('2026-06-15T09:00:00.000Z'))
    const advanced = reducer(created, {
      type: 'OPP_UPDATE',
      id: oppId,
      changes: { stage: 'manager-interview' },
    })
    const opp = advanced.opportunities[0]

    expect(opp.stage).toBe('manager-interview')
    expect(opp.stageEnteredAt).toBe('2026-06-15T09:00:00.000Z')
    expect(opp.maxStageIndex).toBe(STAGES.indexOf('manager-interview'))
    expect(opp.stageHistory).toEqual({
      new: '2026-06-09T12:00:00.000Z',
      'manager-interview': '2026-06-15T09:00:00.000Z',
    })
  })

  it('OPP_UPDATE does not overwrite an existing stageHistory entry if the opportunity returns to a stage', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    const oppId = created.opportunities[0].id

    vi.setSystemTime(new Date('2026-06-15T09:00:00.000Z'))
    const advanced = reducer(created, { type: 'OPP_UPDATE', id: oppId, changes: { stage: 'screening' } })

    vi.setSystemTime(new Date('2026-06-20T09:00:00.000Z'))
    const back = reducer(advanced, { type: 'OPP_UPDATE', id: oppId, changes: { stage: 'new' } })

    // "new" was first reached on creation (06-09); going back to it later
    // must not overwrite that original first-reached timestamp.
    expect(back.opportunities[0].stageHistory.new).toBe('2026-06-09T12:00:00.000Z')
  })

  it('OPP_UPDATE leaves other opportunities and non-stage fields untouched', () => {
    const state = makeInitialState()
    let s = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    s = reducer(s, { type: 'OPP_ADD', opp: { company: 'Globex' } })
    const acmeId = s.opportunities.find(o => o.company === 'Acme').id

    const result = reducer(s, { type: 'OPP_UPDATE', id: acmeId, changes: { rate: '$100/hr' } })
    expect(result.opportunities.find(o => o.company === 'Acme').rate).toBe('$100/hr')
    expect(result.opportunities.find(o => o.company === 'Globex').rate).toBeUndefined()
  })

  it('OPP_DELETE removes the opportunity and its interactions', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    const oppId = created.opportunities[0].id
    const withInteraction = reducer(created, {
      type: 'INTERACTION_ADD',
      interaction: { opportunityId: oppId, channel: 'Email', direction: 'outbound' },
    })

    const result = reducer(withInteraction, { type: 'OPP_DELETE', id: oppId })
    expect(result.opportunities).toHaveLength(0)
    expect(result.interactions).toHaveLength(0)
  })
})

describe('reducer — interactions', () => {
  it('flips earlier pending outbound interactions to "yes" when an inbound interaction arrives', () => {
    const state = makeInitialState()
    const oppId = 'opp-1'
    const withOutbound = reducer(state, {
      type: 'INTERACTION_ADD',
      interaction: { opportunityId: oppId, channel: 'Email', direction: 'outbound' },
    })
    expect(withOutbound.interactions[0].response).toBe('pending')

    const withInbound = reducer(withOutbound, {
      type: 'INTERACTION_ADD',
      interaction: { opportunityId: oppId, channel: 'Email', direction: 'inbound', response: 'yes' },
    })

    const outbound = withInbound.interactions.find(i => i.direction === 'outbound')
    expect(outbound.response).toBe('yes')
  })

  it('does not flip pending interactions belonging to a different opportunity', () => {
    const state = makeInitialState()
    const withOutbound = reducer(state, {
      type: 'INTERACTION_ADD',
      interaction: { opportunityId: 'opp-1', channel: 'Email', direction: 'outbound' },
    })
    const withInbound = reducer(withOutbound, {
      type: 'INTERACTION_ADD',
      interaction: { opportunityId: 'opp-2', channel: 'Email', direction: 'inbound', response: 'yes' },
    })
    const outbound = withInbound.interactions.find(i => i.direction === 'outbound')
    expect(outbound.response).toBe('pending')
  })
})

describe('reducer — recruiters', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-09T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('RECRUITER_ADD sets defaults: active status, 7-day cadence, and next follow-up 7 days out', () => {
    const state = makeInitialState()
    const result = reducer(state, { type: 'RECRUITER_ADD', recruiter: { name: 'Christine Lee', agency: 'Acme Staffing' } })
    const recruiter = result.recruiters[0]

    expect(recruiter.name).toBe('Christine Lee')
    expect(recruiter.agency).toBe('Acme Staffing')
    expect(recruiter.status).toBe('active')
    expect(recruiter.cadenceDays).toBe(7)
    expect(recruiter.nextFollowUpDue).toBe('2026-06-16')
  })

  it('RECRUITER_UPDATE merges changes', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'RECRUITER_ADD', recruiter: { name: 'Christine Lee' } })
    const id = created.recruiters[0].id

    const updated = reducer(created, { type: 'RECRUITER_UPDATE', id, changes: { status: 'paused', notes: 'Gone quiet' } })
    expect(updated.recruiters[0].status).toBe('paused')
    expect(updated.recruiters[0].notes).toBe('Gone quiet')
  })

  it('RECRUITER_CONTACT_ADD logs a contact and recomputes lastContactAt/nextFollowUpDue from cadenceDays', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'RECRUITER_ADD', recruiter: { name: 'Christine Lee', cadenceDays: 14 } })
    const id = created.recruiters[0].id

    vi.setSystemTime(new Date('2026-06-12T12:00:00.000Z'))
    const result = reducer(created, {
      type: 'RECRUITER_CONTACT_ADD',
      contact: { recruiterId: id, channel: 'LinkedIn DM', note: 'Checking in' },
    })

    expect(result.recruiterContacts).toHaveLength(1)
    expect(result.recruiterContacts[0].channel).toBe('LinkedIn DM')

    const recruiter = result.recruiters[0]
    expect(recruiter.lastContactAt).toBe('2026-06-12T12:00:00.000Z')
    expect(recruiter.nextFollowUpDue).toBe('2026-06-26')
  })

  it('RECRUITER_DELETE removes the recruiter and its contacts', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'RECRUITER_ADD', recruiter: { name: 'Christine Lee' } })
    const id = created.recruiters[0].id
    const withContact = reducer(created, {
      type: 'RECRUITER_CONTACT_ADD',
      contact: { recruiterId: id, channel: 'Email', note: '' },
    })

    const result = reducer(withContact, { type: 'RECRUITER_DELETE', id })
    expect(result.recruiters).toHaveLength(0)
    expect(result.recruiterContacts).toHaveLength(0)
  })

  it('RECRUITER_CONTACT_DELETE removes a single contact entry', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'RECRUITER_ADD', recruiter: { name: 'Christine Lee' } })
    const id = created.recruiters[0].id
    const withContact = reducer(created, {
      type: 'RECRUITER_CONTACT_ADD',
      contact: { recruiterId: id, channel: 'Email', note: '' },
    })
    const contactId = withContact.recruiterContacts[0].id

    const result = reducer(withContact, { type: 'RECRUITER_CONTACT_DELETE', id: contactId })
    expect(result.recruiterContacts).toHaveLength(0)
  })
})

describe('reducer — import/merge and danger zone', () => {
  it('IMPORT_MERGE unions opportunities by id without duplicating', () => {
    const state = makeInitialState()
    const created = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    const existingId = created.opportunities[0].id

    const merged = reducer(created, {
      type: 'IMPORT_MERGE',
      data: {
        opportunities: [
          { id: existingId, company: 'Acme Updated', stage: 'new' },
          { id: 'new-id', company: 'Globex', stage: 'new' },
        ],
      },
    })

    expect(merged.opportunities).toHaveLength(2)
    expect(merged.opportunities.find(o => o.id === existingId).company).toBe('Acme Updated')
  })

  it('IMPORT_MERGE merges dailyHistory by dateKey, preserving distinct days (regression)', () => {
    // Bug: mergeById keyed dailyHistory on a nonexistent `.id`, collapsing
    // the whole history to a single entry. Entries key on dateKey.
    const state = {
      ...makeInitialState(),
      dailyHistory: [
        { dateKey: '2026-06-01', taskState: {}, completionPct: 100, corePct: 100 },
        { dateKey: '2026-06-02', taskState: {}, completionPct: 50, corePct: 0 },
      ],
    }
    const merged = reducer(state, {
      type: 'IMPORT_MERGE',
      data: {
        dailyHistory: [
          { dateKey: '2026-06-02', taskState: {}, completionPct: 75, corePct: 100 },
          { dateKey: '2026-06-03', taskState: {}, completionPct: 25, corePct: 0 },
        ],
      },
    })
    expect(merged.dailyHistory.map(d => d.dateKey).sort()).toEqual(['2026-06-01', '2026-06-02', '2026-06-03'])
    expect(merged.dailyHistory.find(d => d.dateKey === '2026-06-02').completionPct).toBe(75)
  })

  it('CLEAR_ALL resets to a fresh initial state', () => {
    const state = makeInitialState()
    const populated = reducer(state, { type: 'OPP_ADD', opp: { company: 'Acme' } })
    const cleared = reducer(populated, { type: 'CLEAR_ALL' })

    expect(cleared.opportunities).toEqual([])
    expect(cleared.dailyHistory).toEqual([])
    expect(cleared.today.taskState).toEqual({})
  })
})

describe('reducer — HYDRATE (cross-context sync)', () => {
  it('replaces the whole state with the hydrated payload', () => {
    const local = reducer(makeInitialState(), { type: 'OPP_ADD', opp: { company: 'Local Co' } })
    const external = reducer(makeInitialState(), { type: 'OPP_ADD', opp: { company: 'Other Tab Co' } })

    const result = reducer(local, { type: 'HYDRATE', state: external })
    expect(result).toBe(external)
    expect(result.opportunities.map(o => o.company)).toEqual(['Other Tab Co'])
  })
})
