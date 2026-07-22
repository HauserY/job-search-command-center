import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useStore } from '../state/useStore'
import { isOverdue } from '../lib/dates'
import {
  sourceFunnel, effortVsYield, channelResponseRates,
  recruiterResponsePrefFromOpps, pipelineHealth, weeklyTrends, MIN_SAMPLE
} from '../lib/insights'
import { computeRetro } from '../lib/retro'
import { STAGE_LABELS } from '../state/defaults'

function RetroCard({ retro }) {
  if (!retro) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Last week</h2>
        <p className="text-sm text-gray-500">
          Your first weekly retro appears here after your first full week of tracking.
        </p>
      </div>
    )
  }
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-8">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <h2 className="text-lg font-semibold text-white">Last week</h2>
        <span className="text-xs text-gray-500 font-mono">{retro.startDate} → {retro.endDate}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Stat label="Days at 100%" value={`${retro.daysAt100}/${retro.daysTracked}`} color={retro.daysAt100 >= 5 ? 'text-green-400' : 'text-white'} />
        <Stat label="Outreach sent" value={retro.outreachSent} />
        <Stat label="Replies received" value={retro.repliesReceived} />
        <Stat
          label="Top source (new opps)"
          value={retro.topSource ? retro.topSource.source : '—'}
          sub={retro.topSource ? `${retro.topSource.count} of ${retro.newOpportunities} added` : 'no new opportunities'}
        />
      </div>

      {retro.counters.length > 0 && (
        <div className="space-y-2">
          {retro.counters.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-44 truncate" title={c.label}>{c.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.pct >= 100 ? 'bg-green-500' : c.pct >= 60 ? 'bg-blue-500' : 'bg-gray-600'}`}
                  style={{ width: `${c.pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-300 font-mono w-24 text-right">
                {c.total} / {c.weeklyTarget}{c.approximated ? '*' : ''}
              </span>
            </div>
          ))}
          {retro.counters.some(c => c.approximated) && (
            <p className="text-[11px] text-gray-600">* target approximated for days tracked before target snapshots existed</p>
          )}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ children }) {
  return <h2 className="text-lg font-semibold text-white mb-3 mt-8 first:mt-0">{children}</h2>
}

function Stat({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

function PctBadge({ pct }) {
  const color = pct >= 50 ? 'text-green-400' : pct >= 20 ? 'text-yellow-400' : 'text-gray-400'
  return <span className={`text-xs font-mono ${color}`}>{pct}%</span>
}

export default function Insights() {
  const { state } = useStore()
  const { opportunities, interactions, dailyHistory, today, settings } = state
  const taskDefs = settings.taskDefs

  const funnel = useMemo(() => sourceFunnel(opportunities), [opportunities])
  const effort = useMemo(() => effortVsYield(opportunities, dailyHistory, today.taskState, taskDefs), [opportunities, dailyHistory, today.taskState, taskDefs])
  const channelRates = useMemo(() => channelResponseRates(interactions), [interactions])
  const recruiterPrefs = useMemo(() => recruiterResponsePrefFromOpps(opportunities, interactions), [opportunities, interactions])
  const health = useMemo(() => pipelineHealth(opportunities, interactions), [opportunities, interactions])
  const trends = useMemo(() => weeklyTrends(opportunities, interactions, dailyHistory, today.taskState, taskDefs), [opportunities, interactions, dailyHistory, today.taskState, taskDefs])
  const retro = useMemo(() => computeRetro(state), [state])

  // Rates below MIN_SAMPLE are noise: the "best source" star only considers
  // sources with enough data to mean something (T10).
  const qualified = funnel.filter(r => r.created >= MIN_SAMPLE)
  const bestSource = qualified[0] || null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Weekly retro (release plan T9 — the app reflects back) */}
      <RetroCard retro={retro} />

      {/* Pipeline health summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Active opportunities" value={opportunities.filter(o => o.stage !== 'closed').length} />
        <Stat label="Overdue actions" value={opportunities.filter(o => o.stage !== 'closed' && isOverdue(o.nextActionDue)).length} color="text-red-400" />
        <Stat label="Stale (5+ days no contact)" value={health.stale.length} color="text-yellow-400" />
        <Stat label="Best source" value={bestSource?.source || '—'} sub={bestSource ? `${bestSource.overallRate}% → offer` : `needs ${MIN_SAMPLE}+ opportunities per source`} color="text-green-400" />
      </div>

      {/* Source funnel */}
      <SectionHeader>Source funnel</SectionHeader>
      {funnel.length === 0 ? (
        <p className="text-sm text-gray-600">No opportunities yet.</p>
      ) : (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="pb-2 pr-4 text-left font-medium">Source</th>
                <th className="pb-2 pr-3 text-right font-medium">Created</th>
                <th className="pb-2 pr-3 text-right font-medium">Screening</th>
                <th className="pb-2 pr-3 text-right font-medium">Submitted</th>
                <th className="pb-2 pr-3 text-right font-medium">Interview</th>
                <th className="pb-2 pr-3 text-right font-medium">Offer</th>
                <th className="pb-2 text-right font-medium">Overall %</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((row) => {
                const lowSample = row.created < MIN_SAMPLE
                const isBest = bestSource && row.source === bestSource.source
                return (
                  <tr key={row.source} className={`border-b border-gray-900 ${isBest ? 'bg-green-950/20' : ''}`}>
                    <td className="py-2 pr-4 text-gray-200 font-medium">
                      {isBest && <span className="text-xs text-green-400 mr-1">★</span>}
                      {row.source}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-300">{row.created}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-gray-300">{row.screening}</span>
                      {!lowSample && <span className="text-gray-600 text-xs ml-1">({row.screeningRate}%)</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-gray-300">{row.submitted}</span>
                      {!lowSample && <span className="text-gray-600 text-xs ml-1">({row.submittedRate}%)</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-gray-300">{row.interview}</span>
                      {!lowSample && <span className="text-gray-600 text-xs ml-1">({row.interviewRate}%)</span>}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-300">{row.offer}</td>
                    <td className="py-2 text-right">
                      {lowSample
                        ? <span className="text-xs text-gray-600" title={`Rates hidden below ${MIN_SAMPLE} opportunities`}>low sample</span>
                        : <PctBadge pct={row.overallRate} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Effort vs yield */}
      <SectionHeader>Effort vs yield (apps per conversation)</SectionHeader>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 text-left font-medium">Board</th>
              <th className="pb-2 pr-4 text-right font-medium">Apps sent</th>
              <th className="pb-2 pr-4 text-right font-medium">Opportunities</th>
              <th className="pb-2 text-right font-medium">Apps / opp</th>
            </tr>
          </thead>
          <tbody>
            {effort.map(row => (
              <tr key={row.slug} className="border-b border-gray-900">
                <td className="py-2 pr-4 text-gray-200 font-medium">{row.label}</td>
                <td className="py-2 pr-4 text-right text-gray-300">{row.apps}</td>
                <td className="py-2 pr-4 text-right text-gray-300">{row.opps}</td>
                <td className="py-2 text-right text-gray-300 font-mono">
                  {row.ratio === null ? '—' : row.ratio}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-600 mt-1">Lower = more efficient (fewer apps per conversation)</p>
      </div>

      {/* Channel response rates */}
      <SectionHeader>Contact method response rates</SectionHeader>
      {channelRates.length === 0 ? (
        <p className="text-sm text-gray-600 mb-4">Log interactions to see response rates.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {channelRates.map(c => (
            <div key={c.channel} className="bg-gray-900 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-200 mb-1">{c.channel}</div>
              <div className="text-2xl font-bold text-white">{c.rate}%</div>
              <div className="text-xs text-gray-500">{c.responded}/{c.sent} replied</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-recruiter preference */}
      {recruiterPrefs.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-gray-400 mb-2">Recruiter best channel</h3>
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4 text-left font-medium">Recruiter</th>
                  <th className="pb-2 text-left font-medium">Best channel</th>
                </tr>
              </thead>
              <tbody>
                {recruiterPrefs.map(r => (
                  <tr key={r.recruiter} className="border-b border-gray-900">
                    <td className="py-2 pr-4 text-gray-200">{r.recruiter}</td>
                    <td className="py-2 text-gray-300">{r.bestChannel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pipeline health by stage */}
      <SectionHeader>Pipeline health</SectionHeader>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4 text-left font-medium">Stage</th>
              <th className="pb-2 pr-4 text-right font-medium">Count</th>
              <th className="pb-2 text-right font-medium">Avg days in stage</th>
            </tr>
          </thead>
          <tbody>
            {health.healthByStage.map(row => (
              <tr key={row.stage} className="border-b border-gray-900">
                <td className="py-2 pr-4 text-gray-200">{STAGE_LABELS[row.stage]}</td>
                <td className="py-2 pr-4 text-right text-gray-300">{row.count}</td>
                <td className="py-2 text-right text-gray-300 font-mono">{row.avgDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {health.stale.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-yellow-500 mb-2">Stale opportunities (5+ days no contact)</h3>
          <div className="space-y-1 mb-4">
            {health.stale.map(opp => (
              <div key={opp.id} className="flex items-center gap-2 text-sm bg-yellow-950/20 border border-yellow-900/30 rounded px-3 py-1.5">
                <span className="font-medium text-gray-200">{opp.company}</span>
                {opp.role && <span className="text-gray-500">— {opp.role}</span>}
                <span className="text-gray-600 ml-auto text-xs">{STAGE_LABELS[opp.stage]}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Weekly trend chart */}
      <SectionHeader>Weekly trends</SectionHeader>
      {trends.length === 0 ? (
        <p className="text-sm text-gray-600">No data yet.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', color: '#f3f4f6', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Line type="monotone" dataKey="apps" stroke="#3b82f6" strokeWidth={2} dot={false} name="Applications" />
              <Line type="monotone" dataKey="newOpps" stroke="#8b5cf6" strokeWidth={2} dot={false} name="New opportunities" />
              <Line type="monotone" dataKey="interviews" stroke="#10b981" strokeWidth={2} dot={false} name="Interviews" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
