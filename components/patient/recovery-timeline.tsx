import React from 'react'
import { Activity, ClipboardCheck, HeartPulse } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'

export function RecoveryTimeline() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your progress"
        title="Recovery timeline"
        description="A longitudinal view of the signals shaping your recovery."
      />
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Recovery trajectory</h2>
          <p className="text-sm text-muted-foreground">Patient-reported symptom total and headache rating</p>
          <div className="mt-4">
            <TrendChart clinical />
          </div>
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
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Symptom total" value="15 / 48" detail="Patient-reported today" icon={Activity} />
        <StatCard label="Sleep" value="6h 48m" detail="Self-reported duration" icon={HeartPulse} />
        <StatCard label="Check-ins" value="11 / 12" detail="One day not recorded" icon={ClipboardCheck} />
      </div>
    </div>
  )
}
