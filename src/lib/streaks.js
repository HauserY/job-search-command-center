// Task completion + streak math, extracted from Today.jsx so the weekly
// retro card can reuse it without duplication (release plan T9).

import { localDateKey } from './dates'

export function computeTaskCompletion(def, taskState, opportunities) {
  if (def.type === 'checkbox') {
    return { done: !!taskState[def.id]?.checked, pct: taskState[def.id]?.checked ? 100 : 0 }
  }
  if (def.type === 'counter') {
    const count = taskState[def.id]?.count || 0
    const target = def.target || 1
    return { done: count >= target, pct: Math.min(100, Math.round((count / target) * 100)) }
  }
  if (def.type === 'followups') {
    const today = localDateKey()
    const due = opportunities.filter(
      o => o.stage !== 'closed' && o.nextActionDue && o.nextActionDue <= today
    ).length
    return { done: due === 0, pct: due === 0 ? 100 : 0, liveCount: due }
  }
  return { done: false, pct: 0 }
}

export function computeOverallPct(taskDefs, taskState, opportunities) {
  let total = 0, hit = 0
  for (const def of taskDefs) {
    total++
    const { done } = computeTaskCompletion(def, taskState, opportunities)
    if (done) hit++
  }
  return total === 0 ? 100 : Math.round((hit / total) * 100)
}

export function computeCorePct(taskDefs, taskState, opportunities) {
  const coreDefs = taskDefs.filter(d => d.core)
  let total = 0, hit = 0
  for (const def of coreDefs) {
    total++
    const { done } = computeTaskCompletion(def, taskState, opportunities)
    if (done) hit++
  }
  return total === 0 ? 100 : Math.round((hit / total) * 100)
}

export function computeStreaks(dailyHistory, taskDefs, taskState, opportunities) {
  // Walk history backwards (yesterday first), count consecutive days at 100%
  const sorted = [...dailyHistory].sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  const todayFull = computeOverallPct(taskDefs, taskState, opportunities) >= 100
  const todayCore = computeCorePct(taskDefs, taskState, opportunities) >= 100

  let fullStreak = todayFull ? 1 : 0
  let coreStreak = todayCore ? 1 : 0
  let fullCounting = todayFull
  let coreCounting = todayCore

  for (const day of sorted) {
    if (fullCounting && day.completionPct >= 100) fullStreak++
    else fullCounting = false
    if (coreCounting && day.corePct >= 100) coreStreak++
    else coreCounting = false
    if (!fullCounting && !coreCounting) break
  }

  return { fullStreak, coreStreak }
}
