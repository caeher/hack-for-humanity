import React from 'react'
import { Activity, AlertTriangle, HeartPulse, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'

export interface OrganizationOverviewProps {
  isCohorts?: boolean
}

export function OrganizationOverview({ isCohorts = false }: OrganizationOverviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Northstar Concussion Collaborative"
        title={isCohorts ? 'Cohort outcomes' : 'Organization overview'}
        description="Aggregate operational and recovery intelligence across the care network."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Enrolled patients" value="1,248" detail="+82 this month" icon={Users} />
        <StatCard label="Engagement" value="86.4%" detail="Daily check-in rate" icon={Activity} />
        <StatCard label="Avg. symptoms" value="24 / 48" detail="Patient-reported" icon={HeartPulse} />
        <StatCard label="Escalations" value="2.1%" detail="Down 0.4%" icon={AlertTriangle} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Recovery outcomes</h2>
              <p className="text-sm text-muted-foreground">Aggregate symptom total by week</p>
            </div>
            <Badge>All pathways</Badge>
          </div>
          <TrendChart />
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Risk distribution</h2>
          <div className="space-y-4">
            {[
              ['Stable', '78%', 'good'],
              ['Needs review', '17%', 'warn'],
              ['Elevated', '5%', 'bad'],
            ].map(([a, b, c]) => (
              <div key={a}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-foreground font-medium">{a}</span>
                  <strong className="text-foreground">{b}</strong>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div className="h-full rounded bg-foreground" style={{ width: b }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-6">
        <h2 className="font-semibold text-foreground mb-4">Pathway performance</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {['Diagnosed concussion · 18.4', 'Suspected concussion · 24.7', 'Persistent symptoms · 29.1'].map(x => (
            <div className="rounded-lg border border-border p-4 font-semibold text-foreground" key={x}>
              {x}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
