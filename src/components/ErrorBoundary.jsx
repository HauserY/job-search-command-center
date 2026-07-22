import { Component } from 'react'
import { STORAGE_KEY } from '../state/persistence'

// Top-level error boundary (release plan finding 8A). Catches any render
// crash so the failure mode is a calm recovery screen, never a white page.
//
// Placement guarantee (codex bundle item 1): this sits OUTSIDE StoreProvider
// (see main.jsx) and its Export action reads RAW localStorage directly — it
// works even when the state layer itself is what crashed.

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('jscc: render crash', error, info?.componentStack)
  }

  exportRaw = () => {
    let raw = null
    try { raw = localStorage.getItem(STORAGE_KEY) } catch { /* storage unreadable */ }
    const blob = new Blob([raw ?? ''], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `jscc-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  render() {
    if (!this.state.error) return this.props.children

    const detail = `${this.state.error?.message || this.state.error}\n\n${this.state.error?.stack || ''}`
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#030712', color: '#f3f4f6' }}>
        <div className="max-w-lg w-full rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          <h1 className="text-xl font-bold text-white mb-2">Something went wrong — your data is safe</h1>
          <p className="text-sm text-gray-400 mb-5">
            The app hit an error while drawing the screen. Your saved data was not touched.
            Export a backup if you want extra peace of mind, then reload.
          </p>
          <div className="flex gap-3 mb-5">
            <button
              onClick={this.exportRaw}
              className="rounded-lg border border-gray-700 hover:border-gray-500 text-gray-200 font-medium px-4 py-2.5 text-sm"
            >
              Export backup
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 text-sm"
            >
              Reload app
            </button>
          </div>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-300">Error details (copy this into a bug report)</summary>
            <textarea
              readOnly
              value={detail}
              onFocus={(e) => e.target.select()}
              className="mt-2 w-full h-40 bg-gray-950 border border-gray-800 rounded p-2 font-mono text-[11px] text-gray-400"
            />
          </details>
        </div>
      </div>
    )
  }
}
