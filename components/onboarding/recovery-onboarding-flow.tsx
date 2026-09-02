'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { Check, ChevronRight, Loader2, Shield } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import {
  CalendarField,
  CheckboxField,
  RadioGroupField,
  SelectField,
  SwitchField,
  TextField,
} from '@/components/forms'
import { MANDATORY_MEDICAL_DISCLAIMER } from '@/lib/safety/presentation'
import {
  AGE_BAND_OPTIONS,
  DEFAULT_COMMUNICATION_PREFERENCES,
  DIAGNOSIS_STATUS_OPTIONS,
  ONBOARDING_STEP_COUNT,
  TIMEZONE_OPTIONS,
  TRACKING_RELATIONSHIP_OPTIONS,
  type AgeBand,
  type CommunicationPreferences,
  type DiagnosisStatus,
  type OnboardingDraft,
  type TrackingRelationship,
} from '@/lib/onboarding'
import { cn } from '@/lib/utils'
import { isE2ETestMode } from '@/lib/e2e'

function detectBrowserTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return TIMEZONE_OPTIONS.some(o => o.value === tz) ? tz : 'America/New_York'
  } catch {
    return 'America/New_York'
  }
}

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function RecoveryOnboardingE2EShell() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-1">
      <PageHeader
        eyebrow={`Recovery onboarding · Step 1 of ${ONBOARDING_STEP_COUNT}`}
        title="Set up your recovery profile"
        description="This takes a few minutes. Your answers help organize symptom tracking — CRI does not diagnose or predict recovery."
      />
      <Card className="space-y-6 p-6 sm:p-8">
        <RadioGroupField
          label="Who is doing the tracking?"
          layout="cards"
          columns={1}
          options={TRACKING_RELATIONSHIP_OPTIONS.map(option => ({
            label: option.label,
            value: option.value,
            description: option.description,
          }))}
        />
      </Card>
    </div>
  )
}

export function RecoveryOnboardingFlow() {
  if (isE2ETestMode) {
    return <RecoveryOnboardingE2EShell />
  }

  return <RecoveryOnboardingFlowConnected />
}

function RecoveryOnboardingFlowConnected() {
  const router = useRouter()
  const savedDraft = useQuery(api.onboarding.getDraft)
  const currentUser = useQuery(api.users.getMe)
  const onboardingStatus = useQuery(api.onboarding.getStatus)
  const saveDraft = useMutation(api.onboarding.saveDraft)
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding)

  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [trackingRelationship, setTrackingRelationship] = useState<TrackingRelationship | ''>('')
  const [preferredName, setPreferredName] = useState('')
  const [ageBand, setAgeBand] = useState<AgeBand | ''>('')
  const [incidentDate, setIncidentDate] = useState('')
  const [timeZone, setTimeZone] = useState(detectBrowserTimeZone)
  const [diagnosisStatus, setDiagnosisStatus] = useState<DiagnosisStatus | ''>('')
  const [communicationPreferences, setCommunicationPreferences] = useState<CommunicationPreferences>(
    DEFAULT_COMMUNICATION_PREFERENCES
  )
  const [consentAcknowledged, setConsentAcknowledged] = useState(false)
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)
  const [limitationsAcknowledged, setLimitationsAcknowledged] = useState(false)

  const professionalOptionDisabled =
    currentUser !== undefined &&
    currentUser !== null &&
    currentUser.role !== 'clinician' &&
    currentUser.role !== 'admin'

  const trackingOptions = useMemo(
    () =>
      TRACKING_RELATIONSHIP_OPTIONS.map(option => ({
        ...option,
        disabled: option.value === 'professional' ? professionalOptionDisabled : false,
      })),
    [professionalOptionDisabled]
  )

  useEffect(() => {
    if (onboardingStatus?.completed && onboardingStatus.nextRoute) {
      router.replace(onboardingStatus.nextRoute)
    }
  }, [onboardingStatus, router])

  useEffect(() => {
    if (savedDraft === undefined || hydrated) return

    if (savedDraft) {
      setStep(savedDraft.step)
      if (savedDraft.trackingRelationship) setTrackingRelationship(savedDraft.trackingRelationship)
      if (savedDraft.preferredName) setPreferredName(savedDraft.preferredName)
      if (savedDraft.ageBand) setAgeBand(savedDraft.ageBand)
      if (savedDraft.incidentDate) setIncidentDate(savedDraft.incidentDate)
      if (savedDraft.timeZone) setTimeZone(savedDraft.timeZone)
      if (savedDraft.diagnosisStatus) setDiagnosisStatus(savedDraft.diagnosisStatus)
      if (savedDraft.communicationPreferences) {
        setCommunicationPreferences(savedDraft.communicationPreferences)
      }
      if (savedDraft.consentAcknowledged) setConsentAcknowledged(savedDraft.consentAcknowledged)
      if (savedDraft.privacyAcknowledged) setPrivacyAcknowledged(savedDraft.privacyAcknowledged)
      if (savedDraft.limitationsAcknowledged) {
        setLimitationsAcknowledged(savedDraft.limitationsAcknowledged)
      }
    } else if (currentUser?.name) {
      setPreferredName(currentUser.name.split(' ')[0] ?? '')
    }

    setHydrated(true)
  }, [savedDraft, hydrated, currentUser])

  const buildDraftPayload = useCallback(
    (draftStep: number): OnboardingDraft => ({
      step: draftStep,
      trackingRelationship: trackingRelationship || undefined,
      preferredName: preferredName || undefined,
      ageBand: ageBand || undefined,
      incidentDate: incidentDate || undefined,
      timeZone: timeZone || undefined,
      diagnosisStatus: diagnosisStatus || undefined,
      communicationPreferences,
      consentAcknowledged,
      privacyAcknowledged,
      limitationsAcknowledged,
    }),
    [
      trackingRelationship,
      preferredName,
      ageBand,
      incidentDate,
      timeZone,
      diagnosisStatus,
      communicationPreferences,
      consentAcknowledged,
      privacyAcknowledged,
      limitationsAcknowledged,
    ]
  )

  const persistDraft = useCallback(
    async (draftStep: number) => {
      setIsSaving(true)
      try {
        await saveDraft(buildDraftPayload(draftStep))
      } finally {
        setIsSaving(false)
      }
    },
    [saveDraft, buildDraftPayload]
  )

  const validateStep = (currentStep: number): boolean => {
    const nextErrors: Record<string, string> = {}

    if (currentStep === 0) {
      if (!trackingRelationship) {
        nextErrors.trackingRelationship = 'Please select who is doing the tracking.'
      }
    }

    if (currentStep === 1) {
      if (!preferredName.trim()) {
        nextErrors.preferredName = 'A preferred name is required.'
      }
      if (!ageBand) {
        nextErrors.ageBand = 'Please select an age range.'
      }
      if (!incidentDate) {
        nextErrors.incidentDate = 'Please enter the date of the head injury or event.'
      }
      if (!timeZone) {
        nextErrors.timeZone = 'Please select your time zone.'
      }
    }

    if (currentStep === 2) {
      if (!diagnosisStatus) {
        nextErrors.diagnosisStatus =
          'Please indicate whether a healthcare professional has diagnosed concussion or mTBI.'
      }
    }

    if (currentStep === 4) {
      if (!consentAcknowledged) {
        nextErrors.consent = 'Consent is required to create your recovery profile.'
      }
      if (!privacyAcknowledged) {
        nextErrors.privacy = 'Please acknowledge the privacy notice.'
      }
      if (!limitationsAcknowledged) {
        nextErrors.limitations = 'Please acknowledge the medical limitations.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleNext = async () => {
    if (!validateStep(step)) return
    const nextStep = Math.min(step + 1, ONBOARDING_STEP_COUNT - 1)
    await persistDraft(nextStep)
    setStep(nextStep)
  }

  const handleBack = async () => {
    const prevStep = Math.max(step - 1, 0)
    await persistDraft(prevStep)
    setStep(prevStep)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return
    if (!trackingRelationship || !ageBand || !diagnosisStatus) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await completeOnboarding({
        trackingRelationship,
        preferredName: preferredName.trim(),
        ageBand,
        incidentDate,
        timeZone,
        diagnosisStatus,
        communicationPreferences,
        consentAcknowledged,
        privacyAcknowledged,
        limitationsAcknowledged,
      })
      router.push(result.nextRoute)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to save your recovery profile.',
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
        aria-label="Loading your saved progress"
      >
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your saved progress…</p>
      </div>
    )
  }

  const stepLabels = [
    'Who is tracking',
    'Recovery profile',
    'Diagnosis status',
    'Communication',
    'Consent & save',
  ]

  const today = formatDateForInput(new Date())

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-1">
      <PageHeader
        eyebrow={`Recovery onboarding · Step ${step + 1} of ${ONBOARDING_STEP_COUNT}`}
        title="Set up your recovery profile"
        description="This takes a few minutes. Your answers help organize symptom tracking — CRI does not diagnose or predict recovery."
      />

      <nav aria-label="Onboarding progress" className="flex gap-1">
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
        Step {step + 1} of {ONBOARDING_STEP_COUNT}: {stepLabels[step]}
      </p>

      <Card className="space-y-6 p-6 sm:p-8">
        {step === 0 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Who is doing the tracking</legend>
            <RadioGroupField
              label="Who is doing the tracking?"
              hint="This helps us tailor reminders and language. It does not change your clinical care."
              layout="cards"
              columns={1}
              required
              error={errors.trackingRelationship}
              value={trackingRelationship}
              onChange={event =>
                setTrackingRelationship(event.target.value as TrackingRelationship)
              }
              options={trackingOptions.map(option => ({
                label: option.label,
                value: option.value,
                description: option.disabled
                  ? 'Requires a clinician or administrator account.'
                  : option.description,
                disabled: option.disabled,
              }))}
            />
          </fieldset>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <TextField
              label={
                trackingRelationship === 'caregiver'
                  ? 'Preferred name of the person recovering'
                  : 'Your preferred name'
              }
              hint="Used in reminders and reports. Only your first name or nickname is needed."
              required
              value={preferredName}
              onChange={event => setPreferredName(event.target.value)}
              error={errors.preferredName}
              autoComplete="nickname"
            />

            <SelectField
              label="Age range"
              hint="Age bands help us show age-appropriate educational content. Exact birth date is optional and not collected here."
              required
              value={ageBand}
              onChange={event => setAgeBand(event.target.value as AgeBand)}
              error={errors.ageBand}
              options={AGE_BAND_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
              placeholder="Select an age range"
            />

            <CalendarField
              label="Date of head injury or event"
              hint="Approximate dates are acceptable. This anchors your recovery timeline — not a diagnosis."
              required
              value={incidentDate}
              onChange={event => setIncidentDate(event.target.value)}
              error={errors.incidentDate}
              maxDate={today}
            />

            <SelectField
              label="Time zone"
              hint="Used to schedule check-in reminders at appropriate times."
              required
              value={timeZone}
              onChange={event => setTimeZone(event.target.value)}
              error={errors.timeZone}
              options={TIMEZONE_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
            />
          </div>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="sr-only">Professional diagnosis status</legend>
            <RadioGroupField
              label="Has a healthcare professional diagnosed concussion or mild traumatic brain injury (mTBI)?"
              hint="CRI does not assume every head injury is a concussion. Your answer is stored exactly as you report it — we never infer a diagnosis."
              layout="cards"
              columns={1}
              required
              error={errors.diagnosisStatus}
              value={diagnosisStatus}
              onChange={event => setDiagnosisStatus(event.target.value as DiagnosisStatus)}
              options={DIAGNOSIS_STATUS_OPTIONS.map(o => ({
                label: o.label,
                value: o.value,
                description: o.description,
              }))}
            />
          </fieldset>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Choose how you would like to receive recovery reminders. You can change these later
              in profile settings.
            </p>
            <SwitchField
              label="Email reminders for daily check-ins"
              hint="Sent to the email on your account."
              checked={communicationPreferences.emailReminders}
              onCheckedChange={checked =>
                setCommunicationPreferences(prev => ({
                  ...prev,
                  emailReminders: checked === true,
                }))
              }
            />
            <SwitchField
              label="SMS reminders (optional)"
              sublabel="Optional — requires a phone number on file"
              hint="Text message reminders are optional and can be added later in profile settings."
              checked={communicationPreferences.smsReminders}
              onCheckedChange={checked =>
                setCommunicationPreferences(prev => ({
                  ...prev,
                  smsReminders: checked === true,
                }))
              }
            />
            <SwitchField
              label="Weekly recovery summary"
              hint="A brief summary of your logged symptoms — descriptive totals only, not a diagnosis or score."
              checked={communicationPreferences.weeklySummary}
              onCheckedChange={checked =>
                setCommunicationPreferences(prev => ({
                  ...prev,
                  weeklySummary: checked === true,
                }))
              }
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
              <Shield className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-6 text-foreground">{MANDATORY_MEDICAL_DISCLAIMER}</p>
            </div>

            <CheckboxField
              label="I consent to creating a recovery tracking profile"
              description="I understand CRI organizes symptom logs and educational content. It does not provide medical advice, diagnosis, or treatment."
              required
              checked={consentAcknowledged}
              onCheckedChange={checked => setConsentAcknowledged(checked === true)}
              error={errors.consent}
              cardVariant
            />

            <CheckboxField
              label="I have read the privacy notice"
              description="Only the information needed for recovery tracking is collected. Optional fields are clearly marked."
              required
              checked={privacyAcknowledged}
              onCheckedChange={checked => setPrivacyAcknowledged(checked === true)}
              error={errors.privacy}
              cardVariant
            />

            <CheckboxField
              label="I understand the medical limitations of this tool"
              description="CRI cannot clear me for sports, work, or driving, and cannot predict my recovery timeline."
              required
              checked={limitationsAcknowledged}
              onCheckedChange={checked => setLimitationsAcknowledged(checked === true)}
              error={errors.limitations}
              cardVariant
            />

            <div className="rounded-lg border border-border p-4 text-sm leading-6 text-muted-foreground">
              <p className="font-semibold text-foreground">Review before saving</p>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt>Tracking</dt>
                  <dd className="text-right text-foreground">
                    {TRACKING_RELATIONSHIP_OPTIONS.find(o => o.value === trackingRelationship)
                      ?.label ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Name</dt>
                  <dd className="text-right text-foreground">{preferredName || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Event date</dt>
                  <dd className="text-right text-foreground">{incidentDate || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Diagnosis reported</dt>
                  <dd className="text-right text-foreground">
                    {DIAGNOSIS_STATUS_OPTIONS.find(o => o.value === diagnosisStatus)?.label ??
                      '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {errors.submit && (
              <p className="text-sm text-destructive" role="alert">
                {errors.submit}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isSaving && (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                <span>Saving progress…</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Back
              </button>
            )}
            {step < ONBOARDING_STEP_COUNT - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Continue
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Saving profile…
                  </>
                ) : (
                  <>
                    <Check className="size-4" aria-hidden="true" />
                    Create recovery profile
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
