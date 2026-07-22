import { useState } from 'react'
import { useStore } from '../state/useStore'
import { STAGES, STAGE_LABELS } from '../state/defaults'
import { needsHalalConfirm } from '../lib/halal'
import OpportunityCard from './OpportunityCard'

// The single "closed" stage splits into two OUTCOME columns on the board:
// won (closedReason === 'Won offer') vs everything else (rejected, ghosted,
// withdrew, …). Dropping a card on an outcome column closes it with a
// sensible default reason — editable afterwards in the detail panel.
const WON_REASON = 'Won offer'
const COLUMNS = [
  ...STAGES.filter(s => s !== 'closed').map(s => ({ id: s, stage: s, label: STAGE_LABELS[s] })),
  { id: 'closed-won', stage: 'closed', label: '🏆 Won', accent: 'won' },
  { id: 'closed-failed', stage: 'closed', label: "✖ Didn't work out", accent: 'failed' },
]

export default function KanbanBoard({ opportunities }) {
  const { dispatch } = useStore()
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const [pendingDrop, setPendingDrop] = useState(null)

  const byColumn = {}
  for (const c of COLUMNS) byColumn[c.id] = []
  for (const opp of opportunities) {
    const stage = opp.stage || 'new'
    if (stage === 'closed') {
      byColumn[opp.closedReason === WON_REASON ? 'closed-won' : 'closed-failed'].push(opp)
    } else {
      // Unknown stage values (bad import, old data) land in New instead of
      // crashing the whole board.
      ;(byColumn[stage] || byColumn.new).push(opp)
    }
  }

  const moveToColumn = (oppId, column) => {
    const changes = { stage: column.stage }
    if (column.id === 'closed-won') {
      changes.closedReason = WON_REASON
      changes.nextAction = ''
      changes.nextActionDue = ''
    } else if (column.id === 'closed-failed') {
      const opp = opportunities.find(o => o.id === oppId)
      // Keep an existing non-won reason; default fresh failures to Rejected.
      changes.closedReason = opp?.closedReason && opp.closedReason !== WON_REASON
        ? opp.closedReason
        : 'Rejected'
      changes.nextAction = ''
      changes.nextActionDue = ''
    }
    dispatch({ type: 'OPP_UPDATE', id: oppId, changes })
  }

  const onDrop = (column) => {
    if (dragging) {
      const opp = opportunities.find(o => o.id === dragging)
      if (opp && needsHalalConfirm(opp, column.stage)) {
        setPendingDrop({ oppId: dragging, company: opp.company, column })
      } else {
        moveToColumn(dragging, column)
      }
    }
    setDragging(null)
    setDragOver(null)
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {pendingDrop && (
        <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-sm text-red-300">
            ❌ {pendingDrop.company || 'This opportunity'} is marked Avoid — move to {pendingDrop.column.label} anyway?
          </span>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
              onClick={() => { moveToColumn(pendingDrop.oppId, pendingDrop.column); setPendingDrop(null) }}
            >Yes</button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
              onClick={() => setPendingDrop(null)}
            >Cancel</button>
          </div>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto min-h-[60vh]">
      {COLUMNS.map(column => {
        const cards = byColumn[column.id] || []
        const headerColor = column.accent === 'won' ? 'text-green-400'
          : column.accent === 'failed' ? 'text-red-400/80'
          : 'text-gray-400'
        const borderIdle = column.accent === 'won' ? 'border-green-900/50 bg-green-950/10'
          : column.accent === 'failed' ? 'border-red-900/40 bg-red-950/10'
          : 'border-gray-800 bg-gray-900/40'
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-56 rounded-xl border transition-colors ${
              dragOver === column.id ? 'border-blue-500 bg-blue-950/20' : borderIdle
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(column.id) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDrop(column)}
          >
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wide ${headerColor}`}>{column.label}</span>
              <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-1.5 py-0.5">{cards.length}</span>
            </div>
            <div className="p-2 min-h-16">
              {cards.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opp={opp}
                  draggable
                  onDragStart={() => setDragging(opp.id)}
                  onDragEnd={() => { setDragging(null); setDragOver(null) }}
                />
              ))}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
