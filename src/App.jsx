import { useEffect, useState, lazy, Suspense } from 'react'
import { StoreProvider } from './state/store'
import { useStore } from './state/useStore'
import { maybeRollover } from './state/migrate'
import { isOverdue, isDueToday } from './lib/dates'
import Today from './tabs/Today'
import Pipeline from './tabs/Pipeline'
import Recruiters from './tabs/Recruiters'
import Settings from './tabs/Settings'
import Onboarding from './onboarding/Onboarding'
import DemoBanner from './onboarding/DemoBanner'
import { makeDemoState } from './onboarding/demoData'

// Insights carries recharts (>500 kB) — lazy-loaded so a first-time demo
// visitor's initial paint never pays for a tab they haven't opened (finding 7A).
const Insights = lazy(() => import('./tabs/Insights'))

const TABS = [
  { id: 'today', label: 'Today', shortcut: '1' },
  { id: 'pipeline', label: 'Pipeline', shortcut: '2' },
  { id: 'insights', label: 'Insights', shortcut: '3' },
  { id: 'recruiters', label: 'Recruiters', shortcut: '4' },
  { id: 'settings', label: 'Settings', shortcut: '5' },
]

function AppInner() {
  const { state, dispatch } = useStore()
  const [activeTab, setActiveTab] = useState('today')

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
      if (e.key === '1') setActiveTab('today')
      if (e.key === '2') setActiveTab('pipeline')
      if (e.key === '3') setActiveTab('insights')
      if (e.key === '4') setActiveTab('recruiters')
      if (e.key === '5') setActiveTab('settings')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const overdueCount = state.opportunities.filter(
    o => o.stage !== 'closed' && isOverdue(o.nextActionDue)
  ).length

  const recruiterDueCount = state.recruiters.filter(
    r => r.status === 'active' && (isOverdue(r.nextFollowUpDue) || isDueToday(r.nextFollowUpDue))
  ).length

  if (!state.onboarded) {
    return (
      <Onboarding
        onDemo={() => dispatch({ type: 'ONBOARD_DEMO', demoState: makeDemoState() })}
        onEmpty={() => dispatch({ type: 'ONBOARD_EMPTY' })}
        onImport={(imported) => dispatch({ type: 'HYDRATE', state: maybeRollover(imported) })}
      />
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#030712', color: '#f3f4f6' }}>
      {state.demoMode && <DemoBanner state={state} dispatch={dispatch} />}
      <nav style={{ background: 'rgba(3,7,18,0.95)', borderBottom: '1px solid #1f2937', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', marginRight: 12 }} className="hidden-mobile">JSCC</span>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '12px 12px',
                fontSize: 14,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#fff' : '#6b7280',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
              {tab.id === 'pipeline' && overdueCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%', background: '#dc2626',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                }}>
                  {overdueCount > 9 ? '9+' : overdueCount}
                </span>
              )}
              {tab.id === 'recruiters' && recruiterDueCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: '50%', background: '#dc2626',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                }}>
                  {recruiterDueCount > 9 ? '9+' : recruiterDueCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {activeTab === 'today' && <Today />}
        {activeTab === 'pipeline' && <Pipeline />}
        {activeTab === 'insights' && (
          <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-10 text-sm text-gray-500">Loading insights…</div>}>
            <Insights />
          </Suspense>
        )}
        {activeTab === 'recruiters' && <Recruiters />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  )
}
