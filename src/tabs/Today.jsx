import { useMemo } from 'react'
import { useStore } from '../state/useStore'
import { localDateKey, getDaysInRange, addDays, weekKey } from '../lib/dates'
import { computeTaskCompletion, computeOverallPct, computeCorePct, computeStreaks } from '../lib/streaks'
import Counter from '../components/Counter'
import ProgressRing from '../components/ProgressRing'

// Calendar heatmap: last 26 weeks
function HeatmapCalendar({ dailyHistory }) {
  const today = localDateKey()
  const endDate = today
  const startDate = addDays(today, -181) // ~26 weeks back

  const histMap = useMemo(() => {
    const m = {}
    for (const d of dailyHistory) m[d.dateKey] = d.completionPct
    return m
  }, [dailyHistory])

  const days = getDaysInRange(startDate, endDate)

  // Group by week
  const weekGroups = useMemo(() => {
    const groups = {}
    for (const day of days) {
      const wk = weekKey(day)
      if (!groups[wk]) groups[wk] = []
      groups[wk].push(day)
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [days])

  const getColor = (pct) => {
    if (pct === undefined) return 'bg-gray-800'
    if (pct === 0) return 'bg-gray-700'
    if (pct < 50) return 'bg-blue-900'
    if (pct < 80) return 'bg-blue-700'
    if (pct < 100) return 'bg-blue-500'
    return 'bg-green-500'
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-1">
        {weekGroups.map(([wk, weekDays]) => (
          <div key={wk} className="flex flex-col gap-1">
            {weekDays.map(day => {
              const pct = histMap[day]
              return (
                <div
                  key={day}
                  title={`${day}: ${pct !== undefined ? pct + '%' : 'No data'}`}
                  className={`w-3 h-3 rounded-sm ${getColor(pct)} cursor-default`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>Less</span>
        {['bg-gray-700', 'bg-blue-900', 'bg-blue-700', 'bg-blue-500', 'bg-green-500'].map(c => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More / 100%</span>
      </div>
    </div>
  )
}

function WeeklyTable({ dailyHistory, taskDefs }) {
  const counterDefs = taskDefs.filter(d => d.type === 'counter')

  // Group by week
  const byWeek = useMemo(() => {
    const weeks = {}
    for (const day of dailyHistory) {
      const wk = weekKey(day.dateKey)
      if (!weeks[wk]) weeks[wk] = { week: wk }
      for (const def of counterDefs) {
        weeks[wk][def.id] = (weeks[wk][def.id] || 0) + (day.taskState[def.id]?.count || 0)
      }
    }
    return Object.values(weeks).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 8)
  }, [dailyHistory, counterDefs])

  if (counterDefs.length === 0 || byWeek.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4 font-medium">Week</th>
            {counterDefs.map(d => (
              <th key={d.id} className="pb-2 pr-4 font-medium whitespace-nowrap">{d.label.split(' ')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {byWeek.map(wk => (
            <tr key={wk.week} className="border-b border-gray-900 hover:bg-gray-900/50">
              <td className="py-1.5 pr-4 text-gray-400 font-mono text-xs">{wk.week}</td>
              {counterDefs.map(d => (
                <td key={d.id} className="py-1.5 pr-4 text-gray-200">{wk[d.id] || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DailyTable({ dailyHistory, taskDefs, todayTaskState }) {
  const counterDefs = taskDefs.filter(d => d.type === 'counter')

  const days = useMemo(() => {
    const sorted = [...dailyHistory].sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 13)
    return [{ dateKey: 'Today', taskState: todayTaskState, isToday: true }, ...sorted]
  }, [dailyHistory, todayTaskState])

  if (counterDefs.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="pb-2 pr-4 font-medium">Day</th>
            {counterDefs.map(d => (
              <th key={d.id} className="pb-2 pr-4 font-medium whitespace-nowrap">{d.label.split(' ')[0]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day.dateKey} className="border-b border-gray-900 hover:bg-gray-900/50">
              <td className={`py-1.5 pr-4 font-mono text-xs ${day.isToday ? 'text-blue-400' : 'text-gray-400'}`}>
                {day.dateKey}
              </td>
              {counterDefs.map(d => (
                <td key={d.id} className="py-1.5 pr-4 text-gray-200">{day.taskState[d.id]?.count || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Today() {
  const { state, dispatch } = useStore()
  const { settings, today, dailyHistory, opportunities } = state
  const taskDefs = useMemo(
    () => [...settings.taskDefs].sort((a, b) => a.order - b.order),
    [settings.taskDefs]
  )
  const taskState = useMemo(() => today.taskState || {}, [today.taskState])

  const overallPct = computeOverallPct(taskDefs, taskState, opportunities)
  const corePct = computeCorePct(taskDefs, taskState, opportunities)
  const { fullStreak, coreStreak } = useMemo(
    () => computeStreaks(dailyHistory, taskDefs, taskState, opportunities),
    [dailyHistory, taskDefs, taskState, opportunities]
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Today</h1>
          <p className="text-gray-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-center">
            <ProgressRing pct={overallPct} size={72} stroke={7} label="All" />
          </div>
          <div className="text-center">
            <ProgressRing pct={corePct} size={72} stroke={7} label="Core" color="#a855f7" />
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-gray-900 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold text-white">{fullStreak} day{fullStreak !== 1 ? 's' : ''}</div>
            <div className="text-xs text-gray-400">Full streak</div>
          </div>
        </div>
        <div className="flex-1 bg-gray-900 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <div className="text-lg font-bold text-white">{coreStreak} day{coreStreak !== 1 ? 's' : ''}</div>
            <div className="text-xs text-gray-400">Core streak</div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-2">
        {taskDefs.map(def => {
          const { done, pct, liveCount } = computeTaskCompletion(def, taskState, opportunities)
          const ts = taskState[def.id] || {}

          return (
            <div
              key={def.id}
              className={`rounded-lg border p-4 transition-colors ${
                done
                  ? 'bg-gray-900/50 border-green-900/50'
                  : 'bg-gray-900 border-gray-800'
              }`}
            >
              {def.type === 'checkbox' && (
                <div className="flex items-center gap-3">
                  <button
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      ts.checked
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                    onClick={() => dispatch({ type: 'TODAY_TOGGLE_CHECK', taskId: def.id })}
                    aria-label={ts.checked ? 'Uncheck' : 'Check'}
                  >
                    {ts.checked && <span className="text-white text-sm">✓</span>}
                  </button>
                  <span className={`text-sm font-medium ${ts.checked ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                    {def.label}
                    {def.core && <span className="ml-2 text-xs text-purple-400 font-normal">core</span>}
                  </span>
                </div>
              )}

              {def.type === 'followups' && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      done ? 'bg-green-600 border-green-600' : 'border-red-600'
                    }`}>
                      {done
                        ? <span className="text-white text-sm">✓</span>
                        : <span className="text-red-400 text-xs font-bold">{liveCount}</span>
                      }
                    </div>
                    <span className={`text-sm font-medium ${done ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                      {def.label}
                      <span className="ml-2 text-xs text-purple-400 font-normal">core</span>
                    </span>
                  </div>
                  {liveCount > 0 && (
                    <span className="text-xs text-red-400 bg-red-950/50 px-2 py-0.5 rounded-full">
                      {liveCount} overdue/due
                    </span>
                  )}
                </div>
              )}

              {def.type === 'counter' && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${done ? 'text-green-400' : 'text-gray-100'}`}>
                        {def.label}
                      </span>
                    </div>
                    {def.target && (
                      <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-1 rounded-full transition-all ${done ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {def.target && (
                      <span className="text-xs text-gray-500">/ {def.target}</span>
                    )}
                    <Counter
                      value={ts.count || 0}
                      onChange={count => dispatch({ type: 'TODAY_SET_COUNT', taskId: def.id, count })}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">History</h2>
        <HeatmapCalendar dailyHistory={dailyHistory} />
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Daily totals</h3>
          <DailyTable dailyHistory={dailyHistory} taskDefs={taskDefs} todayTaskState={taskState} />
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Weekly totals</h3>
          <WeeklyTable dailyHistory={dailyHistory} taskDefs={taskDefs} />
          {dailyHistory.length === 0 && (
            <p className="text-sm text-gray-600">No history yet — data starts accumulating after your first day rollover.</p>
          )}
        </div>
      </div>
    </div>
  )
}
