import { useState } from 'react'
import { useStore } from '../state/useStore'
import {
  STAGES, STAGE_LABELS, SOURCES, ENGAGEMENT_TYPES, REMOTE_STATUSES,
  RESUME_VERSIONS, CLOSED_REASONS
} from '../state/defaults'
import { useScreening } from '../state/useScreening'
import { ChipInput } from '../components/Chip'
import ConfirmButton from '../components/ConfirmButton'
import InteractionLog from './InteractionLog'
import { needsHalalConfirm } from '../lib/halal'

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">— select —</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

export default function OpportunityDetail({ opp, onClose }) {
  const { dispatch } = useStore()
  const screening = useScreening()
  const [pendingStage, setPendingStage] = useState(null)
  const [closedReason, setClosedReason] = useState('')
  const [showHalalWarn, setShowHalalWarn] = useState(false)

  const update = (changes) => dispatch({ type: 'OPP_UPDATE', id: opp.id, changes })

  const tryStageChange = (newStage) => {
    if (needsHalalConfirm(opp, newStage)) {
      setShowHalalWarn(true)
      setPendingStage(newStage)
      return
    }
    applyStageChange(newStage)
  }

  const applyStageChange = (newStage) => {
    if (newStage === 'closed') {
      setPendingStage('closed')
      return
    }
    update({ stage: newStage })
    setShowHalalWarn(false)
    setPendingStage(null)
  }

  const halal = screening.statuses[opp.halalStatus] || screening.statuses.unknown

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mt-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="flex-1 min-w-0">
          <input
            className="w-full bg-transparent text-lg font-bold text-white focus:outline-none border-b border-transparent focus:border-blue-500 pb-0.5"
            value={opp.company || ''}
            onChange={e => update({ company: e.target.value })}
            placeholder="Company name"
          />
          <input
            className="w-full bg-transparent text-sm text-gray-400 focus:outline-none mt-0.5"
            value={opp.role || ''}
            onChange={e => update({ role: e.target.value })}
            placeholder="Role title"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {screening.enabled && (
            <span className={`text-lg cursor-pointer ${halal.color}`} title={halal.label}>
              {halal.icon}
            </span>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>
      </div>

      {/* Halal warning */}
      {showHalalWarn && (
        <div className="bg-red-950 border border-red-700 rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2">
          <span className="text-sm text-red-300">
            {screening.statuses.avoid.icon} Marked {screening.statuses.avoid.label} — advance anyway?
          </span>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
              onClick={() => { applyStageChange(pendingStage); setShowHalalWarn(false) }}
            >Yes</button>
            <button
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
              onClick={() => { setShowHalalWarn(false); setPendingStage(null) }}
            >Cancel</button>
          </div>
        </div>
      )}

      {/* Close modal */}
      {pendingStage === 'closed' && !showHalalWarn && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 mb-3">
          <p className="text-sm text-gray-300 mb-2">Closing reason:</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {/* Stored reasons predating list changes (e.g. "Not halal") stay selectable */}
            {[...new Set([...CLOSED_REASONS, ...(opp.closedReason ? [opp.closedReason] : [])])].map(r => (
              <button
                key={r}
                onClick={() => setClosedReason(r)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  closedReason === r ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >{r}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
              onClick={() => {
                update({ stage: 'closed', closedReason, nextAction: '', nextActionDue: '' })
                setPendingStage(null)
              }}
            >Confirm close</button>
            <button
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
              onClick={() => setPendingStage(null)}
            >Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Stage */}
        <Field label="Stage">
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            value={opp.stage || 'new'}
            onChange={e => tryStageChange(e.target.value)}
          >
            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </select>
        </Field>

        {/* Screening field (configurable label + statuses, decision 11B) */}
        {screening.enabled && (
          <Field label={screening.label}>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={opp.halalStatus || 'unknown'}
              onChange={e => update({ halalStatus: e.target.value })}
            >
              {Object.entries(screening.statuses).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Source */}
        <Field label="Source *">
          <Select value={opp.source} onChange={v => update({ source: v })} options={SOURCES} />
        </Field>

        {/* Engagement */}
        <Field label="Engagement">
          <Select value={opp.engagementType} onChange={v => update({ engagementType: v })} options={ENGAGEMENT_TYPES} />
        </Field>

        {/* Rate */}
        <Field label="Rate / Salary">
          <TextInput value={opp.rate} onChange={v => update({ rate: v })} placeholder="e.g. $75-80/hr C2C" />
        </Field>

        {/* Remote */}
        <Field label="Remote status">
          <Select value={opp.remoteStatus} onChange={v => update({ remoteStatus: v })} options={REMOTE_STATUSES} />
        </Field>

        {/* Recruiter */}
        <Field label="Recruiter name">
          <TextInput value={opp.recruiterName} onChange={v => update({ recruiterName: v })} placeholder="Christine Lee" />
        </Field>

        {/* Agency */}
        <Field label="Agency">
          <TextInput value={opp.agency} onChange={v => update({ agency: v })} placeholder="Staffing agency" />
        </Field>

        {/* Recruiter email */}
        <Field label="Recruiter email">
          <TextInput value={opp.recruiterEmail} onChange={v => update({ recruiterEmail: v })} placeholder="email@example.com" />
        </Field>

        {/* Recruiter phone */}
        <Field label="Recruiter phone">
          <TextInput value={opp.recruiterPhone} onChange={v => update({ recruiterPhone: v })} placeholder="+1 555 000 0000" />
        </Field>

        {/* Resume version */}
        <Field label="Resume version sent">
          <Select value={opp.resumeVersion} onChange={v => update({ resumeVersion: v })} options={RESUME_VERSIONS} />
        </Field>

        {/* Closed reason (read-only if closed) */}
        {opp.stage === 'closed' && (
          <Field label="Closed reason">
            <div className="text-sm text-gray-300 py-1.5">{opp.closedReason || '—'}</div>
          </Field>
        )}
      </div>

      {/* Tech tags */}
      <div className="mb-4">
        <Field label="Tech stack">
          <ChipInput
            tags={opp.techTags || []}
            onChange={tags => update({ techTags: tags })}
            placeholder="Azure, Snowflake, Databricks…"
          />
        </Field>
      </div>

      {/* Next action */}
      {opp.stage !== 'closed' && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Field label="Next action *">
            <TextInput value={opp.nextAction} onChange={v => update({ nextAction: v })} placeholder="Follow up with Christine if no word" />
          </Field>
          <Field label="Due date *">
            <input
              type="date"
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={opp.nextActionDue || ''}
              onChange={e => update({ nextActionDue: e.target.value })}
            />
          </Field>
        </div>
      )}

      {/* Interaction log */}
      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Interaction log</h4>
        <InteractionLog opportunityId={opp.id} />
      </div>

      {/* Delete */}
      <div className="flex justify-end pt-2 border-t border-gray-800">
        <ConfirmButton
          onConfirm={() => { dispatch({ type: 'OPP_DELETE', id: opp.id }); onClose() }}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/30 transition-colors"
          confirmText="Delete forever"
        >
          Delete opportunity
        </ConfirmButton>
      </div>
    </div>
  )
}
