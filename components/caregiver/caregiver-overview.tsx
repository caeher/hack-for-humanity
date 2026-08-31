import React from 'react'
import { Activity, CalendarDays, ClipboardCheck, LockKeyhole } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'

export interface CaregiverOverviewProps {
  patientId?: string
}

export function CaregiverOverview({ patientId }: CaregiverOverviewProps) {
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
        <StatCard label="Recovery score" value="78" detail="On track" icon={Activity} />
        <StatCard label="Today’s tasks" value="2 left" detail="Next: exercises" icon={ClipboardCheck} />
        <StatCard label="Next appointment" value="Sep 3" detail="10:30 AM" icon={CalendarDays} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Recovery progress</h2>
          <div className="mt-4">
            <TrendChart />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">How you can help today</h2>
          <div className="mt-4 flex flex-col gap-3">
            {[
              'Remind Maya about noon exercises',
              'Help prepare questions for Sep 3 visit',
              'Encourage an earlier bedtime',
            ].map(x => (
              <div className="rounded-lg bg-muted p-3 text-sm font-medium text-foreground" key={x}>
                {x}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Shared with permission.</strong> Medication details and private clinical notes are not included in this caregiver view.
      </div>
    </div>
  )
}
