'use client'

import React, { useState } from 'react'
import { Plus, Activity, HeartPulse, Check, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { InsightCard } from '@/components/dashboard/insight-card'
import { ClinicalEncounterModal } from './clinical-encounter-modal'

export interface PatientDetailViewProps {
  id?: string
}

export function PatientDetailView({ id = 'P-1042' }: PatientDetailViewProps) {
  const [showNoteModal, setShowNoteModal] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${id} · Day 18`}
        title="Maya Chen"
        description="ACL reconstruction · Dr. Olivia Brooks · Last check-in today at 8:42 AM"
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
        <StatCard label="Recovery score" value="78" detail="+6 this week" icon={Activity} />
        <StatCard label="Pain" value="3 / 10" detail="Improving" icon={HeartPulse} />
        <StatCard label="Adherence" value="92%" detail="High" icon={Check} />
        <StatCard label="Risk" value="Low" detail="1 flag to review" icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Longitudinal recovery</h2>
          <div className="mt-4">
            <TrendChart clinical />
          </div>
        </Card>
        <InsightCard />
      </div>
      <Card className="p-6">
        <h2 className="font-semibold text-foreground">Recent check-ins</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {['Today · Pain 3 · Mood 8', 'Yesterday · Pain 4 · Mood 7', 'Aug 29 · Pain 4 · Mood 7'].map(x => (
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
