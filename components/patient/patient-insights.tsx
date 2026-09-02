'use client'

import React from 'react'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts'
import { InsightCard } from '@/components/dashboard'
import { ExplanationView } from '@/components/explanation'
import { api } from '@/convex/_generated/api'
import { getLocalDateString } from '@/lib/checkInHistory'
import { isE2ETestMode } from '@/lib/e2e'
import { NON_CAUSAL_DISCLAIMER, PATTERN_DETECTION_VERSION } from '@/lib/patternDetection'
import { buildPatternInsightProvenance } from '@/lib/provenance'

function PatientInsightsDemo() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Explainable intelligence"
        title="Recovery insights"
        description="Transparent statistical associations between symptoms, sleep, activity, and screen exposure in your logged entries."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          title="Shorter sleep observed alongside higher next-day headache ratings"
          description={`On 4 of 6 nights with less than 7 hours of sleep, the next check-in included a higher headache rating. ${NON_CAUSAL_DISCLAIMER}`}
          footer={`BASED ON 12 CHECK-INS · ALGORITHM v${PATTERN_DETECTION_VERSION} · SIMULATED DATA`}
          confidence="moderate"
          sampleCount={6}
          effectDirection="positive"
          provenance={buildPatternInsightProvenance({
            title: 'Shorter sleep observed alongside higher next-day headache ratings',
            description: `On 4 of 6 nights with less than 7 hours of sleep, the next check-in included a higher headache rating. ${NON_CAUSAL_DISCLAIMER}`,
            patternType: 'short_sleep_lagged_headache',
            status: 'available',
            confidence: 'moderate',
            sampleCount: 6,
            matchCount: 4,
            inputDateRangeStart: '2026-08-01',
            inputDateRangeEnd: '2026-08-31',
            algorithmVersion: PATTERN_DETECTION_VERSION,
            effectDirection: 'positive',
            checkInCount: 12,
            exposureCount: 10,
          })}
        />
        <InsightCard
          title="Higher screen time observed alongside higher headache ratings"
          description={`Across 8 days with both screen time and headache ratings logged, higher values appeared together (rank association 0.71). ${NON_CAUSAL_DISCLAIMER}`}
          footer={`BASED ON 12 CHECK-INS · ALGORITHM v${PATTERN_DETECTION_VERSION} · SIMULATED DATA`}
          confidence="moderate"
          sampleCount={8}
          effectDirection="positive"
          provenance={buildPatternInsightProvenance({
            title: 'Higher screen time observed alongside higher headache ratings',
            description: `Across 8 days with both screen time and headache ratings logged, higher values appeared together (rank association 0.71). ${NON_CAUSAL_DISCLAIMER}`,
            patternType: 'high_screen_same_day_headache',
            status: 'available',
            confidence: 'moderate',
            sampleCount: 8,
            matchCount: 5,
            inputDateRangeStart: '2026-08-01',
            inputDateRangeEnd: '2026-08-31',
            algorithmVersion: PATTERN_DETECTION_VERSION,
            effectDirection: 'positive',
            checkInCount: 12,
            exposureCount: 10,
          })}
        />
      </div>
      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">How patterns are detected</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          CRI uses deterministic statistical methods — rank correlations and threshold counting — to
          identify temporal associations in your logged data. At least five complete check-ins are
          required before any pattern is shown. {NON_CAUSAL_DISCLAIMER}
        </p>
      </Card>
      <div className="rounded-xl border border-border bg-accent p-4 text-sm leading-6 text-foreground">
        <strong>Prototype decision support.</strong> CRI does not diagnose conditions or replace your
        care team. If you have urgent symptoms, call local emergency services.
      </div>
    </div>
  )
}

function PatientInsightsLive() {
  const today = getLocalDateString()

  const patient = useQuery(api.patients.getMePatient)

  const patternResult = useQuery(
    api.patternInsights.computeForPatient,
    patient?._id ? { patientId: patient._id, today } : 'skip'
  )

  const availablePatterns =
    patternResult?.patterns.filter(pattern => pattern.status === 'available') ?? []

  const insufficientPatterns =
    patternResult?.patterns.filter(pattern => pattern.status === 'insufficient') ?? []

  if (patient === undefined || patternResult === undefined) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading insights">
        <PageHeader
          eyebrow="Explainable intelligence"
          title="Recovery insights"
          description="Patterns detected across your check-ins, care plan, and connected health signals."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="h-48 animate-pulse bg-muted/40" />
          <Card className="h-48 animate-pulse bg-muted/40" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Explainable intelligence"
        title="Recovery insights"
        description="Transparent statistical associations between symptoms, sleep, activity, and screen exposure in your logged entries."
      />

      {availablePatterns.length === 0 ? (
        <Card className="p-6">
          <Badge tone="neutral">Insufficient data</Badge>
          <h2 className="mt-4 text-lg font-semibold text-foreground">
            {insufficientPatterns[0]?.title ?? 'More check-ins needed for pattern observations'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {insufficientPatterns[0]?.description ??
              'CRI needs additional complete check-ins and exposure context before describing temporal associations. Missing days remain blank — never treated as zero.'}
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground uppercase">
            {`BASED ON ${patternResult.checkInCount} CHECK-INS · ALGORITHM v${patternResult.algorithmVersion}`}
          </p>
          {insufficientPatterns[0]?.provenance ? (
            <div className="mt-4">
              <ExplanationView
                provenance={insufficientPatterns[0].provenance}
                title="Why more data is needed"
                compact
                id="insufficient-insight-explanation"
              />
            </div>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {availablePatterns.map(pattern => (
            <InsightCard
              key={pattern.patternType}
              title={pattern.title}
              description={pattern.description}
              footer={pattern.footer}
              confidence={pattern.confidence}
              sampleCount={pattern.sampleCount}
              effectDirection={pattern.effectDirection}
              provenance={pattern.provenance}
            />
          ))}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">How patterns are detected</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          CRI uses deterministic statistical methods — rank correlations and threshold counting — to
          identify temporal associations in your logged data. At least five complete check-ins are
          required before any pattern is shown. {NON_CAUSAL_DISCLAIMER}
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Algorithm version: {patternResult.algorithmVersion} · Window:{' '}
          {patternResult.exposureCount} exposure days analyzed
        </p>
        <Link
          href="/patient/timeline"
          className="mt-4 inline-block text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary"
        >
          View timeline evidence
        </Link>
      </Card>

      <div className="rounded-xl border border-border bg-accent p-4 text-sm leading-6 text-foreground">
        <strong>Prototype decision support.</strong> CRI does not diagnose conditions or replace your
        care team. If you have urgent symptoms, call local emergency services.
      </div>
    </div>
  )
}

export function PatientInsightsView() {
  if (isE2ETestMode) {
    return <PatientInsightsDemo />
  }

  return <PatientInsightsLive />
}
