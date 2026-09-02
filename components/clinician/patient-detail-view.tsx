'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import {
  Activity,
  AlertTriangle,
  Check,
  HeartPulse,
  Loader2,
  Plus,
  Printer,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { InsightCard } from '@/components/dashboard/insight-card'
import { ExplanationView } from '@/components/explanation'
import { RecoveryTimeline } from '@/components/patient/recovery-timeline'
import { CheckInHistory } from '@/components/patient/check-in-history'
import { ExposureEntryList } from '@/components/patient/exposure-entry-list'
import { ClinicalEncounterModal } from './clinical-encounter-modal'
import { EncounterRecordsPanel } from './encounter-records-panel'
import { ClinicianPatientMessagesPanel } from './clinician-patient-messages-panel'
import { DataSourceBadge } from './data-source-badge'
import { buildPatternInsightProvenance } from '@/lib/provenance'
import { getLocalDateString } from '@/lib/checkInHistory'
import { mapChartPointsToTrendData } from '@/lib/patientDashboard'
import { isE2ETestMode } from '@/lib/e2e'

export interface PatientDetailViewProps {
  id?: string
}

function PatientDetailViewDemo({ id = 'P-1042' }: PatientDetailViewProps) {
  const [showNoteModal, setShowNoteModal] = useState(false)
  const insightProvenance = buildPatternInsightProvenance({
    title: 'Shorter sleep observed alongside higher next-day headache ratings',
    description:
      'On 4 of 6 nights with less than 7 hours of sleep, the next check-in included a higher headache rating.',
    patternType: 'short_sleep_lagged_headache',
    status: 'available',
    confidence: 'moderate',
    sampleCount: 6,
    matchCount: 4,
    inputDateRangeStart: '2026-08-01',
    inputDateRangeEnd: '2026-08-31',
    algorithmVersion: '1.0.0',
    effectDirection: 'positive',
    checkInCount: 12,
    exposureCount: 10,
  })

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <PageHeader
        eyebrow={`${id} · Day 12 · [E2E demo]`}
        title="Maya Chen"
        description="Clinician-diagnosed concussion · Dr. Olivia Brooks · Last check-in today at 8:42 AM"
        action={
          <button
            onClick={() => setShowNoteModal(true)}
            className="no-print rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-1.5 hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="size-4" /> Add clinical note
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Symptom total" value="15 / 48" detail="Patient-reported today" icon={Activity} />
        <StatCard label="Headache" value="2 / 6" detail="Down from 5 on Aug 25" icon={HeartPulse} />
        <StatCard label="Check-in coverage" value="92%" detail="11 of 12 days" icon={Check} />
        <StatCard label="Safety events" value="0" detail="In selected period" icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Longitudinal recovery</h2>
          <div className="mt-4">
            <TrendChart clinical />
          </div>
        </Card>
        <InsightCard provenance={insightProvenance} />
      </div>
      <ExplanationView
        provenance={insightProvenance}
        title="Clinician insight provenance"
        compact
        id="clinician-insight-explanation"
      />
      {showNoteModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <Card className="max-w-md p-6">
            <p className="font-semibold text-foreground">[E2E demo] Clinical encounter</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Encounter documentation is simulated in demo mode.
            </p>
            <Button className="mt-4" onClick={() => setShowNoteModal(false)}>
              Close
            </Button>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function PatientDetailViewLive({ id }: PatientDetailViewProps) {
  const today = useMemo(() => getLocalDateString(), [])
  const [activeTab, setActiveTab] = useState('overview')
  const [encounterModal, setEncounterModal] = useState<{
    open: boolean
    encounterId?: Id<'clinicalEncounters'>
    mode: 'create' | 'view' | 'amend'
  }>({ open: false, mode: 'create' })

  const patient = useQuery(api.patients.getByDisplayId, id ? { displayId: id } : 'skip')
  const summary = useQuery(
    api.patientDashboard.getSummary,
    patient ? { patientId: patient._id, today } : 'skip'
  )
  const baseline = useQuery(
    api.baseline.getCurrentForPatient,
    patient ? { patientId: patient._id } : 'skip'
  )
  const patternInsights = useQuery(
    api.patternInsights.listForPatient,
    patient ? { patientId: patient._id } : 'skip'
  )
  const patientAlerts = useQuery(
    api.alerts.listByPatient,
    patient ? { patientId: patient._id, includeResolved: false, limit: 10 } : 'skip'
  )
  const carePlans = useQuery(
    api.carePlans.listByPatient,
    patient ? { patientId: patient._id } : 'skip'
  )

  const primaryInsight = patternInsights?.[0]
  const insightProvenance = primaryInsight
    ? buildPatternInsightProvenance({
        title: primaryInsight.title,
        description: primaryInsight.description,
        patternType: primaryInsight.patternType,
        status: primaryInsight.status,
        confidence: primaryInsight.confidence ?? null,
        sampleCount: primaryInsight.sampleCount,
        matchCount: primaryInsight.matchCount,
        inputDateRangeStart: primaryInsight.inputDateRangeStart ?? null,
        inputDateRangeEnd: primaryInsight.inputDateRangeEnd ?? null,
        algorithmVersion: primaryInsight.algorithmVersion,
        effectDirection: primaryInsight.effectDirection ?? null,
        checkInCount: primaryInsight.sampleCount,
        exposureCount: primaryInsight.matchCount,
      })
    : summary?.insight.provenance ?? null

  if (!id) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Patient identifier is required.
      </Card>
    )
  }

  if (patient === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">Loading patient workspace…</p>
      </div>
    )
  }

  if (patient === null) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium text-foreground">Patient not found or access denied</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You need an active clinical assignment and organization membership to view this record.
        </p>
        <Button asChild variant="outline" className="mt-4 no-print">
          <Link href="/clinician/patients">Back to caseload</Link>
        </Button>
      </Card>
    )
  }

  const displayName = patient.preferredName ?? summary?.patientName ?? patient.displayId
  const dayLabel = summary?.dayNumber ? `Day ${summary.dayNumber}` : 'Episode'
  const clinicianLabel = summary?.nextEncounterClinicianName
    ? `Dr. ${summary.nextEncounterClinicianName}`
    : 'Assigned clinician'

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <PageHeader
        eyebrow={`${patient.displayId} · ${dayLabel}`}
        title={displayName}
        description={`${summary?.injuryContext ?? 'Recovery episode'} · ${clinicianLabel} · ${summary?.hasCheckInToday ? 'Checked in today' : summary?.latestCheckInDate ? `Last check-in ${summary.latestCheckInDate}` : 'No check-ins yet'}`}
        action={
          <div className="flex flex-wrap items-center gap-2 no-print">
            <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="size-4" aria-hidden="true" />
              Print
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setEncounterModal({ open: true, mode: 'create' })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add encounter
            </Button>
          </div>
        }
      />

      {summary === undefined ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading recovery summary…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4 print:grid-cols-2">
          <StatCard
            label="Symptom total"
            value={
              summary.latestSymptomTotal !== null
                ? `${summary.latestSymptomTotal} / 48`
                : '—'
            }
            detail="Patient-reported"
            icon={Activity}
          />
          <StatCard
            label="Headache"
            value={
              summary.latestHeadacheRating !== null
                ? `${summary.latestHeadacheRating} / 6`
                : '—'
            }
            detail="Latest check-in"
            icon={HeartPulse}
          />
          <StatCard
            label="Check-in coverage"
            value={`${summary.checkInConsistency.ratePercent ?? 0}%`}
            detail={`${summary.checkInConsistency.recordedDays} of ${summary.checkInConsistency.eligibleDays} days`}
            icon={Check}
          />
          <StatCard
            label="Safety events"
            value={summary.safetyEscalation ? '1' : '0'}
            detail={summary.safetyEscalation?.headline ?? 'In selected period'}
            icon={ShieldCheck}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="no-print">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="check-ins">Check-ins</TabsTrigger>
          <TabsTrigger value="exposures">Exposures</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="care-plan">Care plan</TabsTrigger>
          <TabsTrigger value="encounters">Encounters</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <h2 className="font-semibold text-foreground">Longitudinal recovery</h2>
                <DataSourceBadge kind="patient_reported" />
              </div>
              <TrendChart
                clinical
                data={
                  summary?.chartPoints
                    ? mapChartPointsToTrendData(summary.chartPoints)
                    : undefined
                }
              />
            </Card>
            {primaryInsight || summary?.insight ? (
              <InsightCard
                title={primaryInsight?.title ?? summary?.insight.title}
                description={primaryInsight?.description ?? summary?.insight.description}
                footer={primaryInsight?.footer ?? summary?.insight.footer}
                confidence={primaryInsight?.confidence ?? null}
                sampleCount={primaryInsight?.sampleCount ?? summary?.insight.sourceRecordCount}
                effectDirection={primaryInsight?.effectDirection ?? null}
                provenance={insightProvenance ?? undefined}
              />
            ) : (
              <Card className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                No computed insights available yet.
              </Card>
            )}
          </div>
          {insightProvenance ? (
            <ExplanationView
              provenance={insightProvenance}
              title="Insight provenance"
              compact
              id="clinician-insight-explanation"
            />
          ) : null}
          {baseline ? (
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-foreground">Episode baseline</h2>
                <DataSourceBadge kind="patient_reported" />
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Incident date</dt>
                  <dd className="font-medium text-foreground">{baseline.incidentDate}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Diagnosis status</dt>
                  <dd className="font-medium text-foreground">{baseline.diagnosisStatus}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-muted-foreground">Incident context</dt>
                  <dd className="font-medium text-foreground">{baseline.incidentContext}</dd>
                </div>
              </dl>
            </Card>
          ) : (
            <Card className="p-6 text-sm text-muted-foreground">
              No baseline assessment on file for the active episode.
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <RecoveryTimeline patientId={patient._id} />
        </TabsContent>

        <TabsContent value="check-ins">
          <CheckInHistory patientId={patient._id} />
        </TabsContent>

        <TabsContent value="exposures">
          <ExposureEntryList patientId={patient._id} />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {patternInsights === undefined ? (
            <Card className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading patterns…
            </Card>
          ) : patternInsights.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Insufficient data for longitudinal pattern detection.
            </Card>
          ) : (
            patternInsights.map(insight => {
              const provenance = buildPatternInsightProvenance({
                title: insight.title,
                description: insight.description,
                patternType: insight.patternType,
                status: insight.status,
                confidence: insight.confidence ?? null,
                sampleCount: insight.sampleCount,
                matchCount: insight.matchCount,
                inputDateRangeStart: insight.inputDateRangeStart ?? null,
                inputDateRangeEnd: insight.inputDateRangeEnd ?? null,
                algorithmVersion: insight.algorithmVersion,
                effectDirection: insight.effectDirection ?? null,
                checkInCount: insight.sampleCount,
                exposureCount: insight.matchCount,
              })
              return (
                <div key={insight._id} className="space-y-3">
                  <InsightCard
                    title={insight.title}
                    description={insight.description}
                    footer={insight.footer}
                    confidence={insight.confidence}
                    sampleCount={insight.sampleCount}
                    effectDirection={insight.effectDirection}
                    provenance={provenance}
                  />
                  <ExplanationView
                    provenance={provenance}
                    title="Pattern provenance"
                    compact
                    id={`pattern-${insight._id}`}
                  />
                </div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="care-plan">
          {carePlans === undefined ? (
            <Card className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading care plan…
            </Card>
          ) : carePlans.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No care plan tasks assigned.
            </Card>
          ) : (
            <Card className="divide-y divide-border p-0">
              {carePlans.map(plan => (
                <div key={plan._id} className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{plan.title}</p>
                      <DataSourceBadge
                        kind={plan.isClinicianAuthored ? 'clinician_authored' : 'patient_reported'}
                      />
                    </div>
                    {plan.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                    ) : null}
                  </div>
                  <Badge tone={plan.completed ? 'good' : 'neutral'}>
                    {plan.completionStatus}
                  </Badge>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="encounters">
          <EncounterRecordsPanel
            patientId={patient._id}
            onAddEncounter={() => setEncounterModal({ open: true, mode: 'create' })}
            onViewEncounter={encounterId =>
              setEncounterModal({ open: true, encounterId, mode: 'view' })
            }
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-3">
          {patientAlerts === undefined ? (
            <Card className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading alerts…
            </Card>
          ) : patientAlerts.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No active alerts for this patient.
            </Card>
          ) : (
            patientAlerts.map(view => (
              <Card key={view.alert._id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
                    <Badge
                      tone={
                        view.alert.severity === 'High'
                          ? 'bad'
                          : view.alert.severity === 'Medium'
                            ? 'warn'
                            : 'neutral'
                      }
                    >
                      {view.alert.severity}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{view.freshnessLabel}</span>
                </div>
                <p className="mt-2 text-sm text-foreground">{view.alert.detail}</p>
                {view.provenance ? (
                  <ExplanationView
                    provenance={view.provenance}
                    title="Alert provenance"
                    compact
                    id={`alert-${view.alert._id}`}
                  />
                ) : null}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="messages">
          <ClinicianPatientMessagesPanel patientId={patient._id} />
        </TabsContent>
      </Tabs>

      <div className="hidden print:block space-y-6">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Clinical summary (print)</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {displayName} · {patient.displayId} · {dayLabel}
          </p>
          {summary ? (
            <p className="mt-4 text-sm">
              Latest symptom total: {summary.latestSymptomTotal ?? '—'} / 48 · Check-in coverage:{' '}
              {summary.checkInConsistency.ratePercent ?? 0}%
            </p>
          ) : null}
        </Card>
      </div>

      {encounterModal.open ? (
        <ClinicalEncounterModal
          patientId={patient._id}
          patientName={displayName}
          encounterId={encounterModal.encounterId}
          mode={encounterModal.mode}
          onClose={() => setEncounterModal({ open: false, mode: 'create' })}
        />
      ) : null}
    </div>
  )
}

export function PatientDetailView(props: PatientDetailViewProps) {
  if (isE2ETestMode) {
    return <PatientDetailViewDemo {...props} />
  }
  return <PatientDetailViewLive {...props} />
}
