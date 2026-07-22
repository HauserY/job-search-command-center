export const STAGES = [
  'new',
  'screening',
  'submitted',
  'manager-interview',
  'technical-interview',
  'offer',
  'closed',
]

export const STAGE_LABELS = {
  'new': 'New / Outreach',
  'screening': 'Screening call',
  'submitted': 'Submitted to client',
  'manager-interview': 'Manager interview',
  'technical-interview': 'Technical interview',
  'offer': 'Offer',
  'closed': 'Closed',
}

export const SOURCES = [
  'LinkedIn Easy Apply',
  'LinkedIn apply (external)',
  'Dice',
  'ZipRecruiter',
  'Hiring.cafe',
  'Recruiter inbound — LinkedIn',
  'Recruiter inbound — email',
  'Recruiter inbound — call or text',
  'My cold outreach',
  'Referral',
  'Other',
]

export const ENGAGEMENT_TYPES = ['Contract', 'Contract-to-hire', 'Direct hire']
export const REMOTE_STATUSES = ['Remote', 'Hybrid', 'Onsite']
export const RESUME_VERSIONS = ['Azure', 'AWS', 'None yet', 'Custom']

export const HALAL_STATUS = {
  permissible: { label: 'Permissible', icon: '✅', color: 'text-green-400' },
  'needs-review': { label: 'Needs review', icon: '⚠️', color: 'text-yellow-400' },
  avoid: { label: 'Avoid', icon: '❌', color: 'text-red-400' },
  unknown: { label: 'Unknown', icon: '❓', color: 'text-gray-400' },
}

// Configurable screening field (release plan decision 11B). The four status
// KEYS are fixed semantic slots (unknown / permissible / needs-review / avoid
// — the avoid slot drives the stage-change guard); the field label and status
// labels are user-editable in Settings, and the whole field can be hidden.
// Ships with the halal defaults — the app's origin story (see README).
// Opportunities store the key under `halalStatus` for back-compat.
export const DEFAULT_SCREENING = {
  enabled: true,
  label: 'Halal status',
  statuses: HALAL_STATUS,
}

export const CHANNELS = ['Call', 'Text', 'LinkedIn DM', 'Email', 'Video interview']
export const DIRECTIONS = ['inbound', 'outbound']

export const RECRUITER_STATUSES = ['active', 'paused']
export const DEFAULT_RECRUITER_CADENCE_DAYS = 7

export const CLOSED_REASONS = [
  'Won offer',
  'Withdrew',
  'Rejected',
  'Ghosted',
  'Failed screening',
  'Rate too low',
]

export const DEFAULT_TASK_DEFS = [
  {
    id: 'recruiter-replies',
    label: 'Reply to ALL recruiter messages (LinkedIn + email)',
    type: 'checkbox',
    order: 0,
    core: true,
  },
  {
    id: 'followups',
    label: 'Complete all follow-ups due today',
    type: 'followups',
    order: 1,
    core: true,
  },
  {
    id: 'linkedin-apps',
    label: 'LinkedIn applications',
    type: 'counter',
    target: 25,
    order: 2,
    source: 'linkedin',
  },
  {
    id: 'dice-apps',
    label: 'Dice applications',
    type: 'counter',
    target: 20,
    order: 3,
    source: 'dice',
  },
  {
    id: 'ziprecruiter-apps',
    label: 'ZipRecruiter applications',
    type: 'counter',
    target: 10,
    order: 4,
    source: 'ziprecruiter',
  },
  {
    id: 'hiringcafe-apps',
    label: 'Hiring.cafe applications',
    type: 'counter',
    target: 10,
    order: 5,
    source: 'hiringcafe',
  },
  {
    id: 'proactive-messages',
    label: 'Send proactive LinkedIn messages to recruiters/hiring managers',
    type: 'counter',
    target: 5,
    order: 6,
  },
]

// Maps task source slugs to pipeline source strings for effort-vs-yield
export const TASK_SOURCE_MAP = {
  linkedin: ['LinkedIn Easy Apply', 'LinkedIn apply (external)'],
  dice: ['Dice'],
  ziprecruiter: ['ZipRecruiter'],
  hiringcafe: ['Hiring.cafe'],
}
