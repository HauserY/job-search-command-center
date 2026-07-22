import { useRef, useState } from 'react'
import { useStore } from '../state/useStore'
import { isOverdue, isDueToday, formatDate } from '../lib/dates'
import RecruiterCard from '../recruiters/RecruiterCard'

export default function Recruiters() {
  const { state, dispatch } = useStore()
  const { recruiters, recruiterContacts } = state
  const [name, setName] = useState('')
  const [agency, setAgency] = useState('')
  const nameRef = useRef(null)

  const dueRecruiters = recruiters
    .filter(r => r.status === 'active' && (isOverdue(r.nextFollowUpDue) || isDueToday(r.nextFollowUpDue)))
    .sort((a, b) => (a.nextFollowUpDue || '').localeCompare(b.nextFollowUpDue || ''))

  const sorted = [...recruiters].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    if (a.status === 'active') {
      return (a.nextFollowUpDue || '').localeCompare(b.nextFollowUpDue || '')
    }
    return (a.name || '').localeCompare(b.name || '')
  })

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!name.trim()) return
    dispatch({
      type: 'RECRUITER_ADD',
      recruiter: { name: name.trim(), agency: agency.trim() },
    })
    setName('')
    setAgency('')
    nameRef.current?.focus()
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Recruiters</h1>
      <p className="text-gray-400 text-sm mb-4">
        Track recruiters who want to stay in touch — log a quick weekly follow-up so you stay top of mind.
      </p>

      {/* Due strip */}
      {dueRecruiters.length > 0 && (
        <div className="rounded-lg border p-2 mb-4 bg-red-950/60 border-red-800 text-red-300">
          <div className="flex items-center gap-2 mb-1">
            <span>🔴</span>
            <span className="text-xs font-semibold uppercase tracking-wide">Follow-up due</span>
            <span className="text-xs bg-black/20 rounded-full px-1.5">{dueRecruiters.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {dueRecruiters.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="font-medium">{r.name || 'Unnamed'}</span>
                {r.agency && <span className="text-current/60 truncate">— {r.agency}</span>}
                <span className="ml-auto flex-shrink-0 opacity-50">{formatDate(r.nextFollowUpDue)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          ref={nameRef}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Recruiter name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Staffing agency / company (optional)"
          value={agency}
          onChange={e => setAgency(e.target.value)}
        />
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
        >
          Add
        </button>
      </form>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-6">
          No recruiters yet — add one above to start tracking follow-ups.
        </p>
      ) : (
        <div className="border border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-800">
          {sorted.map(r => (
            <RecruiterCard
              key={r.id}
              recruiter={r}
              contacts={recruiterContacts
                .filter(c => c.recruiterId === r.id)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
