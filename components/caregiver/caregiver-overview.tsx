import React from 'react'
import { Activity, CalendarDays, ClipboardCheck, LockKeyhole } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ExplanationView } from '@/components/explanation'
import { buildSymptomTotalProvenanceFromAnswers } from '@/lib/provenance'

export interface CaregiverOverviewProps {
  patientId?: string
}

export function CaregiverOverview({ patientId }: CaregiverOverviewProps) {
  const symptomProvenance = buildSymptomTotalProvenanceFromAnswers({
    answers: {
      headache: 2,
      dizziness: 1,
      nausea: 0,
      lightSensitivity: 1,
      noiseSensitivity: 0,
      fatigue: 3,
      concentration: 2,
      sleepDifficulty: 1,
    },
    checkInDate: '2026-09-01',
    viewer: { canViewPrivateNotes: false },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Caregiver access"
        title={patientId ? 'Maya’s recovery' : 'Supporting Maya'}
        description="A permission-based view of recovery progress, tasks, and care-team communication."
        action={
          <Badge tone="good">
            <LockKeyhole className="mr-1 size-3" /> Access approved
          </Badge>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Symptom total" value="15 / 48" detail="Patient-reported today" icon={Activity} />
        <StatCard label="Today’s check-in" value="Complete" detail="Logged at 8:42 AM" icon={ClipboardCheck} />
        <StatCard label="Next appointment" value="Sep 3" detail="10:30 AM" icon={CalendarDays} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Symptom history</h2>
          <div className="mt-4">
            <TrendChart />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">How you can help today</h2>
          <div className="mt-4 flex flex-col gap-3">
            {[
              'Offer a quiet place if Maya needs less stimulation',
              'Help prepare questions for Sep 3 visit',
              'Follow the care team’s instructions if symptoms change',
            ].map(x => (
              <div className="rounded-lg bg-muted p-3 text-sm font-medium text-foreground" key={x}>
                {x}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <ExplanationView
        provenance={symptomProvenance}
        title="How today's symptom total is calculated"
        compact
        id="caregiver-symptom-explanation"
      />
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Shared with permission.</strong> Private notes and clinician-only records are not included in this caregiver view.
      </div>
    </div>
  )
}
