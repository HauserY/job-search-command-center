import { useRef, useState, useEffect } from 'react'
import { useStore } from '../state/useStore'
import ConfirmButton from '../components/ConfirmButton'
import { serializeBackup, parseBackup, effectiveImportMode } from '../lib/backup'
import { maybeRollover } from '../state/migrate'
import { useScreening } from '../state/useScreening'

// Editor for the configurable screening field (decision 11B): the label and
// status names are yours to define — visa sponsorship, remote-only, salary
// floor, halal (the shipped default) — or hide the field entirely.
function ScreeningEditor({ screening, onChange }) {
  const setStatusLabel = (key, label) =>
    onChange({
      ...screening,
      statuses: { ...screening.statuses, [key]: { ...screening.statuses[key], label } },
    })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={screening.enabled}
          onChange={e => onChange({ ...screening, enabled: e.target.checked })}
          className="rounded"
        />
        Show a screening field on opportunities
      </label>

      {screening.enabled && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Field label</label>
            <input
              className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={screening.label}
              onChange={e => onChange({ ...screening, label: e.target.value })}
              placeholder="e.g. Halal status, Visa sponsorship, Salary floor"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(screening.statuses).map(([key, status]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-center" aria-hidden="true">{status.icon}</span>
                <input
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  value={status.label}
                  onChange={e => setStatusLabel(key, e.target.value)}
                  aria-label={`Label for ${key} status`}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            The ❌ status guards stage changes: advancing an opportunity marked with it asks for confirmation.
          </p>
        </>
      )}
    </div>
  )
}

function TaskDefEditor({ taskDefs, onChange }) {
  const add = () => {
    const maxOrder = Math.max(0, ...taskDefs.map(d => d.order))
    onChange([...taskDefs, {
      id: crypto.randomUUID(),
      label: 'New task',
      type: 'counter',
      target: 10,
      order: maxOrder + 1,
    }])
  }

  const update = (id, changes) => onChange(taskDefs.map(d => d.id === id ? { ...d, ...changes } : d))
  const remove = (id) => onChange(taskDefs.filter(d => d.id !== id))
  const move = (id, dir) => {
    const sorted = [...taskDefs].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(d => d.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sorted.length) return
    const swapped = [...sorted]
    const tmp = swapped[idx].order
    swapped[idx] = { ...swapped[idx], order: swapped[newIdx].order }
    swapped[newIdx] = { ...swapped[newIdx], order: tmp }
    onChange(swapped)
  }

  const sorted = [...taskDefs].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-2">
      {sorted.map((def, idx) => (
        <div key={def.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
              <button
                className="text-gray-600 hover:text-gray-300 text-xs leading-none px-1"
                onClick={() => move(def.id, -1)}
                disabled={idx === 0}
              >▲</button>
              <button
                className="text-gray-600 hover:text-gray-300 text-xs leading-none px-1"
                onClick={() => move(def.id, 1)}
                disabled={idx === sorted.length - 1}
              >▼</button>
            </div>

            <div className="flex-1 min-w-48">
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                value={def.label}
                onChange={e => update(def.id, { label: e.target.value })}
                placeholder="Task label"
              />
            </div>

            <select
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
              value={def.type}
              onChange={e => update(def.id, { type: e.target.value })}
            >
              <option value="checkbox">Checkbox</option>
              <option value="counter">Counter</option>
              <option value="followups">Follow-ups (auto)</option>
            </select>

            {def.type === 'counter' && (
              <input
                type="number"
                className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none"
                value={def.target || ''}
                onChange={e => update(def.id, { target: parseInt(e.target.value) || undefined })}
                placeholder="Target"
                min={1}
              />
            )}

            <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={!!def.core}
                onChange={e => update(def.id, { core: e.target.checked })}
                className="rounded"
              />
              Core
            </label>

            <button
              className="text-gray-600 hover:text-red-400 text-lg leading-none px-1"
              onClick={() => remove(def.id)}
              aria-label="Remove task"
            >×</button>
          </div>
        </div>
      ))}
      <button
        className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors"
        onClick={add}
      >+ Add task</button>
    </div>
  )
}

export default function Settings() {
  const { state, dispatch } = useStore()
  const fileInputRef = useRef(null)
  const [importMode, setImportMode] = useState('replace')
  const [importError, setImportError] = useState('')
  const [pendingImport, setPendingImport] = useState(null) // { state, mode, fileName }

  const taskDefs = state.settings.taskDefs
  const demoMode = !!state.demoMode
  const screeningConfig = useScreening()

  useEffect(() => {
    if (!pendingImport) return
    const h = (e) => { if (e.key === 'Escape') setPendingImport(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [pendingImport])

  const handleExport = () => {
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jscc-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = parseBackup(ev.target.result)
      fileInputRef.current.value = ''
      if (!result.ok) {
        setImportError(result.error)
        setPendingImport(null)
        return
      }
      setImportError('')
      // Restore confirmation (plan T6): nothing is applied until confirmed.
      setPendingImport({
        state: result.state,
        mode: effectiveImportMode(demoMode, importMode),
        fileName: file.name,
      })
    }
    reader.onerror = () => setImportError('Could not read the file.')
    reader.readAsText(file)
  }

  const confirmImport = () => {
    if (!pendingImport) return
    if (pendingImport.mode === 'replace') {
      // Fully-migrated payload: replace wholesale. demoMode/onboarded come
      // from the payload itself (a demo backup truthfully restores demo state).
      dispatch({ type: 'HYDRATE', state: maybeRollover(pendingImport.state) })
    } else {
      dispatch({ type: 'IMPORT_MERGE', data: pendingImport.state })
    }
    setPendingImport(null)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Daily tasks */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Daily tasks</h2>
        <TaskDefEditor
          taskDefs={taskDefs}
          onChange={defs => dispatch({ type: 'SETTINGS_UPDATE', settings: { taskDefs: defs } })}
        />
      </section>

      {/* Screening field */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Screening field</h2>
        <ScreeningEditor
          screening={screeningConfig}
          onChange={screening => dispatch({ type: 'SETTINGS_UPDATE', settings: { screening } })}
        />
      </section>

      {/* Export / Import */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Data backup</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-start">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
            >
              Export JSON
            </button>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <label className={`flex items-center gap-1.5 text-sm ${demoMode ? 'text-gray-600' : 'text-gray-300 cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={demoMode || importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    disabled={demoMode}
                  />
                  Replace all data
                </label>
                <label className={`flex items-center gap-1.5 text-sm ${demoMode ? 'text-gray-600' : 'text-gray-300 cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={!demoMode && importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    disabled={demoMode}
                  />
                  Merge (keep existing)
                </label>
              </div>
              {demoMode && (
                <p className="text-xs text-yellow-500">
                  Demo mode: importing always replaces, so demo data can&apos;t mix into your backup.
                  Merge is available after you exit the demo.
                </p>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg font-medium transition-colors self-start"
              >
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              {importError && <p role="alert" className="text-xs text-red-400">{importError}</p>}
              {pendingImport && (
                <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 p-3 max-w-md">
                  <p className="text-sm text-yellow-200 mb-2">
                    {pendingImport.mode === 'replace'
                      ? <>Replace ALL current data with <span className="font-mono">{pendingImport.fileName}</span>? This can&apos;t be undone — consider exporting first.</>
                      : <>Merge <span className="font-mono">{pendingImport.fileName}</span> into your current data? Entries with matching ids are overwritten by the backup.</>}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmImport}
                      className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white text-sm rounded-lg font-medium"
                    >
                      {pendingImport.mode === 'replace' ? 'Yes, replace everything' : 'Yes, merge'}
                    </button>
                    <button
                      onClick={() => setPendingImport(null)}
                      className="px-3 py-1.5 border border-gray-700 text-gray-300 text-sm rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="text-lg font-semibold text-red-400 mb-3">Danger zone</h2>
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 flex flex-wrap gap-3">
          <ConfirmButton
            onConfirm={() => dispatch({ type: 'TODAY_RESET' })}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-red-400 text-sm rounded-lg font-medium transition-colors border border-red-900/50"
            confirmText="Reset today?"
          >
            Reset today's data
          </ConfirmButton>
          <ConfirmButton
            onConfirm={() => dispatch({ type: 'CLEAR_ALL' })}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-red-400 text-sm rounded-lg font-medium transition-colors border border-red-900/50"
            confirmText="Delete everything?"
            doubleConfirm
          >
            Clear ALL data
          </ConfirmButton>
        </div>
      </section>
    </div>
  )
}
