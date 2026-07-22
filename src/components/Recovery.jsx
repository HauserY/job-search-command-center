import { useRef, useState, useEffect } from 'react'
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../state/migrations'

// Recovery screen (release plan finding 2A): shown when stored state failed
// to load. The raw payload is already quarantined under a timestamped key
// BEFORE this renders — no byte of user data is destroyed without an
// explicit choice below.

export default function Recovery({ raw, quarantineKey, onStartFresh, onImport }) {
  const fileRef = useRef(null)
  const [error, setError] = useState(null)
  const [confirmFresh, setConfirmFresh] = useState(false)

  useEffect(() => {
    if (!confirmFresh) return
    const h = (e) => { if (e.key === 'Escape') setConfirmFresh(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [confirmFresh])

  const downloadRaw = () => {
    const blob = new Blob([raw ?? ''], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `jscc-recovered-data-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if ((parsed.schemaVersion || 1) > CURRENT_SCHEMA_VERSION) {
          setError('This backup is from a newer version of the app. Refresh to update, then try again.')
          return
        }
        onImport(runMigrations(parsed))
      } catch {
        setError("That file couldn't be read as a JSCC backup.")
      }
    }
    reader.onerror = () => setError('Could not read the file.')
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#030712', color: '#f3f4f6' }}>
      <div className="max-w-lg w-full rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <h1 className="text-xl font-bold text-white mb-2">Your saved data couldn&apos;t be loaded</h1>
        <p className="text-sm text-gray-400 mb-1">
          The stored data appears to be damaged. Nothing has been deleted — a raw copy was
          saved{quarantineKey ? ' inside your browser' : ''} before anything else ran.
        </p>
        <p className="text-sm text-gray-400 mb-5">
          Download the raw copy first. Then restore from a backup file, or start fresh.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={downloadRaw}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 text-sm"
          >
            Download raw data copy
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-lg border border-gray-700 hover:border-gray-500 text-gray-200 font-medium py-2.5 text-sm"
          >
            Restore from a backup file…
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />

          {!confirmFresh ? (
            <button
              onClick={() => setConfirmFresh(true)}
              className="w-full rounded-lg border border-red-900 hover:border-red-700 text-red-400 font-medium py-2.5 text-sm"
            >
              Start fresh…
            </button>
          ) : (
            <div className="rounded-lg border border-red-900 p-3">
              <p className="text-sm text-red-300 mb-3">
                Start with an empty tracker? The damaged data stays quarantined in your browser
                and downloadable above, but the app will begin empty.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onStartFresh}
                  className="flex-1 rounded-lg bg-red-700 hover:bg-red-600 text-white font-medium py-2 text-sm"
                >
                  Yes, start fresh
                </button>
                <button
                  onClick={() => setConfirmFresh(false)}
                  className="flex-1 rounded-lg border border-gray-700 text-gray-300 font-medium py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>
        )}
        {quarantineKey && (
          <p className="mt-4 text-xs text-gray-600 font-mono">quarantine: {quarantineKey}</p>
        )}
      </div>
    </div>
  )
}
