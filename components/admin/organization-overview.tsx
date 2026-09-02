'use client'

import React from 'react'
import { useQuery } from 'convex/react'
import { Activity, AlertTriangle, HeartPulse, Users } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'

export interface OrganizationOverviewProps {
  isCohorts?: boolean
}

export function OrganizationOverview({ isCohorts = false }: OrganizationOverviewProps) {
  const org = useQuery(api.organizations.getMyOrganization, {})
  const metrics = useQuery(
    api.organizations.getAggregateMetrics,
    org ? { orgId: org._id } : 'skip'
  )

  const riskTotal =
    metrics
      ? metrics.riskDistribution.stable +
        metrics.riskDistribution.review +
        metrics.riskDistribution.elevated
      : 0

  const riskPct = (count: number) =>
    riskTotal > 0 ? `${Math.round((count / riskTotal) * 100)}%` : '0%'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={org?.name ?? 'Organization workspace'}
        title={isCohorts ? 'Cohort outcomes' : 'Organization overview'}
        description="Aggregate operational metrics across your care network. No individual health data is shown."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Enrolled patients"
          value={metrics ? String(metrics.enrolledPatients) : '—'}
          detail={
            metrics
              ? `+${metrics.newPatientsThisMonth} this month`
              : 'Loading…'
          }
          icon={Users}
        />
        <StatCard
          label="Engagement"
          value={metrics ? `${metrics.checkInEngagementRate}%` : '—'}
          detail="7-day check-in rate (sampled)"
          icon={Activity}
        />
        <StatCard
          label="Active alerts"
          value={metrics ? String(metrics.activeAlertsCount) : '—'}
          detail="Organization-wide triage queue"
          icon={HeartPulse}
        />
        <StatCard
          label="High-severity rate"
          value={metrics ? `${metrics.escalationRate}%` : '—'}
          detail="Among active patients"
          icon={AlertTriangle}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Pathway distribution</h2>
              <p className="text-sm text-muted-foreground">
                Active recovery episodes by injury context (counts only)
              </p>
            </div>
            <Badge>Aggregate</Badge>
          </div>
          <div className="space-y-3">
            {metrics?.pathwayCounts.length
              ? metrics.pathwayCounts.map(item => (
                  <div
                    key={item.pathway}
                    className="rounded-lg border border-border p-3 text-sm text-foreground"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium truncate">{item.pathway}</span>
                      <strong>{item.count} patients</strong>
                    </div>
                  </div>
                ))
              : (
                <p className="text-sm text-muted-foreground">No pathway data yet.</p>
              )}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Risk distribution</h2>
          <div className="space-y-4">
            {[
              ['Stable', riskPct(metrics?.riskDistribution.stable ?? 0), 'good'],
              ['Needs review', riskPct(metrics?.riskDistribution.review ?? 0), 'warn'],
              ['Elevated', riskPct(metrics?.riskDistribution.elevated ?? 0), 'bad'],
            ].map(([label, pct, tone]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-foreground font-medium">{label}</span>
                  <strong className="text-foreground">{pct}</strong>
                </div>
                <div className="h-2 rounded bg-muted">
                  <div
                    className={`h-full rounded ${
                      tone === 'bad'
                        ? 'bg-destructive'
                        : tone === 'warn'
                          ? 'bg-warning'
                          : 'bg-primary'
                    }`}
                    style={{ width: pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
