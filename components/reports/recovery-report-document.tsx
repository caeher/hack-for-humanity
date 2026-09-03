'use client'

import React from 'react'
import { Activity, AlertTriangle, Check, FileText, Info, LockKeyhole } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { DataSourceBadge, type DataSourceKind } from '@/components/clinician/data-source-badge'
import { StatCard } from '@/components/dashboard/stat-card'
import {
  REPORT_DISCLAIMER,
  formatReportDateRange,
  formatReportTimestamp,
  type RecoveryReportPayload,
} from '@/lib/recoveryReport'
import { cn } from '@/lib/utils'

function mapSourceKind(kind: string): DataSourceKind {
  if (kind === 'clinician_authored') return 'clinician_authored'
  if (kind === 'computed_trend' || kind === 'safety_outcome') return 'computed_insight'
  return 'patient_reported'
}

function SourceLabel({ kind }: { kind: string }) {
  return <DataSourceBadge kind={mapSourceKind(kind)} />
}

export interface RecoveryReportDocumentProps {
  payload: RecoveryReportPayload
  className?: string
}

export function RecoveryReportDocument({ payload, className }: RecoveryReportDocumentProps) {
  const { metadata, symptoms, trends, exposure, events, planAdherence, patterns, safety, encounters } =
    payload

  return (
    <article
      className={cn(
        'mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 sm:p-8 warm-shadow print-report',
        className
      )}
      aria-label="Concussion recovery summary report"
    >
      <header className="border-b border-border pb-6">
        <p className="font-mono text-xs text-muted-foreground">
          CRI RECOVERY SUMMARY · {metadata.patientDisplayId}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">{metadata.patientPreferredName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatReportDateRange(metadata.rangeStart, metadata.rangeEnd)}
          {metadata.episodeDayLabel ? ` · ${metadata.episodeDayLabel}` : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge tone={metadata.dataSource === 'live' ? 'good' : 'neutral'}>
            {metadata.dataSource === 'live' ? 'Live data' : 'Simulated demo'}
          </Badge>
          <Badge tone="neutral">Report v{payload.schemaVersion}</Badge>
        </div>
      </header>

      {symptoms && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Symptom summary</h2>
            <SourceLabel kind={symptoms.sourceKind} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Latest total"
              value={symptoms.latestSymptomTotal?.toString() ?? '—'}
              detail={`Descriptive ${symptoms.metricRange}`}
              icon={Activity}
            />
            <StatCard
              label="Check-ins"
              value={`${symptoms.checkInCount} / ${symptoms.expectedDays}`}
              detail={symptoms.gapDays > 0 ? `${symptoms.gapDays} missing days` : 'Complete coverage'}
              icon={Check}
            />
            <StatCard
              label="Safety events"
              value={String(safety?.eventCount ?? 0)}
              detail="In selected period"
              icon={AlertTriangle}
            />
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">{symptoms.notRecoveryScore}</p>
          {symptoms.missingDataNote && (
            <p className="mt-2 text-xs leading-5 text-warning">{symptoms.missingDataNote}</p>
          )}

          <div
            role="region"
            aria-label="Individual symptom ratings table"
            tabIndex={0}
            className="mt-6 overflow-x-auto focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-md"
          >
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <caption className="sr-only">Individual symptom ratings by dimension</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Symptom</th>
                  <th className="py-2 pr-4">Latest</th>
                  <th className="py-2">Period average</th>
                </tr>
              </thead>
              <tbody>
                {symptoms.dimensionSummaries.map(dimension => (
                  <tr key={dimension.dimensionId} className="border-b border-border/60">
                    <td className="py-2 pr-4 text-foreground">{dimension.label}</td>
                    <td className="py-2 pr-4 font-mono">{dimension.latestRating ?? '—'}</td>
                    <td className="py-2 font-mono">{dimension.averageRating ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {payload.episode && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Recovery episode</h2>
            <SourceLabel kind={payload.episode.sourceKind} />
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Incident date</dt>
              <dd className="font-medium text-foreground">{payload.episode.incidentDate ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Context</dt>
              <dd className="font-medium text-foreground">{payload.episode.injuryContext ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Episode status</dt>
              <dd className="font-medium text-foreground">{payload.episode.status ?? 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Risk classification</dt>
              <dd className="font-medium text-foreground">{payload.episode.riskLevel ?? 'Not set'}</dd>
            </div>
          </dl>
          {payload.episode.missingEpisodeNote && (
            <p className="mt-3 text-xs text-muted-foreground">{payload.episode.missingEpisodeNote}</p>
          )}
        </section>
      )}

      {trends && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Symptom trend</h2>
            <SourceLabel kind={trends.sourceKind} />
          </div>
          <p className="text-sm leading-6 text-foreground">{trends.summaryText}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{trends.disclaimerText}</p>
          {trends.readiness === 'insufficient' && (
            <p className="mt-2 text-xs text-warning">Insufficient check-ins for a reliable trend in this window.</p>
          )}
        </section>
      )}

      {exposure && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Sleep & activity context</h2>
            <SourceLabel kind={exposure.sourceKind} />
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Logged days</dt>
              <dd className="font-medium text-foreground">{exposure.loggedDays}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg sleep (hrs)</dt>
              <dd className="font-medium text-foreground">{exposure.averageSleepHours ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Avg screen (min)</dt>
              <dd className="font-medium text-foreground">{exposure.averageScreenMinutes ?? '—'}</dd>
            </div>
          </dl>
          {exposure.missingDataNote && (
            <p className="mt-3 text-xs text-muted-foreground">{exposure.missingDataNote}</p>
          )}
        </section>
      )}

      {events && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Recovery events</h2>
            <SourceLabel kind={events.sourceKind} />
          </div>
          <p className="text-sm text-foreground">{events.summary.headline}</p>
          <ul className="mt-4 space-y-3">
            {events.markers.slice(0, 8).map(marker => (
              <li key={marker.id} className="rounded-lg border border-border/70 p-3">
                <p className="text-xs text-muted-foreground">{marker.date}</p>
                <p className="font-medium text-foreground">{marker.title}</p>
                <p className="text-sm text-muted-foreground">{marker.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {planAdherence && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Care plan adherence</h2>
            <SourceLabel kind={planAdherence.sourceKind} />
          </div>
          <p className="text-sm leading-6 text-foreground">{planAdherence.neutralSummary}</p>
        </section>
      )}

      {patterns && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Observed associations</h2>
            <SourceLabel kind={patterns.sourceKind} />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{patterns.disclaimer}</p>
          {patterns.patterns.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {patterns.patterns.map(pattern => (
                <li key={pattern.patternType} className="rounded-lg border border-border/70 p-3">
                  <p className="font-medium text-foreground">{pattern.title}</p>
                  <p className="text-sm text-muted-foreground">{pattern.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{pattern.footer}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{patterns.insufficientNote}</p>
          )}
        </section>
      )}

      {safety && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Safety outcomes</h2>
            <SourceLabel kind={safety.sourceKind} />
          </div>
          {safety.evaluations.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {safety.evaluations.map(evaluation => (
                <li key={evaluation.evaluationId} className="rounded-lg border border-border/70 p-3">
                  <p className="font-medium text-foreground">
                    {evaluation.status} · {evaluation.highestSeverity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatReportTimestamp(evaluation.createdAt, metadata.timeZone)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{safety.missingDataNote}</p>
          )}
        </section>
      )}

      {encounters && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">Clinical encounters</h2>
            <SourceLabel kind={encounters.sourceKind} />
          </div>
          {encounters.items.length > 0 ? (
            <ul className="space-y-3">
              {encounters.items.map(encounter => (
                <li key={encounter.encounterId} className="rounded-lg border border-border/70 p-3">
                  <p className="text-xs text-muted-foreground">
                    {encounter.datetime.slice(0, 10)} · {encounter.encounterType}
                  </p>
                  <p className="font-medium text-foreground">{encounter.diagnosis}</p>
                  <p className="text-sm text-muted-foreground">{encounter.clinicalSummary}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{encounters.missingDataNote}</p>
          )}
        </section>
      )}

      {payload.discussionQuestions.length > 0 && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex items-center gap-2">
            <Info className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Questions for your care team</h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            These prompts support conversation — they are not diagnoses or treatment recommendations.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-foreground">
            {payload.discussionQuestions.map(question => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
      )}

      {payload.sectionsOmitted.length > 0 && (
        <section className="mt-8 border-t border-border pt-6">
          <div className="mb-3 flex items-center gap-2">
            <LockKeyhole className="size-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Sections not included</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {payload.sectionsOmitted.map(item => (
              <li key={item.section}>
                <span className="font-medium text-foreground">{item.section}:</span> {item.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
        <p>{REPORT_DISCLAIMER}</p>
        <p className="mt-3">
          Generated {formatReportTimestamp(metadata.generatedAt, metadata.timeZone)} by{' '}
          {metadata.requestedByName} ({metadata.requestedByRole}). Data cutoff:{' '}
          {formatReportTimestamp(metadata.dataCutoffAt, metadata.timeZone)}.
        </p>
        <p className="mt-2">
          Methodology: symptom {payload.methodologyVersions.symptom}, patterns{' '}
          {payload.methodologyVersions.pattern}, safety {payload.methodologyVersions.safety}.
        </p>
      </footer>
    </article>
  )
}

export function RecoveryReportPreviewCard({
  payload,
  onPrint,
  onExport,
}: {
  payload: RecoveryReportPayload
  onPrint: () => void
  onExport: () => void
}) {
  return (
    <Card className="p-6 no-print">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4 items-center">
          <div className="grid size-12 place-items-center rounded-lg bg-muted text-foreground shrink-0">
            <FileText className="size-6" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {payload.metadata.rangeKey === 'episode' ? 'Episode' : `${payload.metadata.rangeKey}-day`} recovery
              summary
            </h2>
            <p className="text-sm text-muted-foreground">
              {formatReportDateRange(payload.metadata.rangeStart, payload.metadata.rangeEnd)} ·{' '}
              {payload.symptoms?.checkInCount ?? 0} check-ins · Updated{' '}
              {formatReportTimestamp(payload.metadata.generatedAt, payload.metadata.timeZone)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Print / PDF
          </button>
          <button
            type="button"
            onClick={onExport}
            className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Export JSON
          </button>
        </div>
      </div>
    </Card>
  )
}
