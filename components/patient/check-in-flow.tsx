'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { ProgressField, RadioGroupField, TextareaField } from '@/components/forms'

const checkQuestions = [
  { title: 'How is your pain today?', sub: 'Rate your overall pain at rest on a 0-10 scale.', min: 'No pain', max: 'Severe pain' },
  { title: 'How did you sleep?', sub: 'Think about duration and quality of sleep last night.', min: 'Very poorly', max: 'Very well' },
  { title: 'How mobile do you feel?', sub: 'Compared with yesterday and your baseline.', min: 'Very limited', max: 'Fully mobile' },
  { title: 'How is your emotional recovery?', sub: 'Mental wellness and stress affect healing.', min: 'Very low', max: 'Very positive' },
]

export function CheckInFlow() {
  const [step, setStep] = useState(0)
  const [value, setValue] = useState(3)
  const [symptomQuality, setSymptomQuality] = useState('Aching')
  const [note, setNote] = useState('')

  if (step >= checkQuestions.length) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground">Check-in complete</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Your recovery score is stable at 78. Your care team can now see today&apos;s updated rating.
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

  const q = checkQuestions[step]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow={`Daily check-in · ${step + 1} of ${checkQuestions.length}`}
        title={q.title}
        description={q.sub}
      />
      <Card className="p-7 space-y-6">
        <ProgressField
          label="Your Rating (0 - 10)"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={e => setValue(e.target.value)}
          minLabel={q.min}
          maxLabel={q.max}
          showValueBadge
        />

        {step === 0 && (
          <RadioGroupField
            label="Pain Sensation Type"
            layout="segmented"
            value={symptomQuality}
            onChange={e => setSymptomQuality(e.target.value)}
            options={[
              { label: 'Aching', value: 'Aching' },
              { label: 'Sharp', value: 'Sharp' },
              { label: 'Throbbing', value: 'Throbbing' },
              { label: 'Stiffness', value: 'Stiffness' },
            ]}
          />
        )}

        <TextareaField
          label="Optional check-in note"
          placeholder="Anything you want your clinician or physical therapist to know?"
          value={note}
          onChange={e => setNote(e.target.value)}
          autoResize
          showCount
          maxLength={250}
          hint="Shared securely with Dr. Olivia Brooks"
        />

        <div className="pt-4 border-t border-border flex justify-between">
          <button
            disabled={step === 0}
            onClick={() => setStep(s => s - 1)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-40 hover:bg-muted transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={() => setStep(s => s + 1)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Continue
          </button>
        </div>
      </Card>
    </div>
  )
}
