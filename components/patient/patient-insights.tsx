'use client'

import React from 'react'
import { useQuery } from 'convex/react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts'
import { InsightCard } from '@/components/dashboard'
import { api } from '@/convex/_generated/api'
import { getLocalDateString } from '@/lib/checkInHistory'
import { NON_CAUSAL_DISCLAIMER } from '@/lib/patternDetection'

export function PatientInsightsView() {
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
            {patternResult
              ? `BASED ON ${patternResult.checkInCount} CHECK-INS · ALGORITHM v${patternResult.algorithmVersion}`
              : 'LIVE DATA'}
          </p>
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
            />
          ))}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-base font-semibold text-foreground">How patterns are detected</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          CRI uses deterministic statistical methods — rank correlations and threshold counting — to
          identify temporal associations in your logged data. At least{' '}
          {patternResult?.checkInCount !== undefined ? 'five complete check-ins' : 'five complete check-ins'}{' '}
          are required before any pattern is shown. {NON_CAUSAL_DISCLAIMER}
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Algorithm version: {patternResult?.algorithmVersion ?? '—'} · Window:{' '}
          {patternResult?.exposureCount ?? 0} exposure days analyzed
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
