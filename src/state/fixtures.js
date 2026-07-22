// Canonical exhaustive state fixture (release plan, codex bundle item 11).
// Every field populated, all entity types present, current schema version.
// Shared by migration tests, backup validation tests, and the round-trip
// test so schema knowledge cannot drift between consumers. If you add a
// state field, add it HERE and the round-trip test enforces it everywhere.

import { CURRENT_SCHEMA_VERSION } from './migrations'
import { DEFAULT_SCREENING } from './defaults'

export function makeStateFixture() {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    onboarded: true,
    demoMode: false,
    demoSeeded: false,
    settings: {
      screening: DEFAULT_SCREENING,
      taskDefs: [
        { id: 'reply-all', label: 'Reply to ALL recruiter messages', type: 'checkbox', core: true, order: 1 },
        { id: 'linkedin-apps', label: 'LinkedIn applications', type: 'counter', target: 25, core: false, order: 2 },
        { id: 'followups', label: 'Follow-ups due', type: 'followups', core: true, order: 3 },
      ],
    },
    today: {
      dateKey: '2026-07-17',
      taskState: {
        'reply-all': { checked: true },
        'linkedin-apps': { count: 12 },
      },
    },
    dailyHistory: [
      {
        dateKey: '2026-07-16',
        taskState: { 'linkedin-apps': { count: 25 }, 'reply-all': { checked: true } },
        completionPct: 100,
        corePct: 100,
        targets: { 'linkedin-apps': 25 },
      },
      {
        dateKey: '2026-07-15',
        taskState: {},
        completionPct: 0,
        corePct: 0,
        targets: { 'linkedin-apps': 20 },
        targetsApproximated: true,
      },
    ],
    opportunities: [
      {
        id: 'opp-1', company: 'Acme Corp', role: 'Platform Engineer', stage: 'submitted',
        halalStatus: 'permissible', source: 'LinkedIn apply (external)', engagementType: 'Contract', rate: '$70/hr',
        remoteStatus: 'Remote', recruiterName: 'Christine Lee', recruiterAgency: 'TalentCo',
        recruiterContact: 'christine@talentco.example', resumeVersion: 'Azure',
        techTags: ['react', 'node'], nextAction: 'Follow up on submission',
        nextActionDue: '2026-07-18', createdAt: '2026-07-10T15:00:00.000Z',
      },
    ],
    interactions: [
      {
        id: 'int-1', opportunityId: 'opp-1', channel: 'Email', direction: 'outbound',
        note: 'Sent updated resume', response: 'yes', createdAt: '2026-07-15T18:30:00.000Z',
      },
    ],
    recruiters: [
      {
        id: 'rec-1', name: 'Christine Lee', agency: 'TalentCo', status: 'active',
        notes: 'Focuses on cloud roles', cadenceDays: 7,
        lastContactAt: '2026-07-15T18:30:00.000Z', nextFollowUpDue: '2026-07-22',
        createdAt: '2026-06-01T12:00:00.000Z',
      },
    ],
    recruiterContacts: [
      {
        id: 'rc-1', recruiterId: 'rec-1', channel: 'LinkedIn DM',
        note: 'Monthly check-in', createdAt: '2026-07-15T18:30:00.000Z',
      },
    ],
  }
}
