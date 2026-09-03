'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/layouts/page-header'
import { ProgressField, RadioGroupField, TextareaField } from '@/components/forms'
import { SafetyOutcomePanel, type SafetyOutcomeSource } from '@/components/safety/safety-outcome-panel'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import type { SafetyEvaluationResult } from '@/convex/lib/safetyEngine'
import {
  clearCheckInDraft,
  readCheckInDraft,
  writeCheckInDraft,
} from '@/lib/checkInDraft'
import { DANGER_SIGN_OPTIONS, mapDangerSignIdsToCdcLabels } from '@/lib/dangerSigns'
import { isE2ETestMode } from '@/lib/e2e'
import { evaluateCheckInClient } from '@/lib/safety/evaluate'
import { detectEmergencyRegion } from '@/lib/safety/emergency'
import type { AudienceBand } from '@/lib/safety/copy'
import {
  computeAnsweredSymptomTotal,
  isCompleteSymptomInventory,
} from '@/lib/symptomTotals'
import type { ExposureEntryInput } from '@/lib/exposureTracking'
import { ExposureQuickLog } from '@/components/patient/exposure-quick-log'
import { NoteExtractionPanel } from '@/components/patient/note-extraction-panel'
import {
  mapConfirmedCandidatesToExposureEntries,
  type RecoveryEventCandidate,
} from '@/lib/extraction'

const symptomQuestions = [
  {
    id: 'headache',
    title: 'How strong was your headache today?',
    sub: 'Rate the symptom as you experienced it during the past 24 hours.',
  },
  {
    id: 'dizziness',
    title: 'How much dizziness or trouble with balance did you have?',
    sub: 'Think about standing, walking, and changing position.',
  },
  {
    id: 'nausea',
    title: 'How much nausea did you experience?',
    sub: 'Rate nausea during the past 24 hours, even if you did not vomit.',
  },
  {
    id: 'lightSensitivity',
    title: 'How sensitive were you to light?',
    sub: 'Include discomfort from indoor lights, sunlight, and screens.',
  },
  {
    id: 'noiseSensitivity',
    title: 'How sensitive were you to noise?',
    sub: 'Think about conversations, music, traffic, and crowded places.',
  },
  {
    id: 'fatigue',
    title: 'How much fatigue or low energy did you have?',
    sub: 'Rate how tired you felt compared with your usual baseline.',
  },
  {
    id: 'concentration',
    title: 'How difficult was it to concentrate?',
    sub: 'Think about reading, work, school, and following conversations.',
  },
  {
    id: 'sleepDifficulty',
    title: 'How much difficulty did you have with sleep?',
    sub: 'Include falling asleep, staying asleep, or sleeping more or less than usual.',
  },
] as const

const symptomIds = symptomQuestions.map(question => question.id)

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'outcome'; safetyResult: SafetyEvaluationResult; source: SafetyOutcomeSource; safetyEvaluationId?: Id<'safetyEvaluations'> }
  | { status: 'error'; message: string }

interface CheckInFormState {
  answers: Record<string, number>
  activityImpact: string
  selectedDangerSigns: string[]
  note: string
  exposureEntries: ExposureEntryInput[]
  extractionCandidates: RecoveryEventCandidate[]
}

interface CheckInFlowViewProps {
  mode: 'demo' | 'persisted'
  patientId?: string
  audience?: AudienceBand
  onFinish?: (form: CheckInFormState) => Promise<{
    safetyResult: SafetyEvaluationResult
    source: SafetyOutcomeSource
    safetyEvaluationId?: Id<'safetyEvaluations'>
    checkInId?: Id<'checkIns'>
  } | null>
  isSubmitting?: boolean
  submitError?: string | null
  onAcknowledge?: (safetyEvaluationId: Id<'safetyEvaluations'>) => Promise<void>
  isAcknowledging?: boolean
  onRequestExtraction?: (note: string) => Promise<{
    candidates: RecoveryEventCandidate[]
    message?: string
  } | null>
}

function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildSymptomsPayload(answers: Record<string, number>) {
  return {
    headache: answers.headache ?? 0,
    dizziness: answers.dizziness ?? 0,
    nausea: answers.nausea ?? 0,
    lightSensitivity: answers.lightSensitivity ?? 0,
    noiseSensitivity: answers.noiseSensitivity ?? 0,
    fatigue: answers.fatigue ?? 0,
    concentration: answers.concentration ?? 0,
    sleepDifficulty: answers.sleepDifficulty ?? 0,
  }
}

function CheckInFlowView({
  mode,
  patientId,
  audience = 'adult',
  onFinish,
  isSubmitting = false,
  submitError = null,
  onAcknowledge,
  isAcknowledging = false,
  onRequestExtraction,
}: CheckInFlowViewProps) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [activityImpact, setActivityImpact] = useState('not-sure')
  const [selectedDangerSigns, setSelectedDangerSigns] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [exposureEntries, setExposureEntries] = useState<ExposureEntryInput[]>([])
  const [extractionCandidates, setExtractionCandidates] = useState<RecoveryEventCandidate[]>([])
  const [draftLoaded, setDraftLoaded] = useState(mode === 'demo')
  const [outcome, setOutcome] = useState<{
    safetyResult: SafetyEvaluationResult
    source: SafetyOutcomeSource
    safetyEvaluationId?: Id<'safetyEvaluations'>
  } | null>(null)

  const safetyStep = symptomQuestions.length
  const totalSteps = symptomQuestions.length + 1
  const symptomTotal = useMemo(() => computeAnsweredSymptomTotal(answers), [answers])
  const hasDangerSign = selectedDangerSigns.length > 0
  const isDemoSession = mode === 'demo'
  const emergencyRegion = useMemo(() => detectEmergencyRegion(), [])
  const stepHeadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    stepHeadingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (!patientId || draftLoaded) return

    const draft = readCheckInDraft(patientId)
    if (draft) {
      setStep(draft.step)
      setAnswers(draft.answers)
      setActivityImpact(draft.activityImpact)
      setSelectedDangerSigns(draft.selectedDangerSigns)
      setNote(draft.note)
    }
    setDraftLoaded(true)
  }, [draftLoaded, patientId])

  useEffect(() => {
    if (!patientId || !draftLoaded) return

    writeCheckInDraft(patientId, {
      version: 1,
      step,
      answers,
      activityImpact,
      selectedDangerSigns,
      note,
      updatedAt: Date.now(),
    })
  }, [activityImpact, answers, draftLoaded, note, patientId, selectedDangerSigns, step])

  const handleFinish = async () => {
    const confirmedExposures = mapConfirmedCandidatesToExposureEntries(extractionCandidates)
    const mergedExposures = [...exposureEntries, ...confirmedExposures]

    const form: CheckInFormState = {
      answers,
      activityImpact,
      selectedDangerSigns,
      note,
      exposureEntries: mergedExposures,
      extractionCandidates,
    }

    if (onFinish) {
      const result = await onFinish(form)
      if (!result) return
      setOutcome(result)
      setStep(totalSteps)
      return
    }

    const symptoms = buildSymptomsPayload(form.answers)
    const dangerSignLabels = mapDangerSignIdsToCdcLabels(form.selectedDangerSigns)
    const clientResult = evaluateCheckInClient(symptoms, dangerSignLabels, form.note.trim() || undefined)
    setOutcome({ safetyResult: clientResult, source: 'client_fallback' })
    setStep(totalSteps)
  }

  const handleAcknowledge = async () => {
    if (!outcome) return

    if (onAcknowledge && outcome.safetyEvaluationId) {
      await onAcknowledge(outcome.safetyEvaluationId)
    }

    const blocked = outcome.safetyResult.blockedActions.includes('allow_routine_completion')
    if (!blocked) {
      router.push('/patient/dashboard')
    }
  }

  if (step >= totalSteps && outcome) {
    const blocked = outcome.safetyResult.blockedActions.includes('allow_routine_completion')

    return (
      <SafetyOutcomePanel
        safetyResult={outcome.safetyResult}
        symptomTotal={symptomTotal}
        source={outcome.source}
        audience={audience}
        emergencyRegion={emergencyRegion}
        savedSuccessfully={outcome.source === 'backend'}
        isAcknowledging={isAcknowledging}
        onAcknowledge={handleAcknowledge}
        onReviewAnswers={blocked ? () => setStep(safetyStep) : undefined}
        showRoutineCompletion={!isDemoSession}
      />
    )
  }

  if (step === safetyStep) {
    return (
      <div
        ref={stepHeadingRef}
        tabIndex={-1}
        aria-live="polite"
        aria-atomic="true"
        className="mx-auto max-w-2xl space-y-6 focus:outline-none"
      >
        <PageHeader
          eyebrow={`Daily check-in · ${step + 1} of ${totalSteps}`}
          title="Before you finish, check for danger signs"
          description="Select every item that is happening now. Leave all items unselected if none apply."
        />
        <Card className="space-y-6 p-7">
          {hasDangerSign && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-4" role="alert">
              <p className="font-semibold text-foreground">
                <span aria-hidden="true">⚠ </span>
                Urgent: Get emergency medical help now.
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                Continue to view emergency contact guidance. Do not wait for a routine app response.
              </p>
            </div>
          )}

          {submitError && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-4" role="alert">
              <p className="font-semibold text-foreground">Could not save check-in</p>
              <p className="mt-1 text-sm leading-6 text-foreground">{submitError}</p>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Danger signs</legend>
            {DANGER_SIGN_OPTIONS.map(sign => {
              const checked = selectedDangerSigns.includes(sign.id)
              return (
                <label
                  key={sign.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm leading-5 text-foreground hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={nextChecked =>
                      setSelectedDangerSigns(current =>
                        nextChecked === true
                          ? [...current, sign.id]
                          : current.filter(id => id !== sign.id)
                      )
                    }
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <span>{sign.label}</span>
                </label>
              )
            })}
          </fieldset>

          <RadioGroupField
            label="Did physical, cognitive, or screen activity make your symptoms worse today?"
            layout="segmented"
            value={activityImpact}
            onChange={event => setActivityImpact(event.target.value)}
            options={[
              { label: 'No', value: 'no' },
              { label: 'Yes', value: 'yes' },
              { label: 'Not sure', value: 'not-sure' },
            ]}
          />

          <TextareaField
            label="Optional context"
            placeholder="Anything you want to remember for a conversation with your care team?"
            value={note}
            onChange={event => setNote(event.target.value)}
            autoResize
            showCount
            maxLength={250}
            hint={
              isDemoSession
                ? 'This note remains in the current demo session and is not sent to a clinician.'
                : 'Saved with your check-in for your care team when you finish.'
            }
          />

          <NoteExtractionPanel
            note={note}
            candidates={extractionCandidates}
            onCandidatesChange={setExtractionCandidates}
            onRequestExtraction={onRequestExtraction}
          />

          <ExposureQuickLog value={exposureEntries} onChange={setExposureEntries} />

          <div className="flex justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={isSubmitting}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-70 ${
                hasDangerSign
                  ? 'bg-destructive text-destructive-foreground hover:opacity-90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isSubmitting
                ? 'Saving check-in...'
                : hasDangerSign
                  ? 'View urgent guidance'
                  : 'Finish check-in'}
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const question = symptomQuestions[step]
  const value = answers[question.id] ?? 0

  return (
    <div
      ref={stepHeadingRef}
      tabIndex={-1}
      aria-live="polite"
      aria-atomic="true"
      className="mx-auto max-w-2xl space-y-6 focus:outline-none"
    >
      <PageHeader
        eyebrow={`Daily check-in · ${step + 1} of ${totalSteps}`}
        title={question.title}
        description={question.sub}
      />
      <Card className="space-y-6 p-7">
        <ProgressField
          label="Symptom rating (0 to 6)"
          min={0}
          max={6}
          step={1}
          value={value}
          onChange={event =>
            setAnswers(current => ({ ...current, [question.id]: Number(event.target.value) }))
          }
          minLabel="None"
          maxLabel="Severe"
          showValueBadge
        />

        <div className="flex flex-wrap gap-3 justify-between border-t border-border pt-4">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers(current => ({ ...current, [question.id]: value }))
              setStep(step + 1)
            }}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </Card>
    </div>
  )
}

/** Session-only flow for smoke tests and unauthenticated demo browsing. */
export function CheckInFlowSession() {
  return <CheckInFlowView mode="demo" />
}

function CheckInFlowPersisted() {
  const patient = useQuery(api.patients.getMePatient)
  const submitCheckIn = useMutation(api.checkIns.submitCheckIn)
  const logExposureBatch = useMutation(api.exposureEntries.logBatch)
  const extractFromNote = useMutation(api.recoveryExtraction.extractFromNote)
  const acknowledgeSafety = useMutation(api.safety.acknowledgeSafetyOutcome)
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' })
  const [isAcknowledging, setIsAcknowledging] = useState(false)

  const audience: AudienceBand = patient?.ageBand === '13-17' ? 'pediatric' : 'adult'

  const persistCheckIn = useCallback(
    async (form: CheckInFormState) => {
      if (!patient) {
        setSubmission({
          status: 'error',
          message: 'Sign in and complete onboarding before saving a check-in.',
        })
        return null
      }

      if (!isCompleteSymptomInventory(form.answers, symptomIds)) {
        setSubmission({
          status: 'error',
          message: 'Rate all eight symptoms before finishing your check-in.',
        })
        return null
      }

      setSubmission({ status: 'submitting' })

      const symptoms = buildSymptomsPayload(form.answers)
      const dangerSignLabels = mapDangerSignIdsToCdcLabels(form.selectedDangerSigns)

      try {
        const result = await submitCheckIn({
          patientId: patient._id,
          date: getLocalDateString(),
          symptoms,
          activityImpact: form.activityImpact as 'yes' | 'no' | 'not-sure' | 'none',
          dangerSigns: dangerSignLabels,
          note: form.note.trim() ? form.note.trim() : undefined,
        })

        if (form.exposureEntries.length > 0) {
          await logExposureBatch({
            patientId: patient._id,
            checkInId: result.checkInId,
            date: getLocalDateString(),
            entries: form.exposureEntries,
          })
        }

        clearCheckInDraft(patient._id)
        setSubmission({
          status: 'outcome',
          safetyResult: result.safetyResult,
          source: 'backend',
          safetyEvaluationId: result.safetyEvaluationId,
        })

        return {
          safetyResult: result.safetyResult,
          source: 'backend' as const,
          safetyEvaluationId: result.safetyEvaluationId,
          checkInId: result.checkInId,
        }
      } catch {
        const fallbackResult = evaluateCheckInClient(
          symptoms,
          dangerSignLabels,
          form.note.trim() || undefined
        )

        setSubmission({
          status: 'outcome',
          safetyResult: fallbackResult,
          source: 'client_fallback',
        })

        return {
          safetyResult: fallbackResult,
          source: 'client_fallback' as const,
        }
      }
    },
    [patient, submitCheckIn, logExposureBatch]
  )

  const handleAcknowledge = useCallback(
    async (safetyEvaluationId: Id<'safetyEvaluations'>) => {
      if (!patient) return
      setIsAcknowledging(true)
      try {
        await acknowledgeSafety({
          safetyEvaluationId,
          patientId: patient._id,
        })
      } finally {
        setIsAcknowledging(false)
      }
    },
    [acknowledgeSafety, patient]
  )

  const handleRequestExtraction = useCallback(
    async (noteText: string) => {
      if (!patient) return null
      const result = await extractFromNote({
        patientId: patient._id,
        noteText,
      })
      return {
        candidates: result.candidates,
        message: result.message ?? result.rawTextSafety?.status === 'emergency'
          ? 'Urgent safety signals detected in your note. Review emergency guidance.'
          : undefined,
      }
    },
    [extractFromNote, patient]
  )

  if (patient === undefined) {
    return (
      <div
        className="mx-auto flex max-w-2xl flex-col items-center justify-center p-12 text-center"
        aria-busy="true"
        aria-label="Loading recovery profile"
      >
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your recovery profile...</p>
      </div>
    )
  }

  if (patient === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Complete onboarding first</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We could not find a patient profile for your account. Finish onboarding before saving
            daily check-ins.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to onboarding
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <CheckInFlowView
      mode="persisted"
      patientId={patient._id}
      audience={audience}
      onFinish={persistCheckIn}
      isSubmitting={submission.status === 'submitting'}
      submitError={submission.status === 'error' ? submission.message : null}
      onAcknowledge={handleAcknowledge}
      isAcknowledging={isAcknowledging}
      onRequestExtraction={handleRequestExtraction}
    />
  )
}

export function CheckInFlow() {
  if (isE2ETestMode) {
    return <CheckInFlowSession />
  }
  return <CheckInFlowPersisted />
}
