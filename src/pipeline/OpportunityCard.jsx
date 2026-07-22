import { useState } from 'react'
import { useScreening } from '../state/useScreening'
import { formatDate, isOverdue } from '../lib/dates'
import { Chip } from '../components/Chip'
import OpportunityDetail from './OpportunityDetail'

export default function OpportunityCard({ opp, draggable, onDragStart, onDragEnd }) {
  const [expanded, setExpanded] = useState(false)
  const screening = useScreening()
  const halal = screening.statuses[opp.halalStatus] || screening.statuses.unknown
  const isAvoid = opp.halalStatus === 'avoid'
  const overdue = isOverdue(opp.nextActionDue)

  return (
    <div
      className={`rounded-lg border mb-2 transition-all ${
        isAvoid
          ? 'opacity-50 border-red-900/50 bg-gray-950'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
      }`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className="p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-white truncate">{opp.company || 'Unknown'}</span>
              {screening.enabled && (
                <span className={`text-base flex-shrink-0 ${halal.color}`} title={halal.label}>{halal.icon}</span>
              )}
            </div>
            {opp.role && <p className="text-xs text-gray-400 truncate mt-0.5">{opp.role}</p>}
          </div>
          <span className="text-gray-600 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-1.5">
          {opp.stage === 'closed' && opp.closedReason && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              opp.closedReason === 'Won offer'
                ? 'text-green-400 bg-green-950/60'
                : 'text-red-400/80 bg-red-950/40'
            }`}>{opp.closedReason}</span>
          )}
          {opp.source && (
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{opp.source}</span>
          )}
          {opp.engagementType && (
            <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{opp.engagementType}</span>
          )}
          {opp.rate && (
            <span className="text-[10px] text-green-600 bg-gray-800 px-1.5 py-0.5 rounded">{opp.rate}</span>
          )}
        </div>

        {opp.nextAction && opp.stage !== 'closed' && (
          <div className={`mt-1.5 text-[11px] flex items-center gap-1 ${overdue ? 'text-red-400' : 'text-gray-500'}`}>
            {overdue ? '🔴' : '📅'} {opp.nextAction}
            {opp.nextActionDue && <span className="ml-auto">{formatDate(opp.nextActionDue)}</span>}
          </div>
        )}

        {(opp.techTags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {opp.techTags.slice(0, 3).map(t => <Chip key={t} label={t} />)}
            {opp.techTags.length > 3 && (
              <span className="text-[10px] text-gray-600">+{opp.techTags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-2 pb-2">
          <OpportunityDetail opp={opp} onClose={() => setExpanded(false)} />
        </div>
      )}
    </div>
  )
}
