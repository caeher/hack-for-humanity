'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Moon,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layouts'
import {
  StatCard,
  TrendChart,
  ScoreGauge,
  TodayPlan,
  InsightCard,
  SymptomMethodologyPanel,
} from '@/components/dashboard'
import { api } from '@/convex/_generated/api'
import { cn } from '@/lib/utils'
import { getLocalDateString } from '@/lib/checkInHistory'
import { isE2ETestMode } from '@/lib/e2e'
import { patients, recoveryTrend } from '@/lib/cri-data'
import {
  computeDescriptiveTrend,
  METHODOLOGY_COPY,
  SYMPTOM_METHODOLOGY_VERSION,
} from '@/lib/symptomMethodology'
import {
  formatCheckInConsistencyValue,
  formatEncounterDateTime,
  formatGreetingDate,
  formatSleepDuration,
  formatTrendChangeText,
  formatTrendStatusText,
  formatUpdatedAt,
  mapChartPointsToTrendData,
} from '@/lib/patientDashboard'

const demoPatient = patients[0]!

const demoTrendPoints = [
  { date: '2026-08-25', symptomTotal: 27 },
  { date: '2026-08-26', symptomTotal: 25 },
  { date: '2026-08-27', symptomTotal: 23 },
  { date: '2026-08-28', symptomTotal: 24 },
  { date: '2026-08-29', symptomTotal: 20 },
  { date: '2026-08-30', symptomTotal: 18 },
  { date: '2026-09-01', symptomTotal: 15 },
]

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-4 w-full max-w-xl rounded bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Card className="h-56 animate-pulse bg-muted/40" />
        <Card className="h-80 animate-pulse bg-muted/40" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="h-32 animate-pulse bg-muted/40" />
        <Card className="h-32 animate-pulse bg-muted/40" />
        <Card className="h-32 animate-pulse bg-muted/40" />
      </div>
    </div>
  )
}

function DemoDataBanner() {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
      <p className="text-sm font-medium text-foreground">Simulated demo data</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Sign in to view your live recovery episode. Demo values are labeled and never mixed with authenticated records.
      </p>
    </div>
  )
}

function SafetyEscalationBanner({
  headline,
  guidance,
  status,
}: {
  headline: string
  guidance: string
  status: string
}) {
  const isUrgent = status === 'emergency' || status === 'elevated'

  return (
    <Card
      className={cn(
        'border p-5',
        isUrgent ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/10'
      )}
    >
      <div className="flex items-start gap-3">
        {isUrgent ? (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        ) : (
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{headline}</p>
          <p className="mt-1 text-sm text-muted-foreground">{guidance}</p>
          <Link
            href="/patient/check-in"
            className="mt-3 inline-flex text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Review safety guidance
          </Link>
        </div>
      </div>
    </Card>
  )
}

function DashboardStatusPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Icon className="size-8 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        {action}
      </div>
    </Card>
  )
}

function CheckInCallToAction() {
  return (
    <Link
      href="/patient/check-in"
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[inset_0_1px_rgba(255,255,255,.6)] hover:bg-primary/90 transition-colors"
    >
      Start daily check-in <ArrowRight className="size-4" />
    </Link>
  )
}

function PatientDashboardDemo() {
  const demoTrend = computeDescriptiveTrend(demoTrendPoints)
  const latestTotal = recoveryTrend[recoveryTrend.length - 1]?.symptomBurden ?? 15

  return (
    <div className="flex flex-col gap-6">
      <DemoDataBanner />
      <PageHeader
        eyebrow="Monday, August 31"
        title={`Good morning, ${demoPatient.name.split(' ')[0]}`}
        description={`Day ${demoPatient.day} after a ${demoPatient.recoveryContext.toLowerCase()}. Track how symptoms and daily activities change over time.`}
        action={<CheckInCallToAction />}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Today&apos;s {METHODOLOGY_COPY.metricShortName}</h2>
            <span className="font-mono text-xs text-muted-foreground">SIMULATED · 8:42 AM</span>
          </div>
          <ScoreGauge
            score={latestTotal}
            maxScore={48}
            statusText={formatTrendStatusText(demoTrend.direction, demoTrend.readiness)}
            changeText={formatTrendChangeText(demoTrend.readiness, demoTrend.delta, demoTrend.windowDays)}
            trendDirection={demoTrend.direction}
            methodologyVersion={SYMPTOM_METHODOLOGY_VERSION}
          />
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">7-day trajectory</h2>
              <p className="text-sm text-muted-foreground">{METHODOLOGY_COPY.metricName}</p>
            </div>
            <Badge tone="neutral">Simulated · 7 days</Badge>
          </div>
          <TrendChart />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{demoTrend.summaryText}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{demoTrend.disclaimerText}</p>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Check-in consistency"
          value={`${demoPatient.checkInRate}%`}
          detail="11 of 12 days logged (simulated)"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Headache"
          value="2 / 6"
          detail="Patient-reported today (simulated)"
          icon={Activity}
        />
        <StatCard
          label="Next appointment"
          value="Sep 3"
          detail="Dr. Olivia Brooks · 10:30 AM (simulated)"
          icon={CalendarDays}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <TodayPlan mode="demo" />
        <InsightCard footer="BASED ON 12 CHECK-INS · SIMULATED DATA" />
      </div>
      <SymptomMethodologyPanel compact />
    </div>
  )
}

function PatientDashboardLive() {
  const { isSignedIn, isLoaded: isClerkLoaded } = useUser()
  const [retryKey, setRetryKey] = useState(0)
  const today = useMemo(() => getLocalDateString(), [retryKey])

  const patient = useQuery(api.patients.getMePatient)
  const summary = useQuery(
    api.patientDashboard.getSummary,
    patient ? { patientId: patient._id, today } : 'skip'
  )

  if (!isClerkLoaded || patient === undefined || (patient && summary === undefined)) {
    return <DashboardSkeleton />
  }

  if (!isSignedIn || !patient || !summary) {
    return <PatientDashboardDemo />
  }

  const trend = summary.trendSummary
  const chartData = mapChartPointsToTrendData(summary.chartPoints)
  const hasTodayScore = summary.hasCheckInToday && summary.latestSymptomTotal !== null
  const updatedLabel = summary.latestCheckInUpdatedAt
    ? `UPDATED ${formatUpdatedAt(summary.latestCheckInUpdatedAt, patient.timeZone)}`
    : 'NO CHECK-IN TODAY'

  const encounterDisplay = summary.nextEncounter
    ? formatEncounterDateTime(summary.nextEncounter.datetime)
    : null

  const dayDescription =
    summary.dayNumber && summary.injuryContext
      ? `Day ${summary.dayNumber} after ${summary.injuryContext.toLowerCase()}. Track how symptoms and daily activities change over time.`
      : 'Track how symptoms and daily activities change over time using your saved check-ins.'

  return (
    <div className="flex flex-col gap-6">
      {summary.safetyEscalation && (
        <SafetyEscalationBanner
          headline={summary.safetyEscalation.headline}
          guidance={summary.safetyEscalation.guidance}
          status={summary.safetyEscalation.status}
        />
      )}

      <PageHeader
        eyebrow={formatGreetingDate(new Date(), patient.timeZone)}
        title={`Good morning, ${summary.patientName}`}
        description={dayDescription}
        action={<CheckInCallToAction />}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <Card className="p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-foreground">Today&apos;s {METHODOLOGY_COPY.metricShortName}</h2>
            <span className="font-mono text-xs text-muted-foreground">{updatedLabel}</span>
          </div>
          {hasTodayScore ? (
            <ScoreGauge
              score={summary.latestSymptomTotal!}
              maxScore={48}
              statusText={formatTrendStatusText(trend.direction, trend.readiness)}
              changeText={formatTrendChangeText(trend.readiness, trend.delta, trend.windowDays)}
              trendDirection={trend.direction}
              methodologyVersion={SYMPTOM_METHODOLOGY_VERSION}
            />
          ) : (
            <div className="flex flex-col gap-3 py-4">
              <Badge tone="neutral">No check-in today</Badge>
              <p className="text-sm text-muted-foreground">
                {summary.latestCheckInDate
                  ? `Your most recent entry is from ${summary.latestCheckInDate}. Missing days are not shown as zero symptoms.`
                  : 'Complete your first daily check-in to start tracking your patient-reported symptom total.'}
              </p>
              <Link
                href="/patient/check-in"
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Start check-in <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground">7-day trajectory</h2>
              <p className="text-sm text-muted-foreground">{METHODOLOGY_COPY.metricName}</p>
            </div>
            <Badge>Live · Last 7 days</Badge>
          </div>
          <TrendChart data={chartData} />
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{trend.summaryText}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{trend.disclaimerText}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Check-in consistency"
          value={formatCheckInConsistencyValue(summary.checkInConsistency.ratePercent)}
          detail={summary.checkInConsistency.detail}
          icon={ClipboardCheck}
        />
        <StatCard
          label="Headache"
          value={
            summary.latestHeadacheRating !== null
              ? `${summary.latestHeadacheRating} / 6`
              : '—'
          }
          detail={
            summary.latestHeadacheRating !== null
              ? summary.hasCheckInToday
                ? 'Patient-reported today'
                : 'From most recent check-in'
              : 'No headache rating recorded yet'
          }
          icon={Activity}
        />
        <StatCard
          label={summary.sleepHours !== null ? 'Sleep last night' : 'Next appointment'}
          value={
            summary.sleepHours !== null
              ? formatSleepDuration(summary.sleepHours)
              : encounterDisplay?.date ?? '—'
          }
          detail={
            summary.sleepHours !== null
              ? summary.sleepQuality !== null
                ? `Self-reported quality ${summary.sleepQuality}/10`
                : 'Self-reported duration'
              : encounterDisplay
                ? `${summary.nextEncounterClinicianName ?? 'Clinician'} · ${encounterDisplay.time}`
                : 'No upcoming visit on file'
          }
          icon={summary.sleepHours !== null ? Moon : CalendarDays}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <TodayPlan
          mode="live"
          tasks={summary.carePlanTasks.map(task => ({
            id: task._id,
            title: task.title,
            targetTime: task.targetTime,
            completed: task.completed,
          }))}
        />
        {summary.safetyEscalation ? (
          <Card className="p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="size-5" />
              </div>
              <Badge tone="bad">Safety priority</Badge>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {summary.safetyEscalation.headline}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {summary.safetyEscalation.guidance}
            </p>
            <p className="mt-5 font-mono text-xs uppercase text-muted-foreground">
              Safety guidance supersedes routine insights · Live data
            </p>
          </Card>
        ) : (
          <InsightCard
            title={summary.insight.title}
            description={summary.insight.description}
            footer={summary.insight.footer}
          />
        )}
      </div>

      <SymptomMethodologyPanel compact />
    </div>
  )
}

function PatientDashboardErrorFallback({
  onRetry,
  message,
}: {
  onRetry: () => void
  message: string
}) {
  const offline = typeof navigator !== 'undefined' && !navigator.onLine

  return (
    <DashboardStatusPanel
      icon={offline ? WifiOff : AlertCircle}
      title={offline ? 'You appear to be offline' : 'Dashboard unavailable'}
      description={
        offline
          ? 'Reconnect to load your live recovery data. Cached demo data is not shown while signed in.'
          : message
      }
      action={
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
      }
    />
  )
}

class PatientDashboardErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <PatientDashboardErrorFallback
          message={this.state.error.message}
          onRetry={() => {
            this.setState({ error: null })
            this.props.onRetry()
          }}
        />
      )
    }
    return this.props.children
  }
}

export function PatientDashboard() {
  const [retryKey, setRetryKey] = useState(0)

  if (isE2ETestMode) {
    return <PatientDashboardDemo />
  }

  return (
    <PatientDashboardErrorBoundary key={retryKey} onRetry={() => setRetryKey(key => key + 1)}>
      <PatientDashboardLive />
    </PatientDashboardErrorBoundary>
  )
}
