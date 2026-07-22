import { useState } from 'react'

export function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700 text-gray-200 text-xs font-medium">
      {label}
      {onRemove && (
        <button
          className="text-gray-400 hover:text-white ml-0.5"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >×</button>
      )}
    </span>
  )
}

export function ChipInput({ tags, onChange, placeholder = 'Add tag…' }) {
  const [input, setInput] = useState('')

  const add = (val) => {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-8 p-1.5 rounded bg-gray-800 border border-gray-700 focus-within:border-blue-500">
      {tags.map(t => (
        <Chip key={t} label={t} onRemove={() => onChange(tags.filter(x => x !== t))} />
      ))}
      <input
        className="flex-1 min-w-24 bg-transparent text-sm text-white outline-none placeholder-gray-500"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
          if (e.key === 'Backspace' && !input && tags.length > 0) {
            onChange(tags.slice(0, -1))
          }
        }}
        onBlur={() => { if (input) add(input) }}
        placeholder={tags.length === 0 ? placeholder : ''}
      />
    </div>
  )
}
