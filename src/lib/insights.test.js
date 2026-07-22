import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  sourceFunnel,
  effortVsYield,
  channelResponseRates,
  recruiterResponsePrefFromOpps,
  pipelineHealth,
  weeklyTrends,
} from './insights'
import { STAGES } from '../state/defaults'

const STAGE_IDX = Object.fromEntries(STAGES.map((s, i) => [s, i]))

describe('sourceFunnel', () => {
  it('groups opportunities by source and counts furthest stage reached', () => {
    const opportunities = [
      { source: 'Dice', maxStageIndex: STAGE_IDX['offer'] },
      { source: 'Dice', maxStageIndex: STAGE_IDX['screening'] },
      { source: 'Referral', maxStageIndex: STAGE_IDX['new'] },
    ]
    const rows = sourceFunnel(opportunities)
    const dice = rows.find(r => r.source === 'Dice')
    const referral = rows.find(r => r.source === 'Referral')

    expect(dice.created).toBe(2)
    expect(dice.screening).toBe(2)
    expect(dice.submitted).toBe(1)
    expect(dice.interview).toBe(1)
    expect(dice.offer).toBe(1)
    expect(dice.overallRate).toBe(50) // 1 of 2 reached offer

    expect(referral.created).toBe(1)
    expect(referral.screening).toBe(0)
    expect(referral.overallRate).toBe(0)
  })

  it('falls back to current stage when maxStageIndex is missing, and "Other" when source is missing', () => {
    const opportunities = [{ stage: 'submitted' }]
    const rows = sourceFunnel(opportunities)
    expect(rows[0].source).toBe('Other')
    expect(rows[0].submitted).toBe(1)
    expect(rows[0].interview).toBe(0)
  })

  it('sorts by overall conversion rate, then by volume', () => {
    const opportunities = [
      { source: 'A', maxStageIndex: STAGE_IDX['new'] },
      { source: 'A', maxStageIndex: STAGE_IDX['new'] },
      { source: 'B', maxStageIndex: STAGE_IDX['offer'] },
    ]
    const rows = sourceFunnel(opportunities)
    expect(rows[0].source).toBe('B') // 100% conversion beats A's 0%
  })
})

describe('effortVsYield', () => {
  const taskDefs = [
    { id: 'linkedin-apps', type: 'counter', source: 'linkedin' },
    { id: 'dice-apps', type: 'counter', source: 'dice' },
    { id: 'recruiter-replies', type: 'checkbox' },
  ]

  it('sums counter totals across history + today, per source slug', () => {
    const dailyHistory = [
      { taskState: { 'linkedin-apps': { count: 10 }, 'dice-apps': { count: 5 } } },
    ]
    const todayState = { 'linkedin-apps': { count: 3 }, 'dice-apps': { count: 0 } }
    const opportunities = [
      { source: 'LinkedIn Easy Apply' },
      { source: 'LinkedIn apply (external)' },
      { source: 'Dice' },
    ]

    const result = effortVsYield(opportunities, dailyHistory, todayState, taskDefs)
    const linkedin = result.find(r => r.slug === 'linkedin')
    const dice = result.find(r => r.slug === 'dice')

    expect(linkedin.apps).toBe(13)
    expect(linkedin.opps).toBe(2)
    expect(linkedin.ratio).toBe(7) // round(13/2)

    expect(dice.apps).toBe(5)
    expect(dice.opps).toBe(1)
    expect(dice.ratio).toBe(5)
  })

  it('returns a null ratio when there are zero matching opportunities', () => {
    const result = effortVsYield([], [], {}, taskDefs)
    for (const row of result) {
      expect(row.apps).toBe(0)
      expect(row.opps).toBe(0)
      expect(row.ratio).toBeNull()
    }
  })
})

describe('channelResponseRates', () => {
  it('only counts outbound interactions and computes response rate', () => {
    const interactions = [
      { direction: 'outbound', channel: 'Email', response: 'yes' },
      { direction: 'outbound', channel: 'Email', response: 'no' },
      { direction: 'outbound', channel: 'Call', response: 'yes' },
      { direction: 'inbound', channel: 'Email', response: 'yes' },
    ]
    const rates = channelResponseRates(interactions)
    const email = rates.find(r => r.channel === 'Email')
    const call = rates.find(r => r.channel === 'Call')

    expect(email.sent).toBe(2)
    expect(email.responded).toBe(1)
    expect(email.rate).toBe(50)

    expect(call.sent).toBe(1)
    expect(call.responded).toBe(1)
    expect(call.rate).toBe(100)

    // Sorted by rate descending
    expect(rates[0].channel).toBe('Call')
  })

  it('returns an empty array when there are no outbound interactions', () => {
    expect(channelResponseRates([{ direction: 'inbound', channel: 'Email', response: 'yes' }])).toEqual([])
  })
})

describe('recruiterResponsePrefFromOpps', () => {
  it('finds each recruiter\'s best-responding channel via their opportunities\' interactions', () => {
    const opportunities = [
      { id: 'opp1', recruiterName: 'Christine Lee' },
      { id: 'opp2', recruiterName: 'Christine Lee' },
    ]
    const interactions = [
      { opportunityId: 'opp1', direction: 'outbound', channel: 'Email', response: 'no' },
      { opportunityId: 'opp1', direction: 'outbound', channel: 'Email', response: 'no' },
      { opportunityId: 'opp2', direction: 'outbound', channel: 'Call', response: 'yes' },
    ]
    const result = recruiterResponsePrefFromOpps(opportunities, interactions)
    expect(result).toEqual([{ recruiter: 'Christine Lee', bestChannel: 'Call' }])
  })

  it('skips opportunities without a recruiter name', () => {
    const opportunities = [
      { id: 'opp1', recruiterName: '' },
    ]
    const interactions = [
      { opportunityId: 'opp1', direction: 'outbound', channel: 'Email', response: 'yes' },
    ]
    expect(recruiterResponsePrefFromOpps(opportunities, interactions)).toEqual([])
  })

  it('still picks a best channel for a recruiter who has never responded', () => {
    const opportunities = [{ id: 'opp1', recruiterName: 'No Reply Nina' }]
    const interactions = [
      { opportunityId: 'opp1', direction: 'outbound', channel: 'Email', response: 'no' },
    ]
    expect(recruiterResponsePrefFromOpps(opportunities, interactions)).toEqual([
      { recruiter: 'No Reply Nina', bestChannel: 'Email' },
    ])
  })
})

describe('pipelineHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-09T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts open opportunities per stage and excludes closed ones', () => {
    const opportunities = [
      { id: '1', stage: 'submitted', stageEnteredAt: '2026-06-07T12:00:00' },
      { id: '2', stage: 'submitted', stageEnteredAt: '2026-06-05T12:00:00' },
      { id: '3', stage: 'closed', stageEnteredAt: '2026-06-01T12:00:00' },
    ]
    const { healthByStage } = pipelineHealth(opportunities, [])
    const submitted = healthByStage.find(h => h.stage === 'submitted')

    expect(submitted.count).toBe(2)
    expect(submitted.avgDays).toBe(3) // avg of 2 and 4 days
    expect(healthByStage.find(h => h.stage === 'closed')).toBeUndefined()
  })

  it('flags opportunities with no interaction in 5+ days as stale', () => {
    const opportunities = [
      { id: '1', stage: 'submitted', createdAt: '2026-06-08T12:00:00' }, // 1 day old, no interactions
      { id: '2', stage: 'submitted', createdAt: '2026-06-01T12:00:00' }, // 8 days old, no interactions
      { id: '3', stage: 'submitted', createdAt: '2026-06-01T12:00:00' },
      { id: '4', stage: 'closed', createdAt: '2026-06-01T12:00:00' },
    ]
    const interactions = [
      { opportunityId: '3', createdAt: '2026-06-08T12:00:00' }, // recent — not stale
    ]
    const { stale } = pipelineHealth(opportunities, interactions)
    const staleIds = stale.map(o => o.id)

    expect(staleIds).toContain('2')
    expect(staleIds).not.toContain('1')
    expect(staleIds).not.toContain('3')
    expect(staleIds).not.toContain('4')
  })
})

describe('weeklyTrends', () => {
  it('buckets application counts by week from daily history and today', () => {
    const taskDefs = [{ id: 'linkedin-apps', type: 'counter', source: 'linkedin' }]
    const dailyHistory = [
      { dateKey: '2026-06-08', taskState: { 'linkedin-apps': { count: 5 } } }, // Mon, week of 06-08
    ]
    const todayState = { 'linkedin-apps': { count: 2 } }

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 9)) // today = 2026-06-09 (same week)
    const trends = weeklyTrends([], [], dailyHistory, todayState, taskDefs)
    vi.useRealTimers()

    const week = trends.find(w => w.week === '2026-06-08')
    expect(week.apps).toBe(7)
  })

  it('buckets new opportunities by the week they were created', () => {
    const opportunities = [{ createdAt: '2026-06-09T10:00:00.000Z' }]
    const trends = weeklyTrends(opportunities, [], [], {}, [])
    const week = trends.find(w => w.week === '2026-06-08')
    expect(week.newOpps).toBe(1)
  })

  describe('interviews series (regression: bucket by first-reached date, not current stage)', () => {
    it('uses stageHistory["manager-interview"] even after the opportunity has moved further along', () => {
      const opp = {
        stage: 'offer', // current stage has moved on
        maxStageIndex: STAGE_IDX['offer'],
        stageEnteredAt: '2026-07-20T00:00:00.000Z', // when it reached "offer" — much later
        stageHistory: {
          new: '2026-06-01T00:00:00.000Z',
          'manager-interview': '2026-06-09T00:00:00.000Z', // when it FIRST hit interview
          offer: '2026-07-20T00:00:00.000Z',
        },
      }
      const trends = weeklyTrends([opp], [], [], {}, [])

      const interviewWeek = trends.find(w => w.week === '2026-06-08')
      expect(interviewWeek.interviews).toBe(1)
      // The week the opportunity later moved to "offer" should NOT show an interview count
      const julyWeek = trends.find(w => w.week.startsWith('2026-07'))
      expect(julyWeek).toBeUndefined()
    })

    it('falls back to stageEnteredAt for older records with no stageHistory', () => {
      const opp = {
        stage: 'manager-interview',
        maxStageIndex: STAGE_IDX['manager-interview'],
        stageEnteredAt: '2026-06-09T00:00:00.000Z',
      }
      const trends = weeklyTrends([opp], [], [], {}, [])
      const week = trends.find(w => w.week === '2026-06-08')
      expect(week.interviews).toBe(1)
    })

    it('does not count opportunities that never reached an interview stage', () => {
      const opp = {
        stage: 'submitted',
        maxStageIndex: STAGE_IDX['submitted'],
        stageEnteredAt: '2026-06-09T00:00:00.000Z',
        stageHistory: { submitted: '2026-06-09T00:00:00.000Z' },
      }
      const trends = weeklyTrends([opp], [], [], {}, [])
      const week = trends.find(w => w.week === '2026-06-08')
      expect(week?.interviews || 0).toBe(0)
    })
  })
})
