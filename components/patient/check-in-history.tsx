'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import {
  AlertCircle,
  CalendarOff,
  ClipboardList,
  Loader2,
  LockKeyhole,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProgressField, RadioGroupField, TextareaField } from '@/components/forms'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import {
  formatHistoryDateLabel,
  formatReporterRole,
  formatSafetyStatus,
  formatSubmittedAt,
  getLocalDateString,
  isOfflineLikeError,
  isPermissionDeniedMessage,
  type CheckInSafetyStatus,
} from '@/lib/checkInHistory'
import { METHODOLOGY_COPY } from '@/lib/symptomMethodology'
import { isE2ETestMode } from '@/lib/e2e'

const activityImpactOptions = [
  { value: 'none', label: 'No activity today' },
  { value: 'yes', label: 'Yes, symptoms changed with activity' },
  { value: 'no', label: 'No, activity did not change symptoms' },
  { value: 'not-sure', label: 'Not sure' },
]

const symptomFields = [
  { id: 'headache', label: 'Headache' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'lightSensitivity', label: 'Light sensitivity' },
  { id: 'noiseSensitivity', label: 'Noise sensitivity' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'concentration', label: 'Concentration difficulty' },
  { id: 'sleepDifficulty', label: 'Sleep difficulty' },
] as const

export interface CheckInHistoryProps {
  patientId?: Id<'patients'>
  episodeId?: Id<'recoveryEpisodes'>
  timeZone?: string
  className?: string
}

function HistoryEntrySkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="mt-3 h-3 w-full rounded bg-muted" />
      <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
    </div>
  )
}

function HistoryStatusPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

class CheckInHistoryErrorBoundary extends React.Component<
  { children: React.ReactNode; className?: string; onRetry: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      const message = this.state.error.message
      const permissionDenied = isPermissionDeniedMessage(message)
      const offline = isOfflineLikeError(message) || (typeof navigator !== 'undefined' && !navigator.onLine)

      return (
        <Card className={cn('p-6', this.props.className)}>
          <HistoryStatusPanel
            icon={permissionDenied ? LockKeyhole : offline ? WifiOff : AlertCircle}
            title={
              permissionDenied
                ? 'You do not have permission to view this history'
                : offline
                  ? 'History is unavailable offline'
                  : 'Unable to load check-in history'
            }
            description={message}
            action={
              !permissionDenied ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    this.setState({ error: null })
                    this.props.onRetry()
                  }}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Try again
                </Button>
              ) : undefined
            }
          />
        </Card>
      )
    }

    return this.props.children
  }
}

interface CorrectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: Id<'patients'>
  checkInId: Id<'checkIns'>
  timeZone: string
}

function CheckInCorrectionDialog({
  open,
  onOpenChange,
  patientId,
  checkInId,
  timeZone,
}: CorrectionDialogProps) {
  const detail = useQuery(
    api.checkIns.getForAmendment,
    open ? { patientId, checkInId } : 'skip'
  )
  const amendCheckIn = useMutation(api.checkIns.amendCheckIn)
  const [correctionReason, setCorrectionReason] = useState('')
  const [activityImpact, setActivityImpact] = useState('none')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  React.useEffect(() => {
    if (!detail) return
    setActivityImpact(detail.activityImpact)
    setAnswers(detail.symptoms)
    setCorrectionReason('')
    setSubmitError(null)
  }, [detail])

  const handleSubmit = async () => {
    if (!detail) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await amendCheckIn({
        patientId,
        checkInId,
        symptoms: {
          headache: answers.headache ?? 0,
          dizziness: answers.dizziness ?? 0,
          nausea: answers.nausea ?? 0,
          lightSensitivity: answers.lightSensitivity ?? 0,
          noiseSensitivity: answers.noiseSensitivity ?? 0,
          fatigue: answers.fatigue ?? 0,
          concentration: answers.concentration ?? 0,
          sleepDifficulty: answers.sleepDifficulty ?? 0,
        },
        activityImpact: activityImpact as 'yes' | 'no' | 'not-sure' | 'none',
        dangerSigns: detail.dangerSigns,
        note: detail.note,
        correctionReason,
      })
      onOpenChange(false)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save correction.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Correct check-in</DialogTitle>
          <DialogDescription>
            Original values stay on record. Corrections are append-only and require a brief reason.
            You can amend within 72 hours of submission.
          </DialogDescription>
        </DialogHeader>

        {detail === undefined ? (
          <div className="flex items-center justify-center py-10" aria-busy="true">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : detail === null || !detail.canAmend ? (
          <p className="text-sm text-muted-foreground">
            This check-in is no longer eligible for correction or cannot be loaded.
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {formatHistoryDateLabel(detail.date, timeZone)} · original total{' '}
              {detail.originalSymptomTotal}/48
              {detail.hasAmendment ? ' · prior amendment on file' : ''}
            </p>

            <div className="grid gap-4">
              {symptomFields.map(field => (
                <ProgressField
                  key={field.id}
                  label={field.label}
                  value={answers[field.id] ?? 0}
                  onChange={event =>
                    setAnswers(current => ({ ...current, [field.id]: event.target.value }))
                  }
                  min={0}
                  max={6}
                />
              ))}
            </div>

            <RadioGroupField
              label="Activity impact"
              value={activityImpact}
              onValueChange={setActivityImpact}
              options={activityImpactOptions}
            />

            <TextareaField
              label="Reason for correction"
              hint="Required. Describe what was inaccurate and why you are updating it."
              value={correctionReason}
              onChange={event => setCorrectionReason(event.target.value)}
              rows={3}
            />

            {submitError ? (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !detail?.canAmend || correctionReason.trim().length < 10}
          >
            {isSubmitting ? 'Saving correction…' : 'Save correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CheckInHistory(props: CheckInHistoryProps) {
  if (isE2ETestMode) {
    return <CheckInHistoryDemo className={props.className} />
  }
  return <CheckInHistoryLive {...props} />
}

function CheckInHistoryLive({ patientId, episodeId, timeZone, className }: CheckInHistoryProps) {
  const [retryKey, setRetryKey] = useState(0)

  return (
    <CheckInHistoryErrorBoundary
      key={retryKey}
      className={className}
      onRetry={() => setRetryKey(current => current + 1)}
    >
      <CheckInHistoryContent
        patientId={patientId}
        episodeId={episodeId}
        timeZone={timeZone}
        className={className}
      />
    </CheckInHistoryErrorBoundary>
  )
}

function CheckInHistoryDemo({ className }: { className?: string }) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Daily check-in history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Newest first. Missing days are shown as gaps — not as zero symptoms.
          </p>
        </div>
        <Badge tone="neutral">
          <ClipboardList className="mr-1 size-3" />
          {METHODOLOGY_COPY.metricShortName}
        </Badge>
      </div>
      <ul className="mt-5 flex flex-col gap-3">
        <li className="rounded-xl border border-border bg-card px-4 py-3 warm-shadow">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Mon, Sep 1, 2026</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Submitted Sep 1, 2026, 8:42 AM · Patient (Maya Chen)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="good">Routine</Badge>
              <Badge tone="good">Complete</Badge>
            </div>
          </div>
          <p className="mt-3 text-sm text-foreground">
            {METHODOLOGY_COPY.metricShortName}: <span className="font-semibold">15/48</span>
          </p>
        </li>
        <li className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sun, Aug 31, 2026</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No check-in recorded · not counted as zero symptoms
              </p>
            </div>
            <Badge tone="neutral">Missed day</Badge>
          </div>
        </li>
      </ul>
    </Card>
  )
}

function CheckInHistoryContent({ patientId, episodeId, timeZone, className }: CheckInHistoryProps) {
  const mePatient = useQuery(api.patients.getMePatient, patientId ? 'skip' : {})
  const resolvedPatientId = patientId ?? mePatient?._id
  const resolvedTimeZone =
    timeZone ?? mePatient?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = useMemo(() => getLocalDateString(new Date(), resolvedTimeZone), [resolvedTimeZone])

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.checkIns.listHistoryByEpisode,
    resolvedPatientId
      ? {
          patientId: resolvedPatientId,
          episodeId,
          today,
        }
      : 'skip',
    { initialNumItems: 14 }
  )

  const [correctionTarget, setCorrectionTarget] = useState<Id<'checkIns'> | null>(null)

  if (!patientId && mePatient === undefined) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center" aria-busy="true">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading check-in history…</p>
        </div>
      </Card>
    )
  }

  if (!resolvedPatientId) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <LockKeyhole className="size-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Sign in to view history</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Complete onboarding to see your daily check-in history with provenance and safety status.
          </p>
        </div>
      </Card>
    )
  }

  const entries = results ?? []
  const isEmpty = !isLoading && entries.length === 0

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-foreground">Daily check-in history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Newest first. Missing days are shown as gaps — not as zero symptoms. Times shown in{' '}
            {resolvedTimeZone.replace(/_/g, ' ')}.
          </p>
        </div>
        <Badge tone="neutral">
          <ClipboardList className="mr-1 size-3" />
          {METHODOLOGY_COPY.metricShortName}
        </Badge>
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="mt-5 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <HistoryEntrySkeleton key={index} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <CalendarOff className="size-8 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">No history yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Once you complete daily check-ins, they will appear here with reporter, safety status,
            and amendment provenance.
          </p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {entries.map(entry => {
            if (entry.kind === 'missed') {
              return (
                <li
                  key={`missed-${entry.date}`}
                  className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {formatHistoryDateLabel(entry.date, resolvedTimeZone)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        No check-in recorded · not counted as zero symptoms
                      </p>
                    </div>
                    <Badge tone="neutral">Missed day</Badge>
                  </div>
                </li>
              )
            }

            const safety = formatSafetyStatus(entry.safetyStatus as CheckInSafetyStatus)

            return (
              <li
                key={entry.checkInId}
                className="rounded-xl border border-border bg-card px-4 py-3 warm-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {formatHistoryDateLabel(entry.date, resolvedTimeZone)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Submitted {formatSubmittedAt(entry.submittedAt, resolvedTimeZone)} ·{' '}
                      {formatReporterRole(entry.reporterRole)} ({entry.reporterName})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={safety.tone}>{safety.label}</Badge>
                    <Badge tone={entry.completeness === 'complete' ? 'good' : 'warn'}>
                      {entry.completeness === 'complete' ? 'Complete' : 'Partial'}
                    </Badge>
                    {entry.hasAmendment ? <Badge tone="warn">Amended</Badge> : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-foreground">
                    {METHODOLOGY_COPY.metricShortName}:{' '}
                    <span className="font-semibold">{entry.symptomTotal}/48</span>
                    {entry.originalSymptomTotal !== undefined ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (original {entry.originalSymptomTotal}/48)
                      </span>
                    ) : null}
                  </p>
                  {entry.canAmend ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCorrectionTarget(entry.checkInId)}
                    >
                      Correct entry
                    </Button>
                  ) : null}
                </div>

                {entry.amendmentReason ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Latest amendment: {entry.amendmentReason}
                  </p>
                ) : null}

                {entry.showNotes && entry.note ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{entry.note}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {status === 'CanLoadMore' ? (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" onClick={() => loadMore(14)} disabled={status !== 'CanLoadMore'}>
            Load earlier days
          </Button>
        </div>
      ) : null}

      {status === 'LoadingMore' ? (
        <div className="mt-4 flex justify-center">
          <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading more history" />
        </div>
      ) : null}

      {correctionTarget && resolvedPatientId ? (
        <CheckInCorrectionDialog
          open={Boolean(correctionTarget)}
          onOpenChange={open => {
            if (!open) setCorrectionTarget(null)
          }}
          patientId={resolvedPatientId}
          checkInId={correctionTarget}
          timeZone={resolvedTimeZone}
        />
      ) : null}
    </Card>
  )
}
