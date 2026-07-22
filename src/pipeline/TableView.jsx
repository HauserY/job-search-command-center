import { Fragment, useState } from 'react'
import { STAGE_LABELS } from '../state/defaults'
import { useScreening } from '../state/useScreening'
import { formatDate, isOverdue } from '../lib/dates'
import OpportunityDetail from './OpportunityDetail'

export default function TableView({ opportunities }) {
  const [sortKey, setSortKey] = useState('company')
  const [sortDir, setSortDir] = useState(1)
  const [expandedId, setExpandedId] = useState(null)
  const screening = useScreening()

  const COLS = [
    { key: 'company', label: 'Company' },
    { key: 'role', label: 'Role' },
    { key: 'stage', label: 'Stage' },
    { key: 'source', label: 'Source' },
    ...(screening.enabled ? [{ key: 'halalStatus', label: screening.label }] : []),
    { key: 'rate', label: 'Rate' },
    { key: 'nextActionDue', label: 'Due' },
    { key: 'recruiterName', label: 'Recruiter' },
  ]

  const sorted = [...opportunities].sort((a, b) => {
    const av = a[sortKey] || ''
    const bv = b[sortKey] || ''
    return av.localeCompare(bv) * sortDir
  })

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(1) }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-800">
            {COLS.map(col => (
              <th
                key={col.key}
                className="pb-2 pr-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-300 whitespace-nowrap"
                onClick={() => toggleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && <span className="ml-1">{sortDir === 1 ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(opp => {
            const halal = screening.statuses[opp.halalStatus] || screening.statuses.unknown
            const isExpanded = expandedId === opp.id
            const overdue = isOverdue(opp.nextActionDue)
            return (
              <Fragment key={opp.id}>
                <tr
                  className={`border-b border-gray-900 hover:bg-gray-900/50 cursor-pointer ${opp.halalStatus === 'avoid' ? 'opacity-50' : ''}`}
                  onClick={() => setExpandedId(isExpanded ? null : opp.id)}
                >
                  <td className="py-2 pr-3 font-medium text-white">{opp.company}</td>
                  <td className="py-2 pr-3 text-gray-400 max-w-40 truncate">{opp.role}</td>
                  <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{STAGE_LABELS[opp.stage]}</td>
                  <td className="py-2 pr-3 text-gray-400 max-w-36 truncate">{opp.source}</td>
                  {screening.enabled && (
                    <td className="py-2 pr-3">
                      <span className={halal.color} title={halal.label}>{halal.icon}</span>
                    </td>
                  )}
                  <td className="py-2 pr-3 text-green-600 whitespace-nowrap">{opp.rate}</td>
                  <td className={`py-2 pr-3 whitespace-nowrap ${overdue ? 'text-red-400' : 'text-gray-400'}`}>
                    {formatDate(opp.nextActionDue)}
                  </td>
                  <td className="py-2 pr-3 text-gray-400">{opp.recruiterName}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={COLS.length} className="pb-3 pr-3">
                      <OpportunityDetail opp={opp} onClose={() => setExpandedId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="py-8 text-center text-gray-600">
                No opportunities yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
