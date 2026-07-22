import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { reducer, makeInitialState } from '../state/reducer'
import { makeDemoState } from './demoData'
import { serializeBackup, parseBackup } from '../lib/backup'
import ErrorBoundary from '../components/ErrorBoundary'
import {
  STAGES, SOURCES, ENGAGEMENT_TYPES, REMOTE_STATUSES, RESUME_VERSIONS,
  CHANNELS, DIRECTIONS, CLOSED_REASONS, DEFAULT_SCREENING,
} from '../state/defaults'

describe('onboarding / demo lifecycle reducer', () => {
  it('ONBOARD_DEMO seeds once — reducer-level idempotency', () => {
    const first = reducer(makeInitialState(), { type: 'ONBOARD_DEMO', demoState: makeDemoState() })
    expect(first.demoMode).toBe(true)
    expect(first.demoSeeded).toBe(true)
    const oppCount = first.opportunities.length

    // Double-dispatch (double-click, keyboard repeat) must not re-seed:
    const second = reducer(first, { type: 'ONBOARD_DEMO', demoState: makeDemoState() })
    expect(second).toBe(first)
    expect(second.opportunities).toHaveLength(oppCount)
  })

  it('ONBOARD_EMPTY marks onboarded without demo mode', () => {
    const result = reducer(makeInitialState(), { type: 'ONBOARD_EMPTY' })
    expect(result.onboarded).toBe(true)
    expect(result.demoMode).toBe(false)
    expect(result.opportunities).toEqual([])
  })

  it('DEMO_KEEP exits demo mode but keeps all data', () => {
    const demo = reducer(makeInitialState(), { type: 'ONBOARD_DEMO', demoState: makeDemoState() })
    const kept = reducer(demo, { type: 'DEMO_KEEP' })
    expect(kept.demoMode).toBe(false)
    expect(kept.opportunities).toEqual(demo.opportunities)
  })

  it('DEMO_CLEAR wipes to an empty, onboarded, real state', () => {
    const demo = reducer(makeInitialState(), { type: 'ONBOARD_DEMO', demoState: makeDemoState() })
    const cleared = reducer(demo, { type: 'DEMO_CLEAR' })
    expect(cleared.onboarded).toBe(true)
    expect(cleared.demoMode).toBe(false)
    expect(cleared.opportunities).toEqual([])
    expect(cleared.dailyHistory).toEqual([])
  })
})

describe('demo dataset requirements (spec review iter 3)', () => {
  const demo = makeDemoState()

  it('carries at least 2 weeks of dailyHistory with target snapshots', () => {
    expect(demo.dailyHistory.length).toBeGreaterThanOrEqual(14)
    for (const day of demo.dailyHistory) {
      expect(day.targets).toBeTruthy()
    }
  })

  it('populates every Insights input: opportunities, interactions, recruiters', () => {
    expect(demo.opportunities.length).toBeGreaterThanOrEqual(4)
    expect(demo.opportunities.some(o => o.stage === 'closed')).toBe(true)
    expect(demo.interactions.length).toBeGreaterThanOrEqual(4)
    expect(demo.recruiters.length).toBeGreaterThanOrEqual(2)
    expect(demo.recruiterContacts.length).toBeGreaterThanOrEqual(1)
  })

  it('is a valid backup payload (round-trips through strict validation)', () => {
    const result = parseBackup(serializeBackup(demo))
    expect(result.ok).toBe(true)
    expect(result.state.demoMode).toBe(true)
  })

  // Vocabulary enforcement: demo values MUST come from the app's real enums.
  // A made-up stage name ('technical' vs 'technical-interview') crashed the
  // Kanban in the production build — this locks the whole class out.
  it('every opportunity uses only real vocabulary (stages, sources, types)', () => {
    for (const opp of demo.opportunities) {
      expect(STAGES, `stage of ${opp.company}`).toContain(opp.stage)
      expect(SOURCES, `source of ${opp.company}`).toContain(opp.source)
      expect(ENGAGEMENT_TYPES, `engagementType of ${opp.company}`).toContain(opp.engagementType)
      expect(REMOTE_STATUSES, `remoteStatus of ${opp.company}`).toContain(opp.remoteStatus)
      expect(RESUME_VERSIONS, `resumeVersion of ${opp.company}`).toContain(opp.resumeVersion)
      expect(Object.keys(DEFAULT_SCREENING.statuses), `halalStatus of ${opp.company}`).toContain(opp.halalStatus)
      expect(Array.isArray(opp.techTags), `techTags of ${opp.company}`).toBe(true)
      if (opp.stage === 'closed') {
        expect(CLOSED_REASONS, `closedReason of ${opp.company}`).toContain(opp.closedReason)
      }
    }
  })

  it('every interaction and recruiter contact uses real channels/directions', () => {
    for (const i of demo.interactions) {
      expect(CHANNELS).toContain(i.channel)
      expect(DIRECTIONS).toContain(i.direction)
    }
    for (const c of demo.recruiterContacts) {
      expect(CHANNELS).toContain(c.channel)
    }
  })

  it('includes both a won and a failed closed opportunity (board outcome columns)', () => {
    const closed = demo.opportunities.filter(o => o.stage === 'closed')
    expect(closed.some(o => o.closedReason === 'Won offer')).toBe(true)
    expect(closed.some(o => o.closedReason !== 'Won offer')).toBe(true)
  })
})

describe('ErrorBoundary (finding 8A)', () => {
  it('renders the data-safe fallback with export + details when a child throws', () => {
    const Bomb = () => { throw new Error('kaboom-test') }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )
    spy.mockRestore()
    expect(screen.getByText(/your data is safe/i)).toBeInTheDocument()
    expect(screen.getByText('Export backup')).toBeInTheDocument()
    expect(screen.getByText('Reload app')).toBeInTheDocument()
    expect(screen.getByText(/Error details/)).toBeInTheDocument()
  })
})
