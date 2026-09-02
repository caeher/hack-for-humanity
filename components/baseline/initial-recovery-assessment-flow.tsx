'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, Check, ChevronRight, Loader2, PhoneCall, Shield } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/layouts/page-header'
import {
  CalendarField,
  NumberField,
  ProgressField,
  RadioGroupField,
  TextareaField,
  TextField,
} from '@/components/forms'
import { MANDATORY_MEDICAL_DISCLAIMER } from '@/lib/safety/presentation'
import { DIAGNOSIS_STATUS_OPTIONS, type DiagnosisStatus } from '@/lib/onboarding'
import {
  BASELINE_ASSESSMENT_STEP_COUNT,
  BASELINE_COMPLETION_TARGET_MS,
  BASELINE_DANGER_SIGNS,
  BASELINE_DEMAND_MARKS,
  BASELINE_DEMAND_SCALE_MAX,
  BASELINE_DEMAND_SCALE_MIN,
  BASELINE_SLEEP_HOURS_MAX,
  BASELINE_SLEEP_HOURS_MIN,
  BASELINE_SYMPTOM_MARKS,
  BASELINE_SYMPTOM_QUESTIONS,
  BASELINE_SYMPTOM_SCALE_MAX,
  BASELINE_SYMPTOM_SCALE_MIN,
  SKIPPABLE_BASELINE_FIELDS,
  type BaselineAssessmentDraft,
  type SkippableBaselineFieldId,
  type SkippedField,
} from '@/lib/baseline'
import {
  computeAnsweredSymptomTotal,
  countAnsweredSymptoms,
  isCompleteSymptomInventory,
} from '@/lib/symptomTotals'
import { cn } from '@/lib/utils'
import { isE2ETestMode } from '@/lib/e2e'

const SYMPTOM_IDS = BASELINE_SYMPTOM_QUESTIONS.map(question => question.id)

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function BaselineAssessmentE2EShell() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-1">
      <PageHeader
        eyebrow={`Initial assessment · Step 1 of ${BASELINE_ASSESSMENT_STEP_COUNT}`}
        title="Capture your starting symptom baseline"
        description="This structured intake organizes your recovery episode — CRI does not diagnose concussion or predict recovery."
      />
      <Card className="space-y-6 p-6 sm:p-8">
        <TextField label="What happened?" hint="Briefly describe the injury or event." />
      </Card>
    </div>
  )
}

export function InitialRecoveryAssessmentFlow() {
  if (isE2ETestMode) {
    return <BaselineAssessmentE2EShell />
  }

  return <InitialRecoveryAssessmentFlowConnected />
}

function InitialRecoveryAssessmentFlowConnected() {
  const router = useRouter()
  const savedDraft = useQuery(api.baseline.getDraft)
  const baselineStatus = useQuery(api.baseline.getStatus)
  const currentPatient = useQuery(api.patients.getMePatient)
  const saveDraft = useMutation(api.baseline.saveDraft)
  const submitBaseline = useMutation(api.baseline.submitBaseline)

  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [emergencyIntercept, setEmergencyIntercept] = useState(false)

  const [incidentDate, setIncidentDate] = useState('')
  const [incidentContext, setIncidentContext] = useState('')
  const [careReceived, setCareReceived] = useState('')
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus | ''>('')
  const [symptoms, setSymptoms] = useState<Record<string, number>>({})
  const [sleepHours, setSleepHours] = useState<number | undefined>(undefined)
  const [schoolWorkDemand, setSchoolWorkDemand] = useState<number | undefined>(undefined)
  const [physicalActivityLevel, setPhysicalActivityLevel] = useState<number | undefined>(undefined)
  const [cognitiveActivityLevel, setCognitiveActivityLevel] = useState<number | undefined>(undefined)
  const [screenTolerance, setScreenTolerance] = useState<number | undefined>(undefined)
  const [skippedFields, setSkippedFields] = useState<SkippedField[]>([])
  const [selectedDangerSigns, setSelectedDangerSigns] = useState<string[]>([])

  const symptomTotal = useMemo(() => computeAnsweredSymptomTotal(symptoms), [symptoms])
  const answeredSymptomCount = useMemo(() => countAnsweredSymptoms(symptoms), [symptoms])

  useEffect(() => {
    if (baselineStatus?.completed && baselineStatus.nextRoute) {
      router.replace(baselineStatus.nextRoute)
    }
  }, [baselineStatus, router])

  useEffect(() => {
    if (savedDraft === undefined || hydrated) return

    if (savedDraft) {
      setStep(savedDraft.step)
      if (savedDraft.startedAt) setStartedAt(savedDraft.startedAt)
      if (savedDraft.incidentDate) setIncidentDate(savedDraft.incidentDate)
      if (savedDraft.incidentContext) setIncidentContext(savedDraft.incidentContext)
      if (savedDraft.careReceived) setCareReceived(savedDraft.careReceived)
      if (savedDraft.diagnosisStatus) setDiagnosisStatus(savedDraft.diagnosisStatus)
      if (savedDraft.symptoms) {
        const nextSymptoms: Record<string, number> = {}
        for (const [key, value] of Object.entries(savedDraft.symptoms)) {
          if (typeof value === 'number') nextSymptoms[key] = value
        }
        setSymptoms(nextSymptoms)
      }
      if (savedDraft.sleepHours !== undefined) setSleepHours(savedDraft.sleepHours)
      if (savedDraft.schoolWorkDemand !== undefined) setSchoolWorkDemand(savedDraft.schoolWorkDemand)
      if (savedDraft.physicalActivityLevel !== undefined) {
        setPhysicalActivityLevel(savedDraft.physicalActivityLevel)
      }
      if (savedDraft.cognitiveActivityLevel !== undefined) {
        setCognitiveActivityLevel(savedDraft.cognitiveActivityLevel)
      }
      if (savedDraft.screenTolerance !== undefined) setScreenTolerance(savedDraft.screenTolerance)
      if (savedDraft.skippedFields) {
        setSkippedFields(savedDraft.skippedFields as SkippedField[])
      }
      if (savedDraft.dangerSigns) setSelectedDangerSigns(savedDraft.dangerSigns)
    } else if (currentPatient?.diagnosisStatus) {
      setDiagnosisStatus(currentPatient.diagnosisStatus)
    }

    setHydrated(true)
  }, [savedDraft, hydrated, currentPatient])

  const isFieldSkipped = useCallback(
    (fieldId: SkippableBaselineFieldId) => skippedFields.some(entry => entry.fieldId === fieldId),
    [skippedFields]
  )

  const toggleSkipField = (fieldId: SkippableBaselineFieldId, skip: boolean) => {
    if (skip) {
      const reason = 'Prefer not to answer right now'
      setSkippedFields(current => [...current.filter(entry => entry.fieldId !== fieldId), { fieldId, reason }])
      if (fieldId === 'careReceived') setCareReceived('')
      if (fieldId === 'sleepHours') setSleepHours(undefined)
      if (fieldId === 'schoolWorkDemand') setSchoolWorkDemand(undefined)
      if (fieldId === 'physicalActivityLevel') setPhysicalActivityLevel(undefined)
      if (fieldId === 'cognitiveActivityLevel') setCognitiveActivityLevel(undefined)
      if (fieldId === 'screenTolerance') setScreenTolerance(undefined)
      return
    }
    setSkippedFields(current => current.filter(entry => entry.fieldId !== fieldId))
  }

  const buildDraftPayload = useCallback(
    (draftStep: number): BaselineAssessmentDraft => ({
      step: draftStep,
      startedAt: startedAt ?? undefined,
      incidentDate: incidentDate || undefined,
      incidentContext: incidentContext || undefined,
      careReceived: careReceived || undefined,
      diagnosisStatus: diagnosisStatus || undefined,
      symptoms,
      sleepHours,
      schoolWorkDemand,
      physicalActivityLevel,
      cognitiveActivityLevel,
      screenTolerance,
      skippedFields,
      dangerSigns: selectedDangerSigns,
    }),
    [
      startedAt,
      incidentDate,
      incidentContext,
      careReceived,
      diagnosisStatus,
      symptoms,
      sleepHours,
      schoolWorkDemand,
      physicalActivityLevel,
      cognitiveActivityLevel,
      screenTolerance,
      skippedFields,
      selectedDangerSigns,
    ]
  )

  const persistDraft = useCallback(
    async (draftStep: number) => {
      const effectiveStartedAt = startedAt ?? Date.now()
      if (!startedAt) setStartedAt(effectiveStartedAt)

      setIsSaving(true)
      try {
        await saveDraft({
          ...buildDraftPayload(draftStep),
          startedAt: effectiveStartedAt,
        })
      } finally {
        setIsSaving(false)
      }
    },
    [saveDraft, buildDraftPayload, startedAt]
  )

  const validateLikertClient = (value: number | undefined, fieldName: string): string | null => {
    if (value === undefined) return null
    if (!Number.isInteger(value) || value < BASELINE_SYMPTOM_SCALE_MIN || value > BASELINE_SYMPTOM_SCALE_MAX) {
      return `${fieldName} must be an integer between ${BASELINE_SYMPTOM_SCALE_MIN} and ${BASELINE_SYMPTOM_SCALE_MAX}.`
    }
    return null
  }

  const validateStep = (currentStep: number): boolean => {
    const nextErrors: Record<string, string> = {}

    if (currentStep === 1) {
      if (!incidentDate) nextErrors.incidentDate = 'Please enter the date of the injury or event.'
      if (!incidentContext.trim() || incidentContext.trim().length < 10) {
        nextErrors.incidentContext = 'Please briefly describe what happened (at least 10 characters).'
      }
    }

    if (currentStep === 2) {
      if (!diagnosisStatus) {
        nextErrors.diagnosisStatus =
          'Please indicate whether a healthcare professional has diagnosed concussion or mTBI.'
      }
    }

    if (currentStep === 3) {
      if (!isCompleteSymptomInventory(symptoms, SYMPTOM_IDS)) {
        nextErrors.symptoms = 'Please rate all eight symptoms on the 0–6 scale before continuing.'
      }
      for (const question of BASELINE_SYMPTOM_QUESTIONS) {
        const rating = symptoms[question.id]
        if (rating !== undefined) {
          const likertError = validateLikertClient(rating, question.title)
          if (likertError) nextErrors[`symptom-${question.id}`] = likertError
        }
      }
    }

    if (currentStep === 4) {
      if (!isFieldSkipped('sleepHours') && sleepHours !== undefined) {
        if (sleepHours < BASELINE_SLEEP_HOURS_MIN || sleepHours > BASELINE_SLEEP_HOURS_MAX) {
          nextErrors.sleepHours = `Sleep hours must be between ${BASELINE_SLEEP_HOURS_MIN} and ${BASELINE_SLEEP_HOURS_MAX}.`
        }
      }
      const demandFields: Array<{ value?: number; label: string; key: string }> = [
        { value: schoolWorkDemand, label: 'School or work demand', key: 'schoolWorkDemand' },
        { value: physicalActivityLevel, label: 'Physical activity level', key: 'physicalActivityLevel' },
        { value: cognitiveActivityLevel, label: 'Cognitive activity level', key: 'cognitiveActivityLevel' },
        { value: screenTolerance, label: 'Screen tolerance', key: 'screenTolerance' },
      ]
      for (const field of demandFields) {
        if (field.value !== undefined) {
          const err = validateLikertClient(field.value, field.label)
          if (err) nextErrors[field.key] = err
        }
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep(step)) return
    const nextStep = Math.min(step + 1, BASELINE_ASSESSMENT_STEP_COUNT - 1)
    await persistDraft(nextStep)
    setStep(nextStep)
  }

  const handleBack = async () => {
    const prevStep = Math.max(step - 1, 0)
    await persistDraft(prevStep)
    setStep(prevStep)
  }

  const handleSubmit = async () => {
    if (!validateStep(3) || !validateStep(2) || !validateStep(1)) {
      setStep(3)
      return
    }
    if (!diagnosisStatus) return

    const effectiveStartedAt = startedAt ?? Date.now()
    const completionDurationMs = Date.now() - effectiveStartedAt

    setIsSubmitting(true)
    setErrors({})
    setEmergencyIntercept(false)

    try {
      const result = await submitBaseline({
        incidentDate,
        incidentContext: incidentContext.trim(),
        careReceived: isFieldSkipped('careReceived') ? undefined : careReceived.trim() || undefined,
        diagnosisStatus,
        symptoms: {
          headache: symptoms.headache,
          dizziness: symptoms.dizziness,
          nausea: symptoms.nausea,
          lightSensitivity: symptoms.lightSensitivity,
          noiseSensitivity: symptoms.noiseSensitivity,
          fatigue: symptoms.fatigue,
          concentration: symptoms.concentration,
          sleepDifficulty: symptoms.sleepDifficulty,
        },
        sleepHours: isFieldSkipped('sleepHours') ? undefined : sleepHours,
        schoolWorkDemand: isFieldSkipped('schoolWorkDemand') ? undefined : schoolWorkDemand,
        physicalActivityLevel: isFieldSkipped('physicalActivityLevel') ? undefined : physicalActivityLevel,
        cognitiveActivityLevel: isFieldSkipped('cognitiveActivityLevel') ? undefined : cognitiveActivityLevel,
        screenTolerance: isFieldSkipped('screenTolerance') ? undefined : screenTolerance,
        skippedFields,
        dangerSigns: selectedDangerSigns,
        completionDurationMs,
        startedAt: effectiveStartedAt,
      })

      if (result.blocked) {
        setEmergencyIntercept(true)
        return
      }

      router.push(result.nextRoute)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to save your initial baseline.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (savedDraft === undefined || !hydrated) {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center"
        aria-busy="true"
        aria-label="Loading your saved assessment progress"
      >
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your saved progress…</p>
      </div>
    )
  }

  if (emergencyIntercept) {
    return (
      <div className="mx-auto max-w-2xl" aria-live="assertive">
        <Card className="border-destructive p-8" role="alert">
          <div className="grid size-14 place-items-center rounded-full bg-destructive text-white">
            <AlertTriangle className="size-7" />
          </div>
          <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-wider text-destructive">
            Danger sign reported
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
            Get emergency medical help now
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            You selected one or more danger signs that can require immediate medical attention.
            In the United States, call 911 or go to the nearest emergency department. Outside the
            United States, call your local emergency number.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            CRI cannot determine whether you have an emergency and does not provide a medical
            diagnosis. Your baseline was not saved while danger signs are active.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="tel:911"
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <PhoneCall className="size-4" /> Call 911 in the US
            </a>
            <button
              type="button"
              onClick={() => {
                setEmergencyIntercept(false)
                setStep(BASELINE_ASSESSMENT_STEP_COUNT - 2)
              }}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Review my answers
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const stepLabels = [
    'Welcome',
    'Incident context',
    'Diagnosis status',
    'Symptom baseline',
    'Daily context',
    'Review & save',
  ]

  const today = formatDateForInput(new Date())

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-1">
      <PageHeader
        eyebrow={`Initial assessment · Step ${step + 1} of ${BASELINE_ASSESSMENT_STEP_COUNT}`}
        title="Capture your starting symptom baseline"
        description="Most people finish in under five minutes. Your answers organize this recovery episode — CRI does not diagnose concussion or label you as recovered."
      />

      <nav aria-label="Assessment progress" className="flex gap-1">
        {stepLabels.map((label, index) => (
          <div
            key={label}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-primary' : 'bg-muted'
            )}
            aria-hidden="true"
            title={label}
          />
        ))}
      </nav>
      <p className="sr-only" aria-live="polite">
        Step {step + 1} of {BASELINE_ASSESSMENT_STEP_COUNT}: {stepLabels[step]}
      </p>

      <Card className="space-y-6 p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <Shield className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-2 text-sm leading-6 text-muted-foreground">
                <p>
                  This non-diagnostic intake records your starting symptom severity (0–6 scale),
                  daily context, and any danger signs. It helps compare entries over time — it is
                  not a clinical rating or medical diagnosis.
                </p>
                <p className="text-xs">{MANDATORY_MEDICAL_DISCLAIMER}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Typical completion time is under five minutes ({Math.round(BASELINE_COMPLETION_TARGET_MS / 60000)} min target).
              You can skip optional context questions and explain why later.
            </p>
          </div>
        )}

        {step === 1 && (
          <fieldset className="space-y-5">
            <legend className="sr-only">Incident context</legend>
            <CalendarField
              label="Date of injury or event"
              hint="Why we ask: anchors your recovery episode timeline for symptom comparisons."
              required
              max={today}
              value={incidentDate}
              onChange={event => setIncidentDate(event.target.value)}
              error={errors.incidentDate}
            />
            <TextareaField
              label="What happened?"
              hint="Why we ask: brief context helps you and your clinician review the episode — not to diagnose."
              required
              rows={4}
              value={incidentContext}
              onChange={event => setIncidentContext(event.target.value)}
              error={errors.incidentContext}
              placeholder="Example: Fell during practice and hit my head on the ground. Felt dazed but stayed awake."
            />
            {!isFieldSkipped('careReceived') ? (
              <TextareaField
                label="Care already received (optional)"
                hint={SKIPPABLE_BASELINE_FIELDS.find(field => field.id === 'careReceived')?.whyItMatters}
                rows={3}
                value={careReceived}
                onChange={event => setCareReceived(event.target.value)}
                placeholder="Example: Urgent care visit, school athletic trainer evaluation, ER visit, or none yet."
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                Care already received skipped: {skippedFields.find(entry => entry.fieldId === 'careReceived')?.reason}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={isFieldSkipped('careReceived')}
                onCheckedChange={checked => toggleSkipField('careReceived', checked === true)}
              />
              Skip care already received for now
            </label>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Diagnosis status</legend>
            <RadioGroupField
              label="Has a healthcare professional diagnosed concussion or mTBI?"
              hint="Why we ask: records what you were told — CRI never labels you as diagnosed or recovered."
              layout="cards"
              columns={1}
              required
              error={errors.diagnosisStatus}
              value={diagnosisStatus}
              onChange={event => setDiagnosisStatus(event.target.value as DiagnosisStatus)}
              options={DIAGNOSIS_STATUS_OPTIONS.map(option => ({
                label: option.label,
                value: option.value,
                description: option.description,
              }))}
            />
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Symptom baseline</legend>
            <p className="text-sm text-muted-foreground">
              Rate each symptom from 0 (none) to 6 (severe). Unrated symptoms are never treated as
              zero — all eight are required for this baseline.
            </p>
            {errors.symptoms && <p className="text-sm text-destructive">{errors.symptoms}</p>}
            {BASELINE_SYMPTOM_QUESTIONS.map(question => (
              <ProgressField
                key={question.id}
                label={question.title}
                sublabel={question.sub}
                hint={question.whyItMatters}
                min={BASELINE_SYMPTOM_SCALE_MIN}
                max={BASELINE_SYMPTOM_SCALE_MAX}
                step={1}
                marks={[...BASELINE_SYMPTOM_MARKS]}
                value={symptoms[question.id] ?? BASELINE_SYMPTOM_SCALE_MIN}
                onChange={event =>
                  setSymptoms(current => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
                error={errors[`symptom-${question.id}`]}
              />
            ))}
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              Patient-reported symptom total so far: {symptomTotal} / 48 across {answeredSymptomCount}{' '}
              rated dimensions. This is descriptive only — not a composite clinical rating.
            </p>
          </fieldset>
        )}

        {step === 4 && (
          <fieldset className="space-y-6">
            <legend className="sr-only">Daily context</legend>
            <p className="text-sm text-muted-foreground">
              These optional questions add pacing context. You may skip any field you are not ready to
              answer.
            </p>

            {SKIPPABLE_BASELINE_FIELDS.filter(field => field.id !== 'careReceived').map(field => {
              const skipped = isFieldSkipped(field.id)
              return (
                <div key={field.id} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{field.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.whyItMatters}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={skipped}
                        onCheckedChange={checked => toggleSkipField(field.id, checked === true)}
                      />
                      Skip
                    </label>
                  </div>

                  {!skipped && field.id === 'sleepHours' && (
                    <NumberField
                      label="Hours per night"
                      min={BASELINE_SLEEP_HOURS_MIN}
                      max={BASELINE_SLEEP_HOURS_MAX}
              value={sleepHours}
              onChange={event => setSleepHours(event.target.value)}
                      error={errors.sleepHours}
                    />
                  )}

                  {!skipped && field.id !== 'sleepHours' && (
                    <ProgressField
                      label={field.label}
                      min={BASELINE_DEMAND_SCALE_MIN}
                      max={BASELINE_DEMAND_SCALE_MAX}
                      step={1}
                      marks={[...BASELINE_DEMAND_MARKS]}
                      value={
                        field.id === 'schoolWorkDemand'
                          ? (schoolWorkDemand ?? BASELINE_DEMAND_SCALE_MIN)
                          : field.id === 'physicalActivityLevel'
                            ? (physicalActivityLevel ?? BASELINE_DEMAND_SCALE_MIN)
                            : field.id === 'cognitiveActivityLevel'
                              ? (cognitiveActivityLevel ?? BASELINE_DEMAND_SCALE_MIN)
                              : (screenTolerance ?? BASELINE_DEMAND_SCALE_MIN)
                      }
                      onChange={event => {
                        const value = event.target.value
                        if (field.id === 'schoolWorkDemand') setSchoolWorkDemand(value)
                        if (field.id === 'physicalActivityLevel') setPhysicalActivityLevel(value)
                        if (field.id === 'cognitiveActivityLevel') setCognitiveActivityLevel(value)
                        if (field.id === 'screenTolerance') setScreenTolerance(value)
                      }}
                      error={errors[field.id]}
                    />
                  )}

                  {skipped && (
                    <p className="text-xs text-muted-foreground">
                      Skipped: {skippedFields.find(entry => entry.fieldId === field.id)?.reason}
                    </p>
                  )}
                </div>
              )
            })}
          </fieldset>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-semibold text-foreground">Review your baseline</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Incident date: {incidentDate || '—'}</li>
                <li>Diagnosis status: {diagnosisStatus || '—'} (self-reported, not a CRI diagnosis)</li>
                <li>
                  Patient-reported symptom total: {symptomTotal} / 48 ({answeredSymptomCount} dimensions)
                </li>
                <li>Skipped optional fields: {skippedFields.length}</li>
              </ul>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">
                Danger signs happening now
              </legend>
              <p className="text-xs leading-5 text-muted-foreground">
                Select every item that applies right now. Danger signs interrupt completion and show
                emergency guidance.
              </p>
              {BASELINE_DANGER_SIGNS.map(sign => {
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

            {errors.submit && <p className="text-sm text-destructive">{errors.submit}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <div className="text-xs text-muted-foreground">
            {isSaving ? 'Saving progress…' : 'Progress saved automatically'}
          </div>
          <div className="flex flex-wrap gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => void handleBack()}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Back
              </button>
            )}
            {step < BASELINE_ASSESSMENT_STEP_COUNT - 1 ? (
              <button
                type="button"
                onClick={() => void handleNext()}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Continue <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Running safety check…
                  </>
                ) : (
                  <>
                    <Check className="size-4" /> Save baseline
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
