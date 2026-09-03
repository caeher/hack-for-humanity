'use client'

import React, { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { Activity, AlertTriangle, BarChart3, ClipboardList, Shield } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from '@/convex/_generated/dataModel'
import { isE2ETestMode } from '@/lib/e2e'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { SelectField } from '@/components/forms/select-field'
import { cn } from '@/lib/utils'

type CohortDashboard = FunctionReturnType<typeof api.cohortAnalytics.getCohortDashboard>
type CohortSegment = CohortDashboard['segments'][number]
type CohortMetric = CohortDashboard['metrics'][number]

type CohortFilters = {
  ageBand?: string
  episodeDurationBand?: string
  engagementTier?: string
  programPathway?: string
}

function formatMetricDisplay(
  unit: 'count' | 'percent' | 'median',
  value: number | null,
  suppressed: boolean
): string {
  if (suppressed || value === null) return 'Suppressed'
  if (unit === 'percent') return `${value}%`
  if (unit === 'median') return `${value} / 48`
  return String(value)
}

function CohortAnalyticsDemo() {
  const demoMetrics = [
    {
      label: 'Active enrollments',
      value: '42',
      detail: 'Organization-wide active patients',
      suppressed: false,
    },
    {
      label: '7-day check-in engagement',
      value: '86%',
      detail: 'Patients with ≥1 check-in in trailing 7 days',
      suppressed: false,
    },
    {
      label: 'Median patient-reported symptom total (7d)',
      value: '18 / 48',
      detail: 'Descriptive burden only — not recovery',
      suppressed: false,
    },
    {
      label: 'Baseline assessment completion',
      value: '91%',
      detail: 'Active episodes with baseline on file',
      suppressed: false,
    },
  ]

  const demoSegments = [
    { label: '18–24', count: '12', type: 'Age band' },
    { label: '25–39', count: '18', type: 'Age band' },
    { label: 'High (5+ check-ins/7d)', count: '24', type: 'Engagement' },
    { label: 'Sports-related injury', count: '15', type: 'Program' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="[E2E demo shell] Oak Valley Health"
        title="Cohort analytics"
        description="De-identified program evaluation metrics. Simulated demo data — no individual records shown."
      />

      <Card className="border-border p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline">Simulated data</Badge>
          <span className="text-muted-foreground">
            Small-cell threshold: 5 · Methodology v1.0.0 · Range: Aug 1–31, 2026
          </span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {demoMetrics.map(metric => (
          <Card key={metric.label} className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-foreground">Segment distribution (demo)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Groups below the privacy threshold would be suppressed in production.
        </p>
        <table className="mt-4 w-full text-sm" aria-label="Cohort segment distribution">
          <caption className="sr-only">
            De-identified cohort segment counts for program evaluation
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th scope="col" className="pb-2 pr-4 font-medium">
                Segment type
              </th>
              <th scope="col" className="pb-2 pr-4 font-medium">
                Label
              </th>
              <th scope="col" className="pb-2 font-medium">
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {demoSegments.map(row => (
              <tr key={`${row.type}-${row.label}`} className="border-b border-border/60">
                <td className="py-2 pr-4 text-foreground">{row.type}</td>
                <td className="py-2 pr-4 text-foreground">{row.label}</td>
                <td className="py-2 text-foreground">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="border-dashed p-4 text-sm text-muted-foreground">
        <Shield className="mb-2 h-4 w-4 text-primary" aria-hidden />
        Symptom totals describe patient-reported burden — not recovery, severity, prognosis, or
        return-to-activity readiness.
      </Card>
    </div>
  )
}

interface CohortAnalyticsLiveProps {
  orgId: Id<'organizations'>
  orgName: string
}

function CohortAnalyticsLive({ orgId, orgName }: CohortAnalyticsLiveProps) {
  const asOfDate = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [filters, setFilters] = useState<CohortFilters>({})

  const dashboard = useQuery(api.cohortAnalytics.getCohortDashboard, {
    orgId,
    asOfDate,
    filters: {
      ageBand: filters.ageBand as CohortDashboard['filtersApplied']['ageBand'],
      episodeDurationBand: filters.episodeDurationBand as CohortDashboard['filtersApplied']['episodeDurationBand'],
      engagementTier: filters.engagementTier as CohortDashboard['filtersApplied']['engagementTier'],
      programPathway: filters.programPathway,
    },
  })

  const segmentGroups = useMemo(() => {
    if (!dashboard) return []
    const types = ['ageBand', 'episodeDurationBand', 'engagementTier', 'programPathway'] as const
    const labels: Record<string, string> = {
      ageBand: 'Age band',
      episodeDurationBand: 'Episode duration',
      engagementTier: 'Engagement tier',
      programPathway: 'Program context',
    }
    return types.map(type => ({
      type,
      title: labels[type],
      segments: dashboard.segments.filter((s: CohortSegment) => s.segmentType === type && !s.suppressed),
    }))
  }, [dashboard])

  const maxSegmentCount = useMemo(() => {
    if (!dashboard) return 1
    return Math.max(...dashboard.segments.filter((s: CohortSegment) => !s.suppressed).map((s: CohortSegment) => s.count), 1)
  }, [dashboard])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={orgName}
        title="Cohort analytics"
        description="Privacy-preserving program evaluation metrics. No individual patient records are shown."
      />

      <Card className="border-border p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={dashboard?.dataSource === 'live' ? 'default' : 'outline'}>
            {dashboard?.dataSource === 'live' ? 'Live data' : 'Simulated data'}
          </Badge>
          <span className="text-muted-foreground">
            Small-cell threshold: {dashboard?.smallCellThreshold ?? 5} · Methodology{' '}
            {dashboard?.methodologyVersion ?? '…'} · Range:{' '}
            {dashboard ? `${dashboard.rangeStart} – ${dashboard.rangeEnd}` : '…'}
          </span>
          {dashboard?.dataFreshness.lastCheckInDate && (
            <span className="text-muted-foreground">
              Last check-in: {dashboard.dataFreshness.lastCheckInDate}
            </span>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Cohort filters</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Filters narrow the aggregate cohort. Results are suppressed when the filtered group is
          smaller than the privacy threshold.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SelectField
            label="Age band"
            value={filters.ageBand ?? ''}
            onChange={e =>
              setFilters(f => ({ ...f, ageBand: e.target.value || undefined }))
            }
            options={[
              { label: 'All age bands', value: '' },
              ...(dashboard?.filterOptions.ageBands.map((b: string) => ({ label: b, value: b })) ?? []),
            ]}
          />
          <SelectField
            label="Episode duration"
            value={filters.episodeDurationBand ?? ''}
            onChange={e =>
              setFilters(f => ({ ...f, episodeDurationBand: e.target.value || undefined }))
            }
            options={[
              { label: 'All durations', value: '' },
              ...(dashboard?.filterOptions.episodeDurationBands.map((b: string) => ({
                label: b,
                value: b,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Engagement tier"
            value={filters.engagementTier ?? ''}
            onChange={e =>
              setFilters(f => ({ ...f, engagementTier: e.target.value || undefined }))
            }
            options={[
              { label: 'All engagement tiers', value: '' },
              ...(dashboard?.filterOptions.engagementTiers.map((b: string) => ({ label: b, value: b })) ?? []),
            ]}
          />
          <SelectField
            label="Program context"
            value={filters.programPathway ?? ''}
            onChange={e =>
              setFilters(f => ({ ...f, programPathway: e.target.value || undefined }))
            }
            options={[
              { label: 'All programs', value: '' },
              ...(dashboard?.filterOptions.programPathways.map((b: string) => ({ label: b, value: b })) ?? []),
            ]}
          />
        </div>
      </Card>

      {dashboard?.cohortSuppressed ? (
        <Card className="border-warning/40 bg-warning/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" aria-hidden />
            <div>
              <h2 className="font-semibold text-foreground">Cohort suppressed for privacy</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {dashboard.suppressionReason}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cohort size: {dashboard.cohortSize} (minimum required:{' '}
                {dashboard.smallCellThreshold})
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dashboard?.metrics.map((metric: CohortMetric) => (
              <Card key={metric.metricId} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </p>
                  {metric.descriptiveOnly && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Descriptive
                    </Badge>
                  )}
                </div>
                <p
                  className={cn(
                    'mt-2 text-2xl font-semibold',
                    metric.suppressed ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {formatMetricDisplay(metric.unit, metric.value, metric.suppressed)}
                </p>
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Definition &amp; limitations
                  </summary>
                  <dl className="mt-2 space-y-1">
                    <div>
                      <dt className="font-medium">Definition</dt>
                      <dd>{metric.definition}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Denominator</dt>
                      <dd>{metric.denominator}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Caveat</dt>
                      <dd>{metric.caveat}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Source query</dt>
                      <dd className="font-mono text-[10px]">{metric.sourceQuery}</dd>
                    </div>
                    {!metric.suppressed && (
                      <div>
                        <dt className="font-medium">Computed</dt>
                        <dd>
                          {metric.numerator} / {metric.denominatorCount}
                        </dd>
                      </div>
                    )}
                  </dl>
                </details>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {segmentGroups.map(group => (
              <Card key={group.type} className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
                  <h2 className="font-semibold text-foreground">{group.title}</h2>
                </div>

                {group.segments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No segments meet the privacy threshold for display.
                  </p>
                ) : (
                  <>
                    <div className="space-y-3" role="img" aria-label={`${group.title} bar chart`}>
                      {group.segments.map((segment: CohortSegment) => (
                        <div key={segment.label}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="truncate text-foreground">{segment.label}</span>
                            <span className="font-medium text-foreground">{segment.count}</span>
                          </div>
                          <div className="h-2 rounded bg-muted">
                            <div
                              className="h-full rounded bg-primary"
                              style={{
                                width: `${Math.round((segment.count / maxSegmentCount) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <table
                      className="mt-4 w-full text-sm"
                      aria-label={`${group.title} data table`}
                    >
                      <caption className="sr-only">
                        Accessible table alternative for {group.title} chart
                      </caption>
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th scope="col" className="pb-2 pr-4 font-medium">
                            Segment
                          </th>
                          <th scope="col" className="pb-2 font-medium">
                            Patient count
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.segments.map((segment: CohortSegment) => (
                          <tr
                            key={segment.label}
                            className="border-b border-border/60"
                          >
                            <td className="py-2 pr-4 text-foreground">{segment.label}</td>
                            <td className="py-2 text-foreground">{segment.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <Card className="border-dashed p-4">
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p>{dashboard?.privacyNotice}</p>
        </div>
      </Card>

      <Card className="p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" aria-hidden />
          <span>
            Data freshness: computed{' '}
            {dashboard
              ? new Date(dashboard.computedAt).toLocaleString()
              : '…'}
            {dashboard?.dataFreshness.lastPatientEnrollment &&
              ` · Last enrollment: ${dashboard.dataFreshness.lastPatientEnrollment}`}
          </span>
        </div>
      </Card>
    </div>
  )
}

export function CohortAnalyticsView() {
  if (isE2ETestMode) {
    return <CohortAnalyticsDemo />
  }

  const org = useQuery(api.organizations.getMyOrganization, {})

  if (org === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Organization workspace"
          title="Cohort analytics"
          description="Loading organization context…"
        />
        <Card className="flex items-center gap-3 p-6 text-muted-foreground">
          <Activity className="h-5 w-5 animate-pulse" aria-hidden />
          Loading cohort analytics…
        </Card>
      </div>
    )
  }

  if (org === null) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Organization workspace"
          title="Cohort analytics"
          description="Organization admin access required."
        />
        <Card className="p-6 text-sm text-muted-foreground">
          You need organization administrator access to view cohort analytics.
        </Card>
      </div>
    )
  }

  return <CohortAnalyticsLive orgId={org._id} orgName={org.name} />
}
