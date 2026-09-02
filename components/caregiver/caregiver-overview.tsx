'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ClipboardCheck,
  LockKeyhole,
  MessageSquare,
  Users,
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { ExplanationView } from '@/components/explanation'
import { CaregiverRestrictedNotice } from '@/components/caregiver/caregiver-restricted-notice'
import { CaregiverPendingInvitations } from '@/components/caregiver/caregiver-pending-invitations'
import { getLocalDateString } from '@/lib/checkInHistory'
import { mapChartPointsToTrendData } from '@/lib/patientDashboard'
import { isE2ETestMode } from '@/lib/e2e'
import { recoveryTrend } from '@/lib/cri-data'
import { buildSymptomTotalProvenanceFromAnswers } from '@/lib/provenance'
import type { Doc } from '@/convex/_generated/dataModel'

export interface CaregiverOverviewProps {
  patientId?: string
}

function CaregiverOverviewDemo({ patientId }: CaregiverOverviewProps) {
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
        description="Demo data — sign in as a caregiver to view consent-filtered live records."
        action={
          <Badge tone="good">
            <LockKeyhole className="mr-1 size-3" /> Access approved
          </Badge>
        }
      />
      <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-muted-foreground">
        Simulated caregiver view. Authenticated caregivers only see data explicitly shared with them.
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Symptom total" value="15 / 48" detail="Patient-reported today" icon={Activity} />
        <StatCard label="Today’s check-in" value="Complete" detail="Logged at 8:42 AM" icon={ClipboardCheck} />
        <StatCard label="Next appointment" value="Sep 3" detail="10:30 AM" icon={CalendarDays} />
      </div>
      <Card className="p-6">
        <h2 className="font-semibold text-foreground">Symptom history</h2>
        <div className="mt-4">
          <TrendChart data={recoveryTrend} />
        </div>
      </Card>
      <ExplanationView
        provenance={symptomProvenance}
        title="How today's symptom total is calculated"
        compact
        id="caregiver-symptom-explanation"
      />
    </div>
  )
}

function CaregiverOverviewLive({ patientId }: CaregiverOverviewProps) {
  const today = useMemo(() => getLocalDateString(), [])
  const accessiblePatients = useQuery(api.consent.listAccessiblePatients, {})
  const resolvedPatient = useQuery(
    api.patients.getByDisplayId,
    patientId ? { displayId: patientId } : 'skip'
  )

  const activePatientId = resolvedPatient?._id
  const summary = useQuery(
    api.caregiverDashboard.getSupportSummary,
    activePatientId ? { patientId: activePatientId, today } : 'skip'
  )

  const selectedAccessible = accessiblePatients?.find(
    patient => patient.displayId === patientId || patient.patientId === activePatientId
  )

  if (accessiblePatients === undefined) {
    return <div className="animate-pulse text-sm text-muted-foreground">Loading caregiver workspace…</div>
  }

  const hasPatients = accessiblePatients.length > 0

  return (
    <div className="flex flex-col gap-6">
      <CaregiverPendingInvitations />

      {!patientId && (
        <>
          <PageHeader
            eyebrow="Caregiver access"
            title="Your support dashboard"
            description="View only the recovery information each patient has chosen to share with you."
          />

          {!hasPatients ? (
            <Card className="p-6">
              <div className="flex flex-col items-start gap-3">
                <Users className="size-8 text-muted-foreground" aria-hidden />
                <h2 className="text-lg font-semibold text-foreground">No active access yet</h2>
                <p className="max-w-xl text-sm text-muted-foreground">
                  Caregiver access is denied by default. When a patient or legal guardian invites you,
                  the invitation will appear here for review before any health information is shared.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {accessiblePatients.map(patient => (
                <Card key={patient.patientId} className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-foreground">
                        {patient.preferredName ?? patient.displayId}
                      </h2>
                      {patient.relationship && (
                        <p className="text-sm text-muted-foreground">{patient.relationship}</p>
                      )}
                    </div>
                    <Badge tone="good">Active access</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patient.scopes.includes('view_trends') && <Badge tone="neutral">Trends</Badge>}
                    {patient.scopes.includes('view_symptoms') && <Badge tone="neutral">Symptoms</Badge>}
                    {patient.scopes.includes('view_plan') && <Badge tone="neutral">Care plan</Badge>}
                    {patient.scopes.includes('receive_alerts') && <Badge tone="neutral">Safety</Badge>}
                    {patient.scopes.includes('view_messages') && <Badge tone="neutral">Messages</Badge>}
                  </div>
                  <Button asChild>
                    <Link href={`/caregiver/patient/${patient.displayId}`}>Open support view</Link>
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {patientId && resolvedPatient === null && (
        <Card className="border-destructive/30 p-6">
          <h2 className="font-semibold text-foreground">Access denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to view this patient’s recovery information, or the patient ID is
            not valid. Access cannot be inferred from a display ID alone — an active consent grant is
            required.
          </p>
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/caregiver/dashboard">Back to overview</Link>
          </Button>
        </Card>
      )}

      {patientId && summary && (
        <>
          <PageHeader
            eyebrow="Caregiver access"
            title={`Supporting ${summary.patientName}`}
            description={
              summary.relationship
                ? `${summary.relationship} — permission-based recovery view`
                : 'Permission-based recovery view'
            }
            action={
              <Badge tone="good">
                <LockKeyhole className="mr-1 size-3" />
                {summary.expiresAt
                  ? `Access until ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(summary.expiresAt))}`
                  : 'Access approved'}
              </Badge>
            }
          />

          {summary.safetyStatus && (
            <Card className="border-warning/40 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 size-5 text-warning" aria-hidden />
                <div>
                  <h2 className="font-semibold text-foreground">{summary.safetyStatus.headline}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{summary.safetyStatus.guidance}</p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {summary.latestSymptomTotal !== null && summary.hasCheckInToday !== null ? (
              <StatCard
                label="Symptom total"
                value={`${summary.latestSymptomTotal} / 48`}
                detail={
                  summary.latestCheckInUpdatedAt
                    ? `Updated ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(summary.latestCheckInUpdatedAt))}`
                    : 'Patient-reported today'
                }
                icon={Activity}
              />
            ) : (
              <StatCard
                label="Symptom total"
                value="Not shared"
                detail="Daily symptom details are not included in your access"
                icon={LockKeyhole}
              />
            )}
            <StatCard
              label="Today’s check-in"
              value={
                summary.hasCheckInToday === null
                  ? 'Not shared'
                  : summary.hasCheckInToday
                    ? 'Complete'
                    : 'Pending'
              }
              detail={
                summary.hasCheckInToday === null
                  ? 'Check-in status requires symptom access'
                  : 'Patient-reported status'
              }
              icon={ClipboardCheck}
            />
            <StatCard
              label="Next appointment"
              value={summary.nextAppointmentLabel ?? '—'}
              detail={
                summary.nextAppointmentLabel
                  ? 'Date only — clinical details are not shared'
                  : 'No upcoming visit on file'
              }
              icon={CalendarDays}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-6">
              <h2 className="font-semibold text-foreground">Symptom history</h2>
              {summary.chartPoints && summary.chartPoints.length > 0 ? (
                <div className="mt-4">
                  <TrendChart data={mapChartPointsToTrendData(summary.chartPoints)} />
                  {summary.trendSummaryText && (
                    <p className="mt-3 text-sm text-muted-foreground">{summary.trendSummaryText}</p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Recovery trend data is not included in your current access scope.
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-foreground">How you can help today</h2>
              {summary.carePlanTasks && summary.carePlanTasks.length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  {summary.carePlanTasks.slice(0, 5).map((task: Doc<'carePlans'>) => (
                    <div
                      key={task._id}
                      className="rounded-lg bg-muted p-3 text-sm font-medium text-foreground"
                    >
                      {task.title}
                      {task.description && (
                        <p className="mt-1 text-xs font-normal text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Care plan tasks are not shared with your account.
                </p>
              )}
              {summary.reminders && summary.reminders.length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <h3 className="text-sm font-semibold text-foreground">Reminders</h3>
                  <ul className="mt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                    {summary.reminders.slice(0, 3).map((reminder: Doc<'planReminders'>) => (
                      <li key={reminder._id}>
                        {reminder.title} at {reminder.scheduledTime}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {summary.latestSymptomProvenance && (
            <ExplanationView
              provenance={summary.latestSymptomProvenance}
              title="How today's symptom total is calculated"
              compact
              id="caregiver-symptom-explanation"
            />
          )}

          <CaregiverRestrictedNotice sections={summary.restrictedSections} />

          <div className="flex flex-wrap gap-3">
            {summary.canViewMessages && (
              <Button variant="outline" asChild>
                <Link href="/caregiver/messages">
                  <MessageSquare className="mr-2 size-4" />
                  Secure messages
                </Link>
              </Button>
            )}
            {selectedAccessible && (
              <p className="self-center text-xs text-muted-foreground">
                {summary.canLogProxy
                  ? 'You can complete delegated check-ins and reminders on their behalf.'
                  : 'View-only access — delegated logging is not enabled.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function CaregiverOverview(props: CaregiverOverviewProps) {
  if (isE2ETestMode) {
    return <CaregiverOverviewDemo {...props} />
  }
  return <CaregiverOverviewLive {...props} />
}
