'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, PhoneCall } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { PageHeader } from '@/components/layouts/page-header'
import { ProgressField, RadioGroupField, TextareaField } from '@/components/forms'

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

const dangerSigns = [
  { id: 'worsening-headache', label: 'A headache that is getting worse and does not go away' },
  { id: 'repeated-vomiting', label: 'Repeated vomiting' },
  { id: 'seizure', label: 'A seizure or convulsion' },
  { id: 'slurred-speech', label: 'Slurred speech or unusual behavior' },
  { id: 'confusion', label: 'Increasing confusion, restlessness, or agitation' },
  { id: 'weakness', label: 'Weakness, numbness, or decreased coordination' },
  { id: 'unequal-pupils', label: 'One pupil larger than the other' },
  { id: 'cannot-wake', label: 'Extreme drowsiness, loss of consciousness, or difficulty waking up' },
] as const

export function CheckInFlow() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [activityImpact, setActivityImpact] = useState('not-sure')
  const [selectedDangerSigns, setSelectedDangerSigns] = useState<string[]>([])
  const [note, setNote] = useState('')

  const safetyStep = symptomQuestions.length
  const totalSteps = symptomQuestions.length + 1
  const symptomTotal = useMemo(
    () => Object.values(answers).reduce((sum, rating) => sum + rating, 0),
    [answers]
  )
  const hasDangerSign = selectedDangerSigns.length > 0

  if (step >= totalSteps && hasDangerSign) {
    return (
      <div className="mx-auto max-w-2xl" aria-live="assertive">
        <Card className="border-destructive p-8" role="alert">
          <div className="grid size-14 place-items-center rounded-full bg-destructive text-white">
            <AlertTriangle className="size-7" />
          </div>
          <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-wider text-destructive">
            Concussion danger sign reported
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
            This prototype cannot determine whether you have an emergency and does not replace a
            medical evaluation.
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
              onClick={() => setStep(safetyStep)}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Review my answers
            </button>
          </div>
        </Card>
      </div>
    )
  }

  if (step >= totalSteps) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center" aria-live="polite">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">
            Demo check-in complete
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Today&apos;s patient-reported symptom total is {symptomTotal} out of 48. This simple total
            helps compare entries over time. It is not a diagnosis, prognosis, or return-to-activity
            decision.
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-muted-foreground">
            The prototype keeps these responses only for this demo session. They have not been sent
            to a clinician or saved to the backend.
          </p>
          <Link
            href="/patient/dashboard"
            className="mt-6 inline-flex rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors"
          >
            Return to overview
          </Link>
        </Card>
      </div>
    )
  }

  if (step === safetyStep) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          eyebrow={`Daily check-in · ${step + 1} of ${totalSteps}`}
          title="Before you finish, check for danger signs"
          description="Select every item that is happening now. Leave all items unselected if none apply."
        />
        <Card className="space-y-6 p-7">
          {hasDangerSign && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-4" role="alert">
              <p className="font-semibold text-destructive">Get emergency medical help now.</p>
              <p className="mt-1 text-sm leading-6 text-foreground">
                Continue to view emergency contact guidance. Do not wait for a routine app response.
              </p>
            </div>
          )}

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground">Danger signs</legend>
            {dangerSigns.map(sign => {
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
            hint="This note remains in the current demo session and is not sent to a clinician."
          />

          <div className="flex justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                hasDangerSign
                  ? 'bg-destructive text-white hover:opacity-90'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {hasDangerSign ? 'View urgent guidance' : 'Finish check-in'}
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const question = symptomQuestions[step]
  const value = answers[question.id] ?? 0

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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

        <div className="flex justify-between border-t border-border pt-4">
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
            onClick={() => setStep(step + 1)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Continue
          </button>
        </div>
      </Card>
    </div>
  )
}
