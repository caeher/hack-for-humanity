'use client'

import React, { useCallback, useState } from 'react'
import { Loader2, Sparkles, Trash2, Check, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { SelectField } from '@/components/forms'
import { cn } from '@/lib/utils'
import { DEFAULT_GOVERNANCE_STATE } from '@/lib/ai/killSwitch'
import {
  extractRecoveryEvents,
  CONCUSSION_SYMPTOM_FIELDS,
  type ConcussionSymptomField,
  type RecoveryEventCandidate,
} from '@/lib/extraction'
import {
  EXPOSURE_ACTIVITY_LABELS,
  EXPOSURE_ACTIVITY_TYPES,
  EXPOSURE_DOMAIN_LABELS,
  type ExposureDomain,
} from '@/lib/exposureTracking'

const SYMPTOM_LABELS: Record<string, string> = {
  headache: 'Headache',
  dizziness: 'Dizziness',
  nausea: 'Nausea',
  lightSensitivity: 'Light sensitivity',
  noiseSensitivity: 'Noise sensitivity',
  fatigue: 'Fatigue',
  concentration: 'Concentration difficulty',
  sleepDifficulty: 'Sleep difficulty',
}

export interface NoteExtractionResult {
  candidates: RecoveryEventCandidate[]
  message?: string
}

export interface NoteExtractionPanelProps {
  note: string
  candidates: RecoveryEventCandidate[]
  onCandidatesChange: (candidates: RecoveryEventCandidate[]) => void
  onRequestExtraction?: (note: string) => Promise<NoteExtractionResult | null>
  className?: string
}

function CandidateCard({
  candidate,
  onUpdate,
  onConfirm,
  onDiscard,
}: {
  candidate: RecoveryEventCandidate
  onUpdate: (updated: RecoveryEventCandidate) => void
  onConfirm: () => void
  onDiscard: () => void
}) {
  const [editing, setEditing] = useState(false)
  const isDiscarded = candidate.status === 'discarded'
  const isConfirmed = candidate.status === 'confirmed'

  const domain = candidate.activity?.domain
  const activityOptions =
    domain && domain in EXPOSURE_ACTIVITY_TYPES
      ? EXPOSURE_ACTIVITY_TYPES[domain as ExposureDomain].map(type => ({
          value: type,
          label: EXPOSURE_ACTIVITY_LABELS[type] ?? type,
        }))
      : []

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isDiscarded && 'opacity-50 border-border bg-muted/20',
        isConfirmed && 'border-success/40 bg-success/5',
        !isDiscarded && !isConfirmed && 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suggested event · {candidate.confidence} confidence
            {candidate.uncertain && ' · uncertain'}
          </p>
          {candidate.symptom && (
            <p className="text-sm text-foreground">
              <span className="font-semibold">Symptom:</span>{' '}
              {SYMPTOM_LABELS[candidate.symptom.field] ?? candidate.symptom.field}
              {candidate.symptom.severity !== undefined && ` (severity ${candidate.symptom.severity})`}
            </p>
          )}
          {candidate.activity && (
            <p className="text-sm text-foreground">
              <span className="font-semibold">Activity:</span>{' '}
              {candidate.activity.rejected
                ? 'Unsupported category (needs review)'
                : `${EXPOSURE_DOMAIN_LABELS[candidate.activity.domain as ExposureDomain] ?? candidate.activity.domain} — ${EXPOSURE_ACTIVITY_LABELS[candidate.activity.activityType] ?? candidate.activity.activityType}`}
            </p>
          )}
          {candidate.duration?.minutes !== undefined && (
            <p className="text-sm text-muted-foreground">
              Duration: ~{candidate.duration.minutes} minutes
              {candidate.duration.uncertain && ' (approximate)'}
            </p>
          )}
          {candidate.timing?.relative && (
            <p className="text-sm text-muted-foreground">
              Timing: {candidate.timing.relative.replace('_', ' ')}
            </p>
          )}
        </div>
        {!isDiscarded && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Edit candidate"
            >
              <Pencil className="size-4" />
            </button>
            {!isConfirmed && (
              <>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded-md p-1.5 text-success hover:bg-success/10"
                  aria-label="Confirm candidate"
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={onDiscard}
                  className="rounded-md p-1.5 text-destructive hover:bg-destructive/10"
                  aria-label="Discard candidate"
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {editing && !isDiscarded && candidate.activity && domain && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <SelectField
            label="Symptom"
            value={candidate.symptom?.field ?? ''}
            onChange={e => {
              const field = e.target.value as ConcussionSymptomField | ''
              onUpdate({
                ...candidate,
                symptom: field ? { field, uncertain: false } : undefined,
              })
            }}
            options={[
              { value: '', label: 'None' },
              ...CONCUSSION_SYMPTOM_FIELDS.map(f => ({
                value: f,
                label: SYMPTOM_LABELS[f] ?? f,
              })),
            ]}
          />
          <SelectField
            label="Activity type"
            value={candidate.activity.activityType}
            onChange={e =>
              onUpdate({
                ...candidate,
                activity: { ...candidate.activity!, activityType: e.target.value, uncertain: false },
              })
            }
            options={activityOptions}
          />
        </div>
      )}

      {isConfirmed && (
        <p className="mt-2 text-xs font-medium text-success">Confirmed — will be saved with check-in</p>
      )}
      {isDiscarded && <p className="mt-2 text-xs text-muted-foreground">Discarded</p>}
    </div>
  )
}

export function NoteExtractionPanel({
  note,
  candidates,
  onCandidatesChange,
  onRequestExtraction,
  className,
}: NoteExtractionPanelProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleExtract = useCallback(async () => {
    const trimmed = note.trim()
    if (!trimmed) return

    setStatus('loading')
    setMessage(null)

    try {
      if (onRequestExtraction) {
        const result = await onRequestExtraction(trimmed)
        if (!result) {
          setStatus('error')
          setMessage('Could not analyze your note. You can still complete your check-in manually.')
          return
        }
        onCandidatesChange(result.candidates)
        if (result.message) setMessage(result.message)
      } else {
        const result = extractRecoveryEvents({
          requestId: crypto.randomUUID(),
          noteText: trimmed,
          governance: DEFAULT_GOVERNANCE_STATE,
        })
        onCandidatesChange(result.candidates)
        if (result.message) setMessage(result.message)
      }
      setStatus('idle')
    } catch {
      setStatus('error')
      setMessage('Could not analyze your note. You can still complete your check-in manually.')
    }
  }, [note, onRequestExtraction, onCandidatesChange])

  const updateCandidate = (id: string, updated: RecoveryEventCandidate) => {
    onCandidatesChange(candidates.map(c => (c.id === id ? updated : c)))
  }

  const confirmCandidate = (id: string) => {
    onCandidatesChange(
      candidates.map(c => (c.id === id ? { ...c, status: 'confirmed' as const } : c))
    )
  }

  const discardCandidate = (id: string) => {
    onCandidatesChange(
      candidates.map(c => (c.id === id ? { ...c, status: 'discarded' as const } : c))
    )
  }

  const activeCandidates = candidates.filter(c => c.status !== 'discarded')
  const hasNote = note.trim().length > 0

  if (!hasNote) return null

  return (
    <Card className={cn('space-y-4 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Structured event suggestions</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Optional: extract activities from your note. Suggestions are not saved until you confirm
            each one. This is not a clinical diagnosis.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExtract()}
          disabled={status === 'loading'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
        >
          {status === 'loading' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          Suggest from note
        </button>
      </div>

      {message && (
        <p
          className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground"
          role="status"
        >
          {message}
        </p>
      )}

      {status === 'error' && (
        <p className="text-xs text-destructive" role="alert">
          Analysis unavailable. Manual activity logging still works.
        </p>
      )}

      {activeCandidates.length > 0 && (
        <div className="space-y-3">
          {candidates.map(candidate => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onUpdate={updated => updateCandidate(candidate.id, updated)}
              onConfirm={() => confirmCandidate(candidate.id)}
              onDiscard={() => discardCandidate(candidate.id)}
            />
          ))}
        </div>
      )}
    </Card>
  )
}
