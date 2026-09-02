'use client'

import React, { useState } from 'react'
import { Plus, Activity, HeartPulse, Check, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { InsightCard } from '@/components/dashboard/insight-card'
import { ExplanationView } from '@/components/explanation'
import { buildPatternInsightProvenance } from '@/lib/provenance'
import { ClinicalEncounterModal } from './clinical-encounter-modal'

export interface PatientDetailViewProps {
  id?: string
}

export function PatientDetailView({ id = 'P-1042' }: PatientDetailViewProps) {
  const [showNoteModal, setShowNoteModal] = useState(false)
  const insightProvenance = buildPatternInsightProvenance({
    title: 'Shorter sleep observed alongside higher next-day headache ratings',
    description:
      'On 4 of 6 nights with less than 7 hours of sleep, the next check-in included a higher headache rating.',
    patternType: 'short_sleep_lagged_headache',
    status: 'available',
    confidence: 'moderate',
    sampleCount: 6,
    matchCount: 4,
    inputDateRangeStart: '2026-08-01',
    inputDateRangeEnd: '2026-08-31',
    algorithmVersion: '1.0.0',
    effectDirection: 'positive',
    checkInCount: 12,
    exposureCount: 10,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${id} · Day 12`}
        title="Maya Chen"
        description="Clinician-diagnosed concussion · Dr. Olivia Brooks · Last check-in today at 8:42 AM"
        action={
          <button
            onClick={() => setShowNoteModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-1.5 hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="size-4" /> Add clinical note
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Symptom total" value="15 / 48" detail="Patient-reported today" icon={Activity} />
        <StatCard label="Headache" value="2 / 6" detail="Down from 5 on Aug 25" icon={HeartPulse} />
        <StatCard label="Check-in coverage" value="92%" detail="11 of 12 days" icon={Check} />
        <StatCard label="Safety events" value="0" detail="In selected period" icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Longitudinal recovery</h2>
          <div className="mt-4">
            <TrendChart clinical />
          </div>
        </Card>
        <InsightCard provenance={insightProvenance} />
      </div>
      <ExplanationView
        provenance={insightProvenance}
        title="Clinician insight provenance"
        compact
        id="clinician-insight-explanation"
      />
      <Card className="p-6">
        <h2 className="font-semibold text-foreground">Recent check-ins</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {['Today · Symptoms 15 · Headache 2', 'Yesterday · Symptoms 18 · Headache 3', 'Aug 29 · Symptoms 20 · Headache 4'].map(x => (
            <div className="rounded-lg border border-border p-4 text-sm font-medium text-foreground" key={x}>
              {x}
            </div>
          ))}
        </div>
      </Card>

      {showNoteModal && (
        <ClinicalEncounterModal
          patientId={id}
          patientName="Maya Chen"
          onClose={() => setShowNoteModal(false)}
        />
      )}
    </div>
  )
}
