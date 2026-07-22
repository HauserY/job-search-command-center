import { useState } from 'react'
import { useStore } from '../state/useStore'
import { CHANNELS } from '../state/defaults'
import { formatDate, formatDateTime, isOverdue, isDueToday } from '../lib/dates'
import ConfirmButton from '../components/ConfirmButton'

export default function RecruiterCard({ recruiter, contacts }) {
  const { dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState('LinkedIn DM')
  const [note, setNote] = useState('')

  const update = (changes) => dispatch({ type: 'RECRUITER_UPDATE', id: recruiter.id, changes })

  const overdue = recruiter.status === 'active' && isOverdue(recruiter.nextFollowUpDue)
  const dueToday = recruiter.status === 'active' && isDueToday(recruiter.nextFollowUpDue)
  const dueColor = overdue ? 'text-red-400' : dueToday ? 'text-yellow-400' : 'text-gray-500'

  const logFollowUp = () => {
    dispatch({
      type: 'RECRUITER_CONTACT_ADD',
      contact: { recruiterId: recruiter.id, channel, note: note.trim() },
    })
    setNote('')
  }

  return (
    <div className={overdue ? 'bg-red-950/10' : ''}>
      {/* ── Compact row ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-900/60 select-none"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-gray-600 text-xs w-3 flex-shrink-0">
          {open ? '▼' : '▸'}
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">
            {recruiter.name || 'Unnamed'}
          </span>
          {recruiter.agency && (
            <span className="text-xs text-gray-500 truncate hidden sm:inline">
              {recruiter.agency}
            </span>
          )}
        </div>

        <button
          onClick={e => { e.stopPropagation(); update({ status: recruiter.status === 'active' ? 'paused' : 'active' }) }}
          className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 transition-colors ${
            recruiter.status === 'active'
              ? 'bg-green-900/50 text-green-400 hover:bg-green-900'
              : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
          }`}
        >
          {recruiter.status === 'active' ? 'Active' : 'Paused'}
        </button>

        {recruiter.status === 'active' && (
          <span className={`text-xs flex-shrink-0 ${dueColor}`}>
            {overdue ? 'Overdue' : dueToday ? 'Due today' : formatDate(recruiter.nextFollowUpDue)}
          </span>
        )}

        {contacts.length > 0 && (
          <span className="text-xs text-gray-700 flex-shrink-0">{contacts.length}</span>
        )}
      </div>

      {/* ── Expanded detail panel ────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-gray-800 bg-gray-950/60 px-3 py-3 space-y-3">
          {/* Editable name + agency */}
          <div className="grid grid-cols-2 gap-2">
            <input
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              value={recruiter.name || ''}
              onChange={e => update({ name: e.target.value })}
              placeholder="Recruiter name"
              onClick={e => e.stopPropagation()}
            />
            <input
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
              value={recruiter.agency || ''}
              onChange={e => update({ agency: e.target.value })}
              placeholder="Staffing agency"
              onClick={e => e.stopPropagation()}
            />
          </div>

          {/* Notes */}
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
            value={recruiter.notes || ''}
            onChange={e => update({ notes: e.target.value })}
            placeholder="Notes — what they recruit for, last role discussed, contact info, etc."
            onClick={e => e.stopPropagation()}
          />

          {/* Last contact + cadence */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Last contact: {recruiter.lastContactAt ? formatDate(recruiter.lastContactAt.slice(0, 10)) : '—'}</span>
            <span className="flex items-center gap-1">
              Every
              <input
                type="number"
                min={1}
                className="w-10 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-xs text-white focus:outline-none focus:border-blue-500"
                value={recruiter.cadenceDays || 7}
                onChange={e => update({ cadenceDays: Math.max(1, Number(e.target.value) || 1) })}
                onClick={e => e.stopPropagation()}
              />
              days
            </span>
          </div>

          {/* Log follow-up */}
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    channel === ch
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Note (optional) — Enter to log"
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); logFollowUp() } }}
              />
              <button
                onClick={logFollowUp}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-medium transition-colors"
              >
                Log follow-up
              </button>
            </div>
          </div>

          {/* Contact history */}
          {contacts.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {contacts.map(c => (
                <div key={c.id} className="flex items-start gap-2 text-xs bg-gray-900/60 rounded p-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-300">{c.channel}</span>
                      <span className="text-gray-600 ml-auto">{formatDateTime(c.createdAt)}</span>
                    </div>
                    {c.note && <p className="text-gray-400 mt-0.5">{c.note}</p>}
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'RECRUITER_CONTACT_DELETE', id: c.id })}
                    className="text-gray-700 hover:text-red-400 flex-shrink-0"
                    aria-label="Delete"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Delete */}
          <div className="flex justify-end pt-1 border-t border-gray-800/50">
            <ConfirmButton
              onConfirm={() => dispatch({ type: 'RECRUITER_DELETE', id: recruiter.id })}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-950/30 transition-colors"
              confirmText="Delete forever"
            >
              Delete
            </ConfirmButton>
          </div>
        </div>
      )}
    </div>
  )
}
