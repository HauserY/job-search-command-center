export function localDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateKey, n) {
  const d = new Date(dateKey + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localDateKey(d)
}

export function weekKey(dateKey) {
  const d = new Date(dateKey + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return localDateKey(d)
}

export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db - da) / 86400000)
}

export function formatDate(dateKey) {
  if (!dateKey) return ''
  const d = new Date(dateKey + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function isOverdue(dateKey) {
  if (!dateKey) return false
  return dateKey < localDateKey()
}

export function isDueToday(dateKey) {
  if (!dateKey) return false
  return dateKey === localDateKey()
}

export function getLast26Weeks() {
  const weeks = []
  for (let i = 25; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    weeks.push(weekKey(localDateKey(d)))
  }
  return [...new Set(weeks)]
}

export function getDaysInRange(startKey, endKey) {
  const days = []
  let cur = startKey
  while (cur <= endKey) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}
