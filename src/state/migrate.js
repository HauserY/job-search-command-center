import { localDateKey, addDays } from '../lib/dates'
import { DEFAULT_TASK_DEFS } from './defaults'

function computeCompletionPct(taskDefs, taskState, opportunities) {
  const defs = taskDefs || DEFAULT_TASK_DEFS
  let total = 0
  let hit = 0

  for (const def of defs) {
    if (def.type === 'checkbox') {
      total++
      if (taskState[def.id]?.checked) hit++
    } else if (def.type === 'counter') {
      total++
      const count = taskState[def.id]?.count || 0
      if (count >= (def.target || 1)) hit++
    } else if (def.type === 'followups') {
      // followups: hit if overdue/due count is 0
      total++
      const today = localDateKey()
      const due = opportunities.filter(
        o => o.stage !== 'closed' && o.nextActionDue && o.nextActionDue <= today
      ).length
      if (due === 0) hit++
    }
  }

  return total === 0 ? 100 : Math.round((hit / total) * 100)
}

function computeCorePct(taskDefs, taskState, opportunities) {
  const defs = (taskDefs || DEFAULT_TASK_DEFS).filter(d => d.core)
  if (defs.length === 0) return 100
  let total = 0
  let hit = 0

  for (const def of defs) {
    if (def.type === 'checkbox') {
      total++
      if (taskState[def.id]?.checked) hit++
    } else if (def.type === 'followups') {
      total++
      const today = localDateKey()
      const due = opportunities.filter(
        o => o.stage !== 'closed' && o.nextActionDue && o.nextActionDue <= today
      ).length
      if (due === 0) hit++
    }
  }

  return total === 0 ? 100 : Math.round((hit / total) * 100)
}

export function maybeRollover(state) {
  const todayKey = localDateKey()
  if (state.today.dateKey === todayKey) return state

  const yesterdayTaskState = state.today.taskState || {}
  const completionPct = computeCompletionPct(
    state.settings.taskDefs,
    yesterdayTaskState,
    state.opportunities
  )
  const corePct = computeCorePct(
    state.settings.taskDefs,
    yesterdayTaskState,
    state.opportunities
  )

  const lastDateKey = state.today.dateKey || addDays(todayKey, -1)

  const newHistory = [...(state.dailyHistory || [])]

  // Snapshot the targets that were in force for the archived day, so the
  // weekly retro judges each week against ITS OWN targets — editing targets
  // later must never rewrite history (release plan tension T3).
  const targets = {}
  for (const def of state.settings.taskDefs || []) {
    if (def.type === 'counter') targets[def.id] = def.target || 1
  }

  // Archive the day that was "today" before rollover
  if (lastDateKey && lastDateKey < todayKey) {
    upsertHistory(newHistory, {
      dateKey: lastDateKey,
      taskState: yesterdayTaskState,
      completionPct,
      corePct,
      targets,
    })
  }

  // Backfill any fully-skipped days (no app usage) as 0% so streaks break correctly
  let cursor = addDays(lastDateKey, 1)
  while (cursor && cursor < todayKey) {
    upsertHistory(newHistory, { dateKey: cursor, taskState: {}, completionPct: 0, corePct: 0, targets })
    cursor = addDays(cursor, 1)
  }

  return {
    ...state,
    today: { dateKey: todayKey, taskState: {} },
    dailyHistory: newHistory,
  }
}

function upsertHistory(history, entry) {
  const existing = history.findIndex(h => h.dateKey === entry.dateKey)
  if (existing >= 0) {
    history[existing] = entry
  } else {
    history.push(entry)
  }
}
