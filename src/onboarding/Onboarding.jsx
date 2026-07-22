import { useRef, useState } from 'react'
import { parseBackup } from '../lib/backup'

// First-run onboarding (approved wireframe D12):
//   headline sells BEHAVIOR, privacy is the trust line beneath it,
//   primary CTA = demo data, secondary = start empty,
//   and a static Today-tab preview does the pitching before any click.
// Fully keyboard-operable: three native buttons in tab order (11B baseline).

function PreviewRing({ pct, label, color }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
        <circle cx="34" cy="34" r={r} fill="none" stroke="#1f2937" strokeWidth="7" />
        <circle
          cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round"
          transform="rotate(-90 34 34)"
        />
        <text x="34" y="39" textAnchor="middle" fill="#f3f4f6" fontSize="15" fontWeight="700">{pct}%</text>
      </svg>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  )
}

function TodayPreview() {
  const heat = [3, 4, 4, 2, 4, 1, 0, 4, 4, 3, 4, 4, 2, 1, 4, 4, 4, 3, 4, 2, 1, 4, 3, 4, 4, 4, 2, 0]
  const heatColor = ['bg-gray-800', 'bg-blue-900', 'bg-blue-700', 'bg-blue-500', 'bg-green-500']
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 select-none" aria-hidden="true">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white">Today</span>
        <span className="text-xs text-orange-400 font-medium">🔥 12-day streak</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span className="w-3.5 h-3.5 rounded bg-green-600 grid place-items-center text-[9px] text-white">✓</span>
          Reply to ALL recruiter messages
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span className="w-3.5 h-3.5 rounded border border-gray-600" />
          LinkedIn applications
          <span className="ml-auto rounded-full bg-blue-950 border border-blue-800 px-2 py-0.5 text-[10px] text-blue-300">18 / 25</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-300">
          <span className="w-3.5 h-3.5 rounded border border-gray-600" />
          Proactive recruiter messages
          <span className="ml-auto rounded-full bg-blue-950 border border-blue-800 px-2 py-0.5 text-[10px] text-blue-300">4 / 5</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <PreviewRing pct={72} label="All" color="#3b82f6" />
          <PreviewRing pct={100} label="Core" color="#22c55e" />
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {heat.map((h, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-sm ${heatColor[h]}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Onboarding({ onDemo, onEmpty, onImport }) {
  const fileRef = useRef(null)
  const [error, setError] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseBackup(reader.result)
      if (!result.ok) { setError(result.error); return }
      onImport(result.state)
    }
    reader.onerror = () => setError('Could not read the file.')
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: '#030712', color: '#f3f4f6' }}>
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold text-white leading-tight mb-2">
          Show up for your job search, every day.
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Daily targets, streaks, and follow-up discipline — all stored in your browser.
          No account. No server. The app contains no analytics or tracking code.
        </p>

        <div className="mb-6">
          <TodayPreview />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onDemo}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 text-white font-semibold py-3 text-sm"
          >
            Start with demo data
          </button>
          <button
            onClick={onEmpty}
            className="w-full rounded-lg border border-gray-700 hover:border-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 text-gray-200 font-medium py-3 text-sm"
          >
            Start empty
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs text-gray-500 hover:text-gray-300 underline underline-offset-2 self-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            or restore from a backup file
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  )
}
