'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import {
  AlertCircle,
  Calendar,
  ClipboardCheck,
  FileText,
  Loader2,
  RefreshCw,
  Table2,
  TrendingUp,
  WifiOff,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layouts/page-header'
import { SelectField } from '@/components/forms'
import { SymptomMethodologyPanel } from '@/components/dashboard'
import { CheckInHistory } from '@/components/patient/check-in-history'
import { ExposureEntryList } from '@/components/patient/exposure-entry-list'
import { RecoveryTimelineChart } from '@/components/patient/recovery-timeline-chart'
import { RecoveryTimelineTable } from '@/components/patient/recovery-timeline-table'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { getLocalDateString } from '@/lib/checkInHistory'
import { isE2ETestMode } from '@/lib/e2e'
import {
  COMPARISON_VIEW_OPTIONS,
  SYMPTOM_GROUP_OPTIONS,
  TIMELINE_COPY,
  TIMELINE_EVENT_LABELS,
  TIMELINE_RANGE_OPTIONS,
  type ComparisonViewKey,
  type SymptomGroupKey,
  type TimelineDayPoint,
  type TimelineEventMarker,
  type TimelineRangeKey,
  type TimelineSummary,
} from '@/lib/recoveryTimeline'
import { METHODOLOGY_COPY } from '@/lib/symptomMethodology'

const demoPoints: TimelineDayPoint[] = [
  { date: '2026-08-25', dayLabel: 'Aug 25', symptomValue: 27, exposureValue: 2, checkInId: 'demo-ci-1', exposureId: 'demo-ex-1' },
  { date: '2026-08-26', dayLabel: 'Aug 26', symptomValue: 25, exposureValue: 3, checkInId: 'demo-ci-2', exposureId: 'demo-ex-2' },
  { date: '2026-08-27', dayLabel: 'Aug 27', symptomValue: null, exposureValue: null, checkInId: null, exposureId: null },
  { date: '2026-08-28', dayLabel: 'Aug 28', symptomValue: 24, exposureValue: 4, checkInId: 'demo-ci-3', exposureId: 'demo-ex-3' },
  { date: '2026-08-29', dayLabel: 'Aug 29', symptomValue: 20, exposureValue: 5, checkInId: 'demo-ci-4', exposureId: 'demo-ex-4' },
  { date: '2026-08-30', dayLabel: 'Aug 30', symptomValue: 18, exposureValue: 6.5, checkInId: 'demo-ci-5', exposureId: 'demo-ex-5' },
  { date: '2026-09-01', dayLabel: 'Sep 1', symptomValue: 15, exposureValue: 7, checkInId: 'demo-ci-6', exposureId: 'demo-ex-6' },
]

const demoEvents: TimelineEventMarker[] = [
  {
    id: 'demo-incident',
    date: '2026-08-19',
    kind: 'incident',
    title: 'Injury / incident reported',
    detail: 'Soccer collision during practice',
    sourceType: 'recoveryEpisodes',
    sourceId: 'demo-episode',
  },
  {
    id: 'demo-encounter',
    date: '2026-08-20',
    kind: 'clinical_encounter',
    title: 'Clinical encounter',
    detail: 'Initial concussion evaluation',
    sourceType: 'clinicalEncounters',
    sourceId: 'demo-encounter',
  },
  {
    id: 'demo-plan',
    date: '2026-08-21',
    kind: 'plan_change',
    title: 'Care plan update',
    detail: 'Graduated return-to-activity pacing',
    sourceType: 'carePlans',
    sourceId: 'demo-plan',
  },
]

const demoSummary: TimelineSummary = {
  headline: 'Longitudinal recovery view',
  description:
    'Showing 6 days with logged symptom total and 6 days with sleep duration data. 1 calendar day has no symptom or exposure records and is shown as a gap. Symptom total moved from 27 to 15 across logged days — a within-person descriptive change, not a prognosis.',
  loggedSymptomDays: 6,
  loggedExposureDays: 6,
  gapDays: 1,
  associationNote:
    'Temporal associations between symptoms and lifestyle context do not establish medical causation or diagnosis.',
}

export interface RecoveryTimelineProps {
  patientId?: Id<'patients'>
  timeZone?: string
  className?: string
}

function TimelineEventList({ events }: { events: TimelineEventMarker[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No incident, encounter, plan, amendment, or safety events in this range.
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map(event => (
        <li key={event.id} className="flex gap-3">
          <span
            className={cn(
              'mt-1 size-3 shrink-0 rounded-full',
              event.kind === 'safety_event'
                ? 'bg-destructive'
                : event.kind === 'incident'
                  ? 'bg-warning'
                  : 'bg-primary'
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {TIMELINE_EVENT_LABELS[event.kind]} · {event.date}
            </p>
            {event.detail && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{event.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function TimelineControls({
  range,
  symptomGroup,
  comparisonView,
  viewMode,
  onRangeChange,
  onSymptomGroupChange,
  onComparisonViewChange,
  onViewModeChange,
}: {
  range: TimelineRangeKey
  symptomGroup: SymptomGroupKey
  comparisonView: ComparisonViewKey
  viewMode: 'chart' | 'table'
  onRangeChange: (value: TimelineRangeKey) => void
  onSymptomGroupChange: (value: SymptomGroupKey) => void
  onComparisonViewChange: (value: ComparisonViewKey) => void
  onViewModeChange: (value: 'chart' | 'table') => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SelectField
        label="Date range"
        value={range}
        onChange={event => onRangeChange(event.target.value as TimelineRangeKey)}
        options={TIMELINE_RANGE_OPTIONS.map(option => ({
          value: option.value,
          label: option.label,
        }))}
      />
      <SelectField
        label="Symptom group"
        value={symptomGroup}
        onChange={event => onSymptomGroupChange(event.target.value as SymptomGroupKey)}
        options={SYMPTOM_GROUP_OPTIONS.map(option => ({
          value: option.value,
          label: option.label,
        }))}
      />
      <SelectField
        label="Comparison view"
        value={comparisonView}
        onChange={event => onComparisonViewChange(event.target.value as ComparisonViewKey)}
        options={COMPARISON_VIEW_OPTIONS.map(option => ({
          value: option.value,
          label: option.label,
        }))}
      />
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Display</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === 'chart' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('chart')}
            aria-pressed={viewMode === 'chart'}
          >
            <TrendingUp className="mr-1.5 size-4" />
            Chart
          </Button>
          <Button
            type="button"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            aria-pressed={viewMode === 'table'}
          >
            <Table2 className="mr-1.5 size-4" />
            Table
          </Button>
        </div>
      </div>
    </div>
  )
}

function RecoveryTimelineDemo() {
  const [range, setRange] = useState<TimelineRangeKey>('14')
  const [symptomGroup, setSymptomGroup] = useState<SymptomGroupKey>('all')
  const [comparisonView, setComparisonView] = useState<ComparisonViewKey>('symptoms_sleep')
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  return (
    <RecoveryTimelineContent
      range={range}
      symptomGroup={symptomGroup}
      comparisonView={comparisonView}
      viewMode={viewMode}
      onRangeChange={setRange}
      onSymptomGroupChange={setSymptomGroup}
      onComparisonViewChange={setComparisonView}
      onViewModeChange={setViewMode}
      dataSource="demo"
      timeZone="America/Los_Angeles"
      points={demoPoints}
      events={demoEvents}
      summary={demoSummary}
      windowStart="2026-08-25"
      windowEnd="2026-09-01"
    />
  )
}

function RecoveryTimelineLive({ patientId, timeZone }: RecoveryTimelineProps) {
  const [range, setRange] = useState<TimelineRangeKey>('14')
  const [symptomGroup, setSymptomGroup] = useState<SymptomGroupKey>('all')
  const [comparisonView, setComparisonView] = useState<ComparisonViewKey>('symptoms_sleep')
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [retryKey, setRetryKey] = useState(0)

  const mePatient = useQuery(api.patients.getMePatient, patientId ? 'skip' : {})
  const resolvedPatientId = patientId ?? mePatient?._id
  const resolvedTimeZone =
    timeZone ?? mePatient?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = useMemo(() => getLocalDateString(new Date(), resolvedTimeZone), [resolvedTimeZone])

  const timeline = useQuery(
    api.recoveryTimeline.getTimeline,
    resolvedPatientId
      ? {
          patientId: resolvedPatientId,
          today,
          range,
          symptomGroup,
          comparisonView,
        }
      : 'skip'
  )

  if (!patientId && mePatient === undefined) {
    return (
      <div className="flex items-center justify-center py-16" aria-busy="true">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!resolvedPatientId) {
    return <RecoveryTimelineDemo />
  }

  if (timeline === undefined) {
    return (
      <div className="flex items-center justify-center py-16" aria-busy="true">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (timeline === null) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine
    return (
      <Card className="p-6 text-center">
        <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
          {offline ? (
            <WifiOff className="size-5 text-muted-foreground" />
          ) : (
            <AlertCircle className="size-5 text-muted-foreground" />
          )}
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {offline ? 'Timeline unavailable offline' : 'Unable to load timeline'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {offline
            ? 'Reconnect to view your longitudinal recovery data.'
            : 'An error occurred while loading timeline data.'}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => setRetryKey(key => key + 1)}>
          <RefreshCw className="mr-2 size-4" />
          Try again
        </Button>
      </Card>
    )
  }

  return (
    <RecoveryTimelineContent
      key={retryKey}
      range={range}
      symptomGroup={symptomGroup}
      comparisonView={comparisonView}
      viewMode={viewMode}
      onRangeChange={setRange}
      onSymptomGroupChange={setSymptomGroup}
      onComparisonViewChange={setComparisonView}
      onViewModeChange={setViewMode}
      dataSource="live"
      timeZone={timeline.timeZone}
      points={timeline.points}
      events={timeline.events}
      summary={timeline.summary}
      windowStart={timeline.windowStart}
      windowEnd={timeline.windowEnd}
      patientId={resolvedPatientId}
    />
  )
}

function RecoveryTimelineContent({
  range,
  symptomGroup,
  comparisonView,
  viewMode,
  onRangeChange,
  onSymptomGroupChange,
  onComparisonViewChange,
  onViewModeChange,
  dataSource,
  timeZone,
  points,
  events,
  summary,
  windowStart,
  windowEnd,
  patientId,
}: {
  range: TimelineRangeKey
  symptomGroup: SymptomGroupKey
  comparisonView: ComparisonViewKey
  viewMode: 'chart' | 'table'
  onRangeChange: (value: TimelineRangeKey) => void
  onSymptomGroupChange: (value: SymptomGroupKey) => void
  onComparisonViewChange: (value: ComparisonViewKey) => void
  onViewModeChange: (value: 'chart' | 'table') => void
  dataSource: 'live' | 'demo'
  timeZone: string
  points: TimelineDayPoint[]
  events: TimelineEventMarker[]
  summary: TimelineSummary
  windowStart: string
  windowEnd: string
  patientId?: Id<'patients'>
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your progress"
        title="Recovery timeline"
        description={`A longitudinal view comparing patient-reported symptoms with activity, sleep, and screen exposure. ${METHODOLOGY_COPY.notRecoveryScore}`}
      />

      {dataSource === 'demo' && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Simulated demo data</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to view your live recovery episode. Demo values include an intentional missing-day
            gap — not shown as zero.
          </p>
        </div>
      )}

      <Card className="p-4 sm:p-6">
        <TimelineControls
          range={range}
          symptomGroup={symptomGroup}
          comparisonView={comparisonView}
          viewMode={viewMode}
          onRangeChange={onRangeChange}
          onSymptomGroupChange={onSymptomGroupChange}
          onComparisonViewChange={onComparisonViewChange}
          onViewModeChange={onViewModeChange}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">{summary.headline}</h2>
              <p className="text-sm text-muted-foreground">
                {windowStart} to {windowEnd} · {timeZone}
              </p>
            </div>
            <Badge tone="neutral">
              {dataSource === 'live' ? 'Live data' : 'Demo data'}
            </Badge>
          </div>

          <div
            role="region"
            aria-label={
              viewMode === 'chart'
                ? 'Longitudinal recovery chart'
                : 'Longitudinal recovery data table'
            }
            className="min-w-0"
          >
            {viewMode === 'chart' ? (
              <RecoveryTimelineChart
                points={points}
                events={events}
                symptomGroup={symptomGroup}
                comparisonView={comparisonView}
              />
            ) : (
              <RecoveryTimelineTable
                points={points}
                events={events}
                symptomGroup={symptomGroup}
                comparisonView={comparisonView}
                timeZone={timeZone}
              />
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <p className="text-sm leading-6 text-foreground">{summary.description}</p>
            <p className="text-xs leading-5 text-muted-foreground">{summary.associationNote}</p>
            <p className="text-xs leading-5 text-muted-foreground">{TIMELINE_COPY.associationDisclaimer}</p>
            <p className="text-xs leading-5 text-muted-foreground">{TIMELINE_COPY.noInterpolation}</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Recovery events</h2>
          </div>
          <TimelineEventList events={events} />
          <div className="mt-5 grid gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="size-3.5" />
              <span>{summary.loggedSymptomDays} days with check-ins</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="size-3.5" />
              <span>{summary.loggedExposureDays} days with exposure logs</span>
            </div>
            {summary.gapDays > 0 && (
              <p>Missing days: {summary.gapDays} (shown as gaps, not zero values)</p>
            )}
          </div>
        </Card>
      </div>

      {patientId && dataSource === 'live' && (
        <>
          <CheckInHistory patientId={patientId} timeZone={timeZone} />
          <ExposureEntryList patientId={patientId} />
        </>
      )}

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

export function RecoveryTimeline(props: RecoveryTimelineProps) {
  if (isE2ETestMode) {
    return <RecoveryTimelineDemo />
  }

  return <RecoveryTimelineLive {...props} />
}
