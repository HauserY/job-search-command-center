import { useReducer, useEffect, useRef, useCallback, useState } from 'react'
import { maybeRollover } from './migrate'
import { reducer, makeInitialState } from './reducer'
import { StoreContext } from './context'
import { loadState, save, subscribeExternal } from './persistence'
import Recovery from '../components/Recovery'

// Thin React glue over src/state/persistence.js (release plan T0).
//
//   boot: 'ok'      → normal app
//   boot: 'corrupt' → Recovery screen (quarantined raw, user chooses)
//   boot: 'newer'   → read-only notice (a newer build owns the data)
//
// All saves flow through persistence.save(); a failed save raises the
// persist-failure banner (finding 2B) instead of vanishing.

function boot() {
  const result = loadState()
  if (result.status === 'ok') return { kind: 'ok', state: maybeRollover(result.state) }
  if (result.status === 'fresh') return { kind: 'ok', state: makeInitialState() }
  return { kind: result.status, state: makeInitialState(), raw: result.raw, quarantineKey: result.quarantineKey }
}

function isEditableFocused() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function StoreProvider({ children }) {
  const [booted] = useState(boot)
  const [mode, setMode] = useState(booted.kind) // 'ok' | 'corrupt' | 'newer'
  const [persistFailed, setPersistFailed] = useState(false)
  const [state, dispatch] = useReducer(reducer, booted.state)
  const debounceRef = useRef(null)

  const persist = useCallback((s) => {
    // No writes until the user resolves a corrupt/newer boot — overwriting
    // the stored payload before they choose is exactly the old silent-wipe bug.
    if (mode !== 'ok') return
    const result = save(s)
    if (result.ok) {
      setPersistFailed(false)
    } else if (result.reason === 'newer') {
      setMode('newer')
    } else {
      console.error('jscc: failed to persist state', result.error)
      setPersistFailed(true)
    }
  }, [mode])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(state), 400)
  }, [state, persist])

  // Flush on unload
  useEffect(() => {
    const flush = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      persist(state)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [state, persist])

  // Rollover on focus
  useEffect(() => {
    const onFocus = () => dispatch({ type: 'ROLLOVER' })
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // Cross-context sync (finding 4B): another tab/PWA wrote — re-hydrate,
  // deferring while the user is mid-typing here (retry until idle).
  useEffect(() => {
    let retryTimer = null
    const applyExternal = (externalState) => {
      if (isEditableFocused()) {
        if (retryTimer) clearTimeout(retryTimer)
        retryTimer = setTimeout(() => applyExternal(externalState), 1000)
        return
      }
      dispatch({ type: 'HYDRATE', state: maybeRollover(externalState) })
    }
    const unsubscribe = subscribeExternal(applyExternal)
    return () => {
      if (retryTimer) clearTimeout(retryTimer)
      unsubscribe()
    }
  }, [])

  if (mode === 'corrupt') {
    return (
      <Recovery
        raw={booted.raw}
        quarantineKey={booted.quarantineKey}
        onStartFresh={() => setMode('ok')}
        onImport={(importedState) => {
          dispatch({ type: 'HYDRATE', state: maybeRollover(importedState) })
          setMode('ok')
        }}
      />
    )
  }

  return (
    <StoreContext.Provider value={{ state, dispatch, persistFailed }}>
      {mode === 'newer' && (
        <div role="alert" style={{
          background: '#7c2d12', color: '#fff', padding: '10px 16px',
          textAlign: 'center', fontSize: 14, position: 'sticky', top: 0, zIndex: 100,
        }}>
          A newer version of this app saved your data. Refresh to update — changes here are not being saved.
        </div>
      )}
      {persistFailed && (
        <div role="alert" aria-live="assertive" style={{
          background: '#991b1b', color: '#fff', padding: '10px 16px',
          textAlign: 'center', fontSize: 14, position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        }}>
          <span>Your changes aren&apos;t being saved — export your data now.</span>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `jscc-emergency-backup-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(a.href)
            }}
            style={{
              background: '#fff', color: '#991b1b', border: 'none', borderRadius: 6,
              padding: '4px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Export JSON
          </button>
        </div>
      )}
      {children}
    </StoreContext.Provider>
  )
}
