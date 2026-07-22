import { useState, useRef, useCallback } from 'react'

export default function Counter({ value, onChange, size = 'md' }) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')
  const longPressRef = useRef(null)
  const longPressFiredRef = useRef(false)

  const startLongPress = useCallback((e) => {
    e.preventDefault()
    longPressRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      onChange(Math.max(0, value - 1))
      longPressRef.current = null
    }, 500)
  }, [value, onChange])

  const endLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }, [])

  const handleIncrementClick = useCallback(() => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    onChange(value + 1)
  }, [value, onChange])

  const numSize = size === 'lg' ? 'text-3xl w-16' : 'text-xl w-12'
  const btnSize = size === 'lg' ? 'w-12 h-12 text-xl' : 'w-9 h-9 text-lg'

  if (editing) {
    return (
      <input
        type="number"
        className={`${numSize} text-center bg-gray-800 rounded border border-blue-500 text-white focus:outline-none`}
        value={editVal}
        autoFocus
        onChange={e => setEditVal(e.target.value)}
        onBlur={() => {
          const n = parseInt(editVal, 10)
          if (!isNaN(n) && n >= 0) onChange(n)
          setEditing(false)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        min={0}
      />
    )
  }

  return (
    <div className="flex items-center gap-1">
      {/* Decrement — long-press on + also works, but we keep a − for clarity */}
      <button
        className={`${btnSize} flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-gray-200 font-bold transition-colors select-none`}
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Decrease"
      >−</button>

      <button
        className={`${numSize} font-mono font-bold text-white cursor-pointer hover:text-blue-400 transition-colors`}
        onClick={() => { setEditVal(String(value)); setEditing(true) }}
        title="Click to edit"
      >
        {value}
      </button>

      {/* Increment — big button, long-press to decrement */}
      <button
        className={`${btnSize} flex items-center justify-center rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-2xl transition-colors select-none`}
        onClick={handleIncrementClick}
        onMouseDown={startLongPress}
        onMouseUp={endLongPress}
        onMouseLeave={endLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={endLongPress}
        aria-label="Increase"
      >+</button>
    </div>
  )
}
