// Weekly retro computation (release plan T9, cherry-pick D2.2).
//
// Spec (CEO plan + tensions T3/T4):
//   - a week is the existing weekKey() convention; "last week" = the most
//     recent COMPLETE week (strictly before the current week)
//   - counter totals are judged against SNAPSHOTTED per-day targets — each
//     day's entry carries the targets in force that day, so editing targets
//     later never rewrites history; days missing an entry borrow the nearest
//     known snapshot (fallback: current def target)
//   - outreach activity is TWO honest counts, never a same-week ratio:
//     sent = outbound interactions logged that week,
//     replies = inbound interactions logged that week
//     (bucketed by weekKey(createdAt.slice(0,10)), the weeklyTrends convention)
//   - top source = source with most new opportunities created that week

import { localDateKey, weekKey } from './dates'

const DAYS_PER_WEEK = 7

export function computeRetro(state) {
  const { dailyHistory = [], interactions = [], opportunities = [], settings } = state
  const currentWeek = weekKey(localDateKey())

  // Group history by week, pick the latest week strictly before this one.
  const byWeek = new Map()
  for (const day of dailyHistory) {
    const wk = weekKey(day.dateKey)
    if (wk >= currentWeek) continue
    if (!byWeek.has(wk)) byWeek.set(wk, [])
    byWeek.get(wk).push(day)
  }
  if (byWeek.size === 0) return null
  const week = [...byWeek.keys()].sort().pop()
  const days = byWeek.get(week).sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  const counterDefs = (settings?.taskDefs || []).filter(d => d.type === 'counter')

  const counters = counterDefs.map(def => {
    let total = 0
    let weeklyTarget = 0
    let lastKnownTarget = null
    for (const day of days) {
      total += day.taskState?.[def.id]?.count || 0
      const snap = day.targets?.[def.id]
      if (snap != null) lastKnownTarget = snap
      weeklyTarget += snap ?? lastKnownTarget ?? def.target ?? 1
    }
    // Days with no entry (app started mid-week) borrow the last known snapshot.
    const missing = DAYS_PER_WEEK - days.length
    if (missing > 0) weeklyTarget += missing * (lastKnownTarget ?? def.target ?? 1)
    const approximated = days.some(d => d.targetsApproximated) || days.some(d => !d.targets)
    return {
      id: def.id,
      label: def.label,
      total,
      weeklyTarget,
      pct: weeklyTarget > 0 ? Math.min(100, Math.round((total / weeklyTarget) * 100)) : 100,
      approximated,
    }
  })

  const inWeek = (createdAt) => createdAt && weekKey(createdAt.slice(0, 10)) === week
  const weekInteractions = interactions.filter(i => inWeek(i.createdAt))
  const outreachSent = weekInteractions.filter(i => i.direction === 'outbound').length
  const repliesReceived = weekInteractions.filter(i => i.direction === 'inbound').length

  const sourceCounts = {}
  for (const opp of opportunities) {
    if (!inWeek(opp.createdAt)) continue
    const src = opp.source || 'Other'
    sourceCounts[src] = (sourceCounts[src] || 0) + 1
  }
  const topSourceEntry = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]

  const daysAt100 = days.filter(d => d.completionPct >= 100).length
  const coreDaysAt100 = days.filter(d => d.corePct >= 100).length

  return {
    week,
    startDate: days[0].dateKey,
    endDate: days[days.length - 1].dateKey,
    daysTracked: days.length,
    counters,
    outreachSent,
    repliesReceived,
    newOpportunities: Object.values(sourceCounts).reduce((a, b) => a + b, 0),
    topSource: topSourceEntry ? { source: topSourceEntry[0], count: topSourceEntry[1] } : null,
    daysAt100,
    coreDaysAt100,
  }
}
