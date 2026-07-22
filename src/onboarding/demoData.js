// Demo dataset (release plan T7). Entirely fictional — the sanitization gate
// requires all sample content to come from here, never from real data.
// Requirement (spec review iter 3): ≥2 weeks of dailyHistory plus enough
// opportunities/interactions to populate every Insights card and a non-empty
// retro card (at least one complete prior week).

import { localDateKey, addDays } from '../lib/dates'
import { DEFAULT_TASK_DEFS, DEFAULT_SCREENING } from '../state/defaults'
import { CURRENT_SCHEMA_VERSION } from '../state/migrations'

const daysAgo = (n) => addDays(localDateKey(), -n)
const iso = (n, h = 12) => new Date(Date.now() - n * 86400000 - (24 - h) * 3600000).toISOString()

export function makeDemoState() {
  const taskDefs = DEFAULT_TASK_DEFS
  const counterDefs = taskDefs.filter(d => d.type === 'counter')
  const targets = {}
  for (const d of counterDefs) targets[d.id] = d.target || 1

  // 21 days of history with a believable rhythm: strong weekdays, patchy
  // weekends, one broken streak — the heatmap and streaks should look lived-in.
  const dailyHistory = []
  for (let n = 21; n >= 1; n--) {
    const date = new Date()
    date.setDate(date.getDate() - n)
    const dow = date.getDay()
    const weekend = dow === 0 || dow === 6
    const slump = n === 9 || n === 8 // a two-day dip mid-run
    const effort = slump ? 0 : weekend ? 0.4 : n % 5 === 0 ? 0.8 : 1

    const taskState = {}
    for (const d of taskDefs) {
      if (d.type === 'checkbox') taskState[d.id] = { checked: effort >= 0.8 }
      if (d.type === 'counter') taskState[d.id] = { count: Math.round((d.target || 1) * effort) }
    }
    dailyHistory.push({
      dateKey: daysAgo(n),
      taskState,
      completionPct: Math.round(effort * 100),
      corePct: effort >= 0.8 ? 100 : effort > 0 ? 50 : 0,
      targets,
    })
  }

  // Field values MUST come from the app's real vocabulary (STAGES,
  // ENGAGEMENT_TYPES, REMOTE_STATUSES, RESUME_VERSIONS, SOURCES) — invalid
  // values crashed the Kanban once already. Vocabulary is enforced by tests
  // in onboarding.test.jsx.
  const opportunities = [
    { id: 'demo-opp-1', company: 'Northwind Cloud', role: 'Platform Engineer', stage: 'technical-interview', halalStatus: 'permissible', source: 'LinkedIn apply (external)', engagementType: 'Contract', rate: '$72/hr', remoteStatus: 'Remote', recruiterName: 'Dana Whitfield', recruiterAgency: 'Beacon Talent', resumeVersion: 'Azure', techTags: ['react', 'node', 'azure'], nextAction: 'Prep system design round', nextActionDue: daysAgo(-1), createdAt: iso(16) },
    { id: 'demo-opp-2', company: 'Juniper Analytics', role: 'Frontend Engineer', stage: 'submitted', halalStatus: 'permissible', source: 'Dice', engagementType: 'Contract-to-hire', rate: '$68/hr', remoteStatus: 'Remote', recruiterName: 'Marcus Bell', recruiterAgency: 'Bell & Rowe', resumeVersion: 'Custom', techTags: ['react', 'typescript'], nextAction: 'Follow up on submission', nextActionDue: daysAgo(0), createdAt: iso(11) },
    { id: 'demo-opp-3', company: 'Harborline Systems', role: 'Full-Stack Developer', stage: 'screening', halalStatus: 'needs-review', source: 'ZipRecruiter', engagementType: 'Contract', rate: '$65/hr', remoteStatus: 'Onsite', recruiterName: 'Priya Nair', recruiterAgency: 'TalentSpring', resumeVersion: 'AWS', techTags: ['node', 'postgres'], nextAction: 'Confirm onsite policy', nextActionDue: daysAgo(-2), createdAt: iso(8) },
    { id: 'demo-opp-4', company: 'Copperleaf Health', role: 'React Developer', stage: 'new', halalStatus: 'permissible', source: 'Hiring.cafe', engagementType: 'Direct hire', rate: '$60/hr', remoteStatus: 'Remote', recruiterName: '', recruiterAgency: '', resumeVersion: 'Custom', techTags: ['react'], nextAction: 'Send tailored application', nextActionDue: daysAgo(-3), createdAt: iso(4) },
    { id: 'demo-opp-5', company: 'Atlas Freight Tech', role: 'Software Engineer II', stage: 'manager-interview', halalStatus: 'permissible', source: 'Recruiter inbound — LinkedIn', engagementType: 'Contract', rate: '$70/hr', remoteStatus: 'Hybrid', recruiterName: 'Dana Whitfield', recruiterAgency: 'Beacon Talent', resumeVersion: 'Azure', techTags: ['react', 'node'], nextAction: 'Thank-you note + availability', nextActionDue: daysAgo(0), createdAt: iso(13) },
    { id: 'demo-opp-6', company: 'Quartz Ledger', role: 'UI Engineer', stage: 'closed', closedReason: 'Rejected', halalStatus: 'permissible', source: 'Dice', engagementType: 'Contract', rate: '$62/hr', remoteStatus: 'Remote', recruiterName: 'Marcus Bell', recruiterAgency: 'Bell & Rowe', resumeVersion: 'Custom', techTags: ['react'], createdAt: iso(19) },
    { id: 'demo-opp-7', company: 'Brightpath Learning', role: 'Frontend Engineer', stage: 'closed', closedReason: 'Won offer', halalStatus: 'permissible', source: 'Referral', engagementType: 'Contract-to-hire', rate: '$75/hr', remoteStatus: 'Remote', recruiterName: 'Dana Whitfield', recruiterAgency: 'Beacon Talent', resumeVersion: 'Azure', techTags: ['react'], createdAt: iso(20) },
  ]

  const interactions = [
    { id: 'demo-int-1', opportunityId: 'demo-opp-1', channel: 'Call', direction: 'inbound', note: 'Tech screen scheduled', response: 'yes', createdAt: iso(3) },
    { id: 'demo-int-2', opportunityId: 'demo-opp-1', channel: 'Email', direction: 'outbound', note: 'Sent availability', response: 'yes', createdAt: iso(5) },
    { id: 'demo-int-3', opportunityId: 'demo-opp-2', channel: 'LinkedIn DM', direction: 'outbound', note: 'Checked on submission', response: 'no', createdAt: iso(2) },
    { id: 'demo-int-4', opportunityId: 'demo-opp-3', channel: 'Email', direction: 'inbound', note: 'Screening questions received', response: 'yes', createdAt: iso(6) },
    { id: 'demo-int-5', opportunityId: 'demo-opp-5', channel: 'Video interview', direction: 'inbound', note: 'Manager round went well', response: 'yes', createdAt: iso(1) },
    { id: 'demo-int-6', opportunityId: 'demo-opp-6', channel: 'Email', direction: 'outbound', note: 'Asked for feedback', response: 'no', createdAt: iso(12) },
  ]

  const recruiters = [
    { id: 'demo-rec-1', name: 'Dana Whitfield', agency: 'Beacon Talent', status: 'active', notes: 'Two active submissions — strong cloud pipeline', cadenceDays: 7, lastContactAt: iso(2), nextFollowUpDue: daysAgo(-5), createdAt: iso(20) },
    { id: 'demo-rec-2', name: 'Marcus Bell', agency: 'Bell & Rowe', status: 'active', notes: 'Prefers LinkedIn DMs', cadenceDays: 7, lastContactAt: iso(9), nextFollowUpDue: daysAgo(2), createdAt: iso(18) },
    { id: 'demo-rec-3', name: 'Priya Nair', agency: 'TalentSpring', status: 'paused', notes: 'On leave until next month', cadenceDays: 14, lastContactAt: iso(15), nextFollowUpDue: daysAgo(-10), createdAt: iso(15) },
  ]

  const recruiterContacts = [
    { id: 'demo-rc-1', recruiterId: 'demo-rec-1', channel: 'Call', note: 'Weekly sync', createdAt: iso(2) },
    { id: 'demo-rc-2', recruiterId: 'demo-rec-2', channel: 'LinkedIn DM', note: 'Pinged about new roles', createdAt: iso(9) },
  ]

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    onboarded: true,
    demoMode: true,
    demoSeeded: true,
    settings: { taskDefs, screening: DEFAULT_SCREENING },
    today: {
      dateKey: localDateKey(),
      taskState: {
        [counterDefs[0]?.id]: { count: Math.round((counterDefs[0]?.target || 10) * 0.4) },
      },
    },
    dailyHistory,
    opportunities,
    interactions,
    recruiters,
    recruiterContacts,
  }
}
