'use client'

import React from 'react'
import Link from 'next/link'
import { Activity, ClipboardCheck, HeartPulse } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard, TrendChart, SymptomMethodologyPanel } from '@/components/dashboard'
import { CheckInHistory } from '@/components/patient/check-in-history'
import { ExposureEntryList } from '@/components/patient/exposure-entry-list'
import { computeDescriptiveTrend, METHODOLOGY_COPY } from '@/lib/symptomMethodology'

const demoTrendPoints = [
  { date: '2026-08-25', symptomTotal: 27 },
  { date: '2026-08-26', symptomTotal: 25 },
  { date: '2026-08-27', symptomTotal: 23 },
  { date: '2026-08-28', symptomTotal: 24 },
  { date: '2026-08-29', symptomTotal: 20 },
  { date: '2026-08-30', symptomTotal: 18 },
  { date: '2026-09-01', symptomTotal: 15 },
]

export function RecoveryTimeline() {
  const trend = computeDescriptiveTrend(demoTrendPoints)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your progress"
        title="Recovery timeline"
        description="A longitudinal view of patient-reported symptom totals. Not a clinical recovery score."
      />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Recovery trajectory</h2>
          <p className="text-sm text-muted-foreground">{METHODOLOGY_COPY.metricName} and headache rating</p>
          <div className="mt-4">
            <TrendChart clinical />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{trend.summaryText}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{trend.disclaimerText}</p>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Milestones</h2>
          <div className="mt-5 flex flex-col gap-5">
            {[
              'Head injury reported · Aug 19',
              'Initial clinical evaluation · Aug 20',
              'Daily tracking started · Aug 21',
              'Follow-up appointment · Sep 3',
            ].map((x, i) => (
              <div className="flex gap-3" key={x}>
                <span
                  className={`mt-1 size-3 rounded-full ${
                    i < 3 ? 'bg-primary' : 'border border-border bg-card'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{x}</p>
                  <p className="text-xs text-muted-foreground">
                    {i < 3 ? 'Recorded' : 'Upcoming appointment'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <CheckInHistory />
      <ExposureEntryList />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Symptom total" value="15 / 48" detail="Patient-reported today" icon={Activity} />
        <StatCard label="Sleep" value="6h 48m" detail="Self-reported duration" icon={HeartPulse} />
        <StatCard
          label="Check-ins"
          value="11 / 12"
          detail="One day not recorded (gap shown, not imputed)"
          icon={ClipboardCheck}
        />
      </div>
      <SymptomMethodologyPanel compact />
      <p className="text-sm text-muted-foreground">
        Need to log today?{' '}
        <Link href="/patient/check-in" className="font-medium text-foreground underline-offset-4 hover:underline">
          Open daily check-in
        </Link>
      </p>
    </div>
  )
}
