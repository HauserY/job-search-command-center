import { STAGES, TASK_SOURCE_MAP } from '../state/defaults'
import { localDateKey, weekKey } from './dates'

// Conversion rates on fewer data points than this are noise, not insight —
// hide/qualify them (release plan T10; implementer-tunable constant).
export const MIN_SAMPLE = 5

const STAGE_IDX = Object.fromEntries(STAGES.map((s, i) => [s, i]))

export function sourceFunnel(opportunities) {
  const map = {}
  for (const opp of opportunities) {
    const src = opp.source || 'Other'
    if (!map[src]) map[src] = { source: src, created: 0, screening: 0, submitted: 0, interview: 0, offer: 0 }
    const m = map[src]
    m.created++
    const maxIdx = opp.maxStageIndex || STAGE_IDX[opp.stage] || 0
    if (maxIdx >= STAGE_IDX['screening']) m.screening++
    if (maxIdx >= STAGE_IDX['submitted']) m.submitted++
    if (maxIdx >= STAGE_IDX['manager-interview']) m.interview++
    if (maxIdx >= STAGE_IDX['offer']) m.offer++
  }

  const rows = Object.values(map).map(r => ({
    ...r,
    screeningRate: r.created ? Math.round((r.screening / r.created) * 100) : 0,
    submittedRate: r.screening ? Math.round((r.submitted / r.screening) * 100) : 0,
    interviewRate: r.submitted ? Math.round((r.interview / r.submitted) * 100) : 0,
    offerRate: r.interview ? Math.round((r.offer / r.interview) * 100) : 0,
    overallRate: r.created ? Math.round((r.offer / r.created) * 100) : 0,
  }))

  rows.sort((a, b) => b.overallRate - a.overallRate || b.created - a.created)
  return rows
}

export function effortVsYield(opportunities, dailyHistory, todayState, taskDefs) {
  // Sum counter totals per source slug from history + today
  const totals = {}
  const allDays = [
    ...dailyHistory,
    { taskState: todayState },
  ]
  for (const day of allDays) {
    const ts = day.taskState || {}
    for (const def of (taskDefs || [])) {
      if (def.type === 'counter' && def.source) {
        totals[def.source] = (totals[def.source] || 0) + (ts[def.id]?.count || 0)
      }
    }
  }

  return Object.entries(TASK_SOURCE_MAP).map(([slug, sources]) => {
    const apps = totals[slug] || 0
    const opps = opportunities.filter(o => sources.includes(o.source)).length
    return {
      slug,
      label: sources[0],
      apps,
      opps,
      ratio: opps === 0 ? null : Math.round(apps / opps),
    }
  })
}

export function channelResponseRates(interactions) {
  const channels = {}
  for (const i of interactions) {
    if (i.direction !== 'outbound') continue
    const ch = i.channel
    if (!channels[ch]) channels[ch] = { channel: ch, sent: 0, responded: 0 }
    channels[ch].sent++
    if (i.response === 'yes') channels[ch].responded++
  }
  return Object.values(channels).map(c => ({
    ...c,
    rate: c.sent ? Math.round((c.responded / c.sent) * 100) : 0,
  })).sort((a, b) => b.rate - a.rate)
}

export function recruiterResponsePrefFromOpps(opportunities, interactions) {
  // Build recruiter name → opportunity IDs
  const interactionsByOpp = {}
  for (const i of interactions) {
    if (!interactionsByOpp[i.opportunityId]) interactionsByOpp[i.opportunityId] = []
    interactionsByOpp[i.opportunityId].push(i)
  }

  const byRecruiter = {}
  for (const opp of opportunities) {
    if (!opp.recruiterName) continue
    const r = opp.recruiterName
    if (!byRecruiter[r]) byRecruiter[r] = {}
    for (const i of (interactionsByOpp[opp.id] || [])) {
      if (i.direction !== 'outbound') continue
      const ch = i.channel
      if (!byRecruiter[r][ch]) byRecruiter[r][ch] = { sent: 0, responded: 0 }
      byRecruiter[r][ch].sent++
      if (i.response === 'yes') byRecruiter[r][ch].responded++
    }
  }

  return Object.entries(byRecruiter).map(([recruiter, channels]) => {
    const best = Object.entries(channels)
      .filter(([, c]) => c.sent > 0)
      .sort((a, b) => (b[1].responded / b[1].sent) - (a[1].responded / a[1].sent))[0]
    return { recruiter, bestChannel: best ? best[0] : null }
  }).filter(r => r.bestChannel)
}

export function pipelineHealth(opportunities, interactions) {
  const stageCounts = {}
  const stageDays = {}
  for (const s of STAGES) { stageCounts[s] = 0; stageDays[s] = [] }

  for (const opp of opportunities) {
    if (opp.stage === 'closed') continue
    stageCounts[opp.stage] = (stageCounts[opp.stage] || 0) + 1
    if (opp.stageEnteredAt) {
      const days = Math.floor((new Date() - new Date(opp.stageEnteredAt)) / 86400000)
      stageDays[opp.stage] = [...(stageDays[opp.stage] || []), days]
    }
  }

  // Last interaction per opportunity
  const lastInteraction = {}
  for (const i of interactions) {
    const prev = lastInteraction[i.opportunityId]
    if (!prev || i.createdAt > prev) lastInteraction[i.opportunityId] = i.createdAt
  }

  const stale = opportunities.filter(opp => {
    if (opp.stage === 'closed') return false
    const last = lastInteraction[opp.id]
    if (!last) {
      // No interactions at all — stale if created >5 days ago
      const created = opp.createdAt ? Math.floor((new Date() - new Date(opp.createdAt)) / 86400000) : 0
      return created >= 5
    }
    const daysSince = Math.floor((new Date() - new Date(last)) / 86400000)
    return daysSince >= 5
  })

  const healthByStage = STAGES.filter(s => s !== 'closed').map(s => ({
    stage: s,
    count: stageCounts[s] || 0,
    avgDays: stageDays[s]?.length
      ? Math.round(stageDays[s].reduce((a, b) => a + b, 0) / stageDays[s].length)
      : 0,
  }))

  return { healthByStage, stale }
}

export function weeklyTrends(opportunities, interactions, dailyHistory, todayState, taskDefs) {
  const weeks = {}

  const addToWeek = (dateKey, key, val = 1) => {
    const wk = weekKey(dateKey)
    if (!weeks[wk]) weeks[wk] = { week: wk, apps: 0, newOpps: 0, interviews: 0 }
    weeks[wk][key] = (weeks[wk][key] || 0) + val
  }

  // Applications from daily history + today
  const allDays = [...dailyHistory, { dateKey: localDateKey(), taskState: todayState || {} }]
  for (const day of allDays) {
    const ts = day.taskState || {}
    let dayApps = 0
    for (const def of (taskDefs || [])) {
      if (def.type === 'counter' && def.source) {
        dayApps += ts[def.id]?.count || 0
      }
    }
    if (dayApps > 0 && day.dateKey) addToWeek(day.dateKey, 'apps', dayApps)
  }

  // New opportunities
  for (const opp of opportunities) {
    if (opp.createdAt) {
      addToWeek(opp.createdAt.slice(0, 10), 'newOpps')
    }
  }

  // Interviews — bucket by the date the opportunity FIRST reached an interview
  // stage, not its current stage, so later progress doesn't move it in the chart.
  // Older records predating stageHistory fall back to stageEnteredAt.
  for (const opp of opportunities) {
    if ((opp.maxStageIndex || 0) >= STAGES.indexOf('manager-interview')) {
      const interviewDate = opp.stageHistory?.['manager-interview'] || opp.stageHistory?.['technical-interview'] || opp.stageEnteredAt
      if (interviewDate) addToWeek(interviewDate.slice(0, 10), 'interviews')
    }
  }

  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week)).slice(-12)
}
