import { useState, useEffect } from 'react'
import { serializeBackup } from '../lib/backup'

function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return
    const h = (e) => { if (e.key === 'Escape') onEscape() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, onEscape])
}

// Persistent banner while demoMode is true. Two exits (T6 clarification 2):
//   "Keep this data"  → demo entities become the user's real data, banner gone
//   "Clear & start fresh…" → confirm dialog (finding 4A) with inline export,
//     states plainly that user-added entries are erased too.
// aria-live so screen readers announce the mode (11B baseline).

export default function DemoBanner({ state, dispatch }) {
  const [confirming, setConfirming] = useState(false)
  useEscape(confirming, () => setConfirming(false))

  const exportNow = () => {
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `jscc-demo-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div role="status" aria-live="polite" style={{
      background: '#1e3a5f', borderBottom: '1px solid #2563eb40',
      padding: '8px 16px', fontSize: 13, color: '#dbeafe',
      position: 'sticky', top: 0, zIndex: 90,
    }}>
      {!confirming ? (
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <span>👀 You&apos;re exploring <strong>demo data</strong> — play with everything.</span>
          <span className="flex gap-2">
            <button
              onClick={() => dispatch({ type: 'DEMO_KEEP' })}
              className="rounded-md bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 text-xs font-semibold"
            >
              Keep this data
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="rounded-md border border-blue-700 hover:border-blue-400 text-blue-200 px-3 py-1 text-xs font-medium"
            >
              Clear &amp; start fresh…
            </button>
          </span>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-2" role="alertdialog" aria-label="Confirm clearing demo data">
          <span>
            This erases <strong>everything</strong> — including anything you added while exploring.
          </span>
          <span className="flex gap-2">
            <button
              onClick={exportNow}
              className="rounded-md border border-blue-700 hover:border-blue-400 text-blue-200 px-3 py-1 text-xs font-medium"
            >
              Export first
            </button>
            <button
              onClick={() => dispatch({ type: 'DEMO_CLEAR' })}
              className="rounded-md bg-red-700 hover:bg-red-600 text-white px-3 py-1 text-xs font-semibold"
            >
              Yes, erase and start fresh
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-md border border-blue-700 text-blue-200 px-3 py-1 text-xs font-medium"
            >
              Cancel
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
