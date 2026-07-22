import { useRef, useState } from 'react'
import { useStore } from '../state/useStore'
import { isOverdue, isDueToday, formatDate } from '../lib/dates'
import QuickAdd from '../pipeline/QuickAdd'
import KanbanBoard from '../pipeline/KanbanBoard'
import TableView from '../pipeline/TableView'

function ActionStrip({ opps, color, label, icon }) {
  if (opps.length === 0) return null
  return (
    <div className={`rounded-lg border p-2 mb-2 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        <span className="text-xs bg-black/20 rounded-full px-1.5">{opps.length}</span>
      </div>
      <div className="flex flex-col gap-1">
        {opps.map(opp => (
          <div key={opp.id} className="flex items-center gap-2 text-xs">
            <span className="font-medium">{opp.company}</span>
            {opp.role && <span className="text-current/60 truncate">— {opp.role}</span>}
            <span className="ml-auto flex-shrink-0 opacity-70">{opp.nextAction}</span>
            <span className="flex-shrink-0 opacity-50">{formatDate(opp.nextActionDue)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Pipeline() {
  const { state } = useStore()
  const quickAddRef = useRef(null)
  const [view, setView] = useState('kanban')
  const [filter, setFilter] = useState('')
  const { opportunities } = state

  const activeOpps = opportunities.filter(o => o.stage !== 'closed')
  const overdue = activeOpps.filter(o => isOverdue(o.nextActionDue))
  const dueToday = activeOpps.filter(o => isDueToday(o.nextActionDue))

  const filtered = filter
    ? opportunities.filter(o =>
        (o.company || '').toLowerCase().includes(filter.toLowerCase()) ||
        (o.role || '').toLowerCase().includes(filter.toLowerCase()) ||
        (o.recruiterName || '').toLowerCase().includes(filter.toLowerCase())
      )
    : opportunities

  return (
    <div className="px-4 py-6 max-w-full">
      {/* Overdue + due today strips */}
      <ActionStrip
        opps={overdue}
        color="bg-red-950/60 border-red-800 text-red-300"
        label="Overdue"
        icon="🔴"
      />
      <ActionStrip
        opps={dueToday}
        color="bg-yellow-950/40 border-yellow-800/50 text-yellow-300"
        label="Due today"
        icon="📅"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1">
          <QuickAdd inputRef={quickAddRef} />
        </div>
        <input
          className="w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Filter…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >Kanban</button>
          <button
            onClick={() => setView('table')}
            className={`px-3 py-2 text-xs font-medium transition-colors ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >Table</button>
        </div>
      </div>

      {/* Counts */}
      <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
        <span>{opportunities.filter(o => o.stage !== 'closed').length} active</span>
        <span>·</span>
        <span>{opportunities.length} total</span>
      </div>

      {view === 'kanban'
        ? <KanbanBoard opportunities={filtered} />
        : <TableView opportunities={filtered} />
      }
    </div>
  )
}
