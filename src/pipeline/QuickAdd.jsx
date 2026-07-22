import { useState, useRef } from 'react'
import { useStore } from '../state/useStore'
import { addDays, localDateKey } from '../lib/dates'

export default function QuickAdd({ inputRef: externalRef }) {
  const [value, setValue] = useState('')
  const { dispatch } = useStore()
  const internalRef = useRef(null)
  const ref = externalRef || internalRef

  const handleSubmit = (e) => {
    e?.preventDefault()
    const parts = value.split('/').map(s => s.trim())
    const company = parts[0] || 'Unknown'
    const role = parts[1] || ''
    const recruiterName = parts[2] || ''

    dispatch({
      type: 'OPP_ADD',
      opp: {
        company,
        role,
        recruiterName,
        source: 'Other',
        halalStatus: 'unknown',
        stage: 'new',
        nextAction: 'Follow up',
        nextActionDue: addDays(localDateKey(), 3),
        techTags: [],
      },
    })
    setValue('')
    ref.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={ref}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        placeholder="Company / Role / Recruiter — press Enter to add"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
      >
        Add
      </button>
    </form>
  )
}
