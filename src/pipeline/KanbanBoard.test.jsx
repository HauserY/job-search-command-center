import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import KanbanBoard from './KanbanBoard'
import { STAGE_LABELS } from '../state/defaults'

const dispatch = vi.fn()

vi.mock('../state/useStore', () => ({
  useStore: () => ({ state: { settings: {} }, dispatch }),
}))

function getColumn(label) {
  return screen.getByText(label).closest('div').parentElement
}

function getCard(company) {
  return screen.getByText(company).closest('[draggable]')
}

describe('KanbanBoard halal-avoid drop guard (regression)', () => {
  const avoidOpp = {
    id: 'opp-avoid',
    company: 'Acme',
    stage: 'new',
    halalStatus: 'avoid',
  }
  const okOpp = {
    id: 'opp-ok',
    company: 'Globex',
    stage: 'new',
    halalStatus: 'permissible',
  }

  beforeEach(() => {
    dispatch.mockClear()
  })

  it('shows a confirm banner instead of moving an "avoid" card directly', () => {
    render(<KanbanBoard opportunities={[avoidOpp]} />)

    fireEvent.dragStart(getCard('Acme'))
    fireEvent.drop(getColumn(STAGE_LABELS['screening']))

    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByText(/marked Avoid/i)).toBeInTheDocument()
  })

  it('moves the card only after confirming "Yes"', () => {
    render(<KanbanBoard opportunities={[avoidOpp]} />)

    fireEvent.dragStart(getCard('Acme'))
    fireEvent.drop(getColumn(STAGE_LABELS['screening']))
    fireEvent.click(screen.getByText('Yes'))

    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPP_UPDATE',
      id: 'opp-avoid',
      changes: { stage: 'screening' },
    })
  })

  it('does not move the card if "Cancel" is clicked', () => {
    render(<KanbanBoard opportunities={[avoidOpp]} />)

    fireEvent.dragStart(getCard('Acme'))
    fireEvent.drop(getColumn(STAGE_LABELS['screening']))
    fireEvent.click(screen.getByText('Cancel'))

    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.queryByText(/marked Avoid/i)).not.toBeInTheDocument()
  })

  it('moves a non-"avoid" card directly without a confirm banner', () => {
    render(<KanbanBoard opportunities={[okOpp]} />)

    fireEvent.dragStart(getCard('Globex'))
    fireEvent.drop(getColumn(STAGE_LABELS['screening']))

    expect(screen.queryByText(/marked Avoid/i)).not.toBeInTheDocument()
    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPP_UPDATE',
      id: 'opp-ok',
      changes: { stage: 'screening' },
    })
  })
})

describe('KanbanBoard outcome columns (won / failed split)', () => {
  beforeEach(() => dispatch.mockClear())

  const won = { id: 'w1', company: 'WonCo', stage: 'closed', closedReason: 'Won offer' }
  const lost = { id: 'l1', company: 'LostCo', stage: 'closed', closedReason: 'Rejected' }
  const active = { id: 'a1', company: 'ActiveCo', stage: 'offer' }

  it('splits closed cards into Won and Didn’t-work-out columns by reason', () => {
    render(<KanbanBoard opportunities={[won, lost, active]} />)
    expect(getColumn('🏆 Won')).toContainElement(screen.getByText('WonCo'))
    expect(getColumn(/Didn/)).toContainElement(screen.getByText('LostCo'))
    expect(getColumn(STAGE_LABELS['offer'])).toContainElement(screen.getByText('ActiveCo'))
  })

  it('dropping on Won closes with "Won offer" and clears the next action', () => {
    render(<KanbanBoard opportunities={[active]} />)
    fireEvent.dragStart(getCard('ActiveCo'))
    fireEvent.drop(getColumn('🏆 Won'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPP_UPDATE',
      id: 'a1',
      changes: { stage: 'closed', closedReason: 'Won offer', nextAction: '', nextActionDue: '' },
    })
  })

  it('dropping on Didn’t-work-out defaults the reason to Rejected', () => {
    render(<KanbanBoard opportunities={[active]} />)
    fireEvent.dragStart(getCard('ActiveCo'))
    fireEvent.drop(getColumn(/Didn/))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPP_UPDATE',
      id: 'a1',
      changes: { stage: 'closed', closedReason: 'Rejected', nextAction: '', nextActionDue: '' },
    })
  })

  it('moving a failed card to Won overwrites the reason (and vice versa keeps a real reason)', () => {
    render(<KanbanBoard opportunities={[lost]} />)
    fireEvent.dragStart(getCard('LostCo'))
    fireEvent.drop(getColumn('🏆 Won'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'OPP_UPDATE',
      id: 'l1',
      changes: { stage: 'closed', closedReason: 'Won offer', nextAction: '', nextActionDue: '' },
    })
  })
})
