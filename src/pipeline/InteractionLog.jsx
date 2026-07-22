import { useState } from 'react'
import { useStore } from '../state/useStore'
import { CHANNELS } from '../state/defaults'
import { formatDateTime } from '../lib/dates'

const RESPONSE_LABELS = { yes: '✓ Replied', no: '✗ No reply', pending: '⏳ Pending' }
const RESPONSE_COLORS = { yes: 'text-green-400', no: 'text-red-400', pending: 'text-yellow-400' }

export default function InteractionLog({ opportunityId }) {
  const { state, dispatch } = useStore()
  const [channel, setChannel] = useState('LinkedIn DM')
  const [direction, setDirection] = useState('outbound')
  const [note, setNote] = useState('')

  const interactions = state.interactions
    .filter(i => i.opportunityId === opportunityId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const save = () => {
    if (!note.trim() && !channel) return
    dispatch({
      type: 'INTERACTION_ADD',
      interaction: {
        opportunityId,
        channel,
        direction,
        note: note.trim(),
        response: direction === 'inbound' ? 'yes' : 'pending',
      },
    })
    setNote('')
  }

  return (
    <div>
      {/* Quick-log form */}
      <div className="bg-gray-900 rounded-lg p-3 mb-3">
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
        <div className="flex gap-1.5 mb-2">
          {['inbound', 'outbound'].map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={`px-2 py-1 rounded text-xs font-medium capitalize transition-colors ${
                direction === d
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {d === 'inbound' ? '← Inbound' : '→ Outbound'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            placeholder="Note (optional) — Enter to save"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
          />
          <button
            onClick={save}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-medium transition-colors"
          >
            Log
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {interactions.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-2">No interactions logged yet</p>
        )}
        {interactions.map(i => (
          <div key={i.id} className="flex items-start gap-2 text-xs bg-gray-900/60 rounded p-2">
            <div className={`font-medium ${i.direction === 'inbound' ? 'text-blue-400' : 'text-purple-400'}`}>
              {i.direction === 'inbound' ? '←' : '→'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-300">{i.channel}</span>
                <span className={`${RESPONSE_COLORS[i.response]}`}>{RESPONSE_LABELS[i.response]}</span>
                <span className="text-gray-600 ml-auto">{formatDateTime(i.createdAt)}</span>
              </div>
              {i.note && <p className="text-gray-400 mt-0.5 truncate">{i.note}</p>}
            </div>
            <button
              onClick={() => dispatch({ type: 'INTERACTION_DELETE', id: i.id })}
              className="text-gray-700 hover:text-red-400 flex-shrink-0"
              aria-label="Delete"
            >×</button>
          </div>
        ))}
      </div>
    </div>
  )
}
