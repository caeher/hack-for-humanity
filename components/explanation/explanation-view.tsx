'use client'

import React from 'react'
import { ChevronDown, Info, LockKeyhole } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  formatDateRangeLabel,
  type ProvenanceMetadata,
} from '@/lib/provenance'
import { cn } from '@/lib/utils'

export interface ExplanationViewProps {
  provenance: ProvenanceMetadata
  title?: string
  compact?: boolean
  className?: string
  id?: string
}

function confidenceTone(
  confidence: ProvenanceMetadata['confidence']
): 'good' | 'neutral' | 'bad' | undefined {
  switch (confidence) {
    case 'high':
      return 'good'
    case 'moderate':
    case 'low':
      return 'neutral'
    case 'insufficient':
      return 'bad'
    case 'not_applicable':
      return undefined
    default: {
      const exhaustive: never = confidence
      return exhaustive
    }
  }
}

function formatConfidenceBadge(confidence: ProvenanceMetadata['confidence']): string {
  switch (confidence) {
    case 'high':
      return 'High confidence'
    case 'moderate':
      return 'Moderate confidence'
    case 'low':
      return 'Low confidence'
    case 'insufficient':
      return 'Insufficient data'
    case 'not_applicable':
      return 'Not scored'
    default: {
      const exhaustive: never = confidence
      return exhaustive
    }
  }
}

export function ExplanationView({
  provenance,
  title = 'Why you are seeing this',
  compact = false,
  className,
  id = 'explanation-view',
}: ExplanationViewProps) {
  const visibleCategories =
    provenance.contributingCategories?.filter(category => category.visible) ?? []
  const hiddenCategoryCount =
    (provenance.contributingCategories?.length ?? 0) - visibleCategories.length
  const confidenceBadgeTone = confidenceTone(provenance.confidence)
  const dateRangeLabel = formatDateRangeLabel(
    provenance.dateRangeStart,
    provenance.dateRangeEnd
  )

  return (
    <Card
      className={cn('p-5', className)}
      aria-labelledby={`${id}-heading`}
      data-testid="explanation-view"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-accent text-foreground">
            <Info className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h3 id={`${id}-heading`} className="text-sm font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{provenance.sourceKindLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {confidenceBadgeTone ? (
            <Badge tone={confidenceBadgeTone}>{formatConfidenceBadge(provenance.confidence)}</Badge>
          ) : (
            <Badge tone="neutral">{formatConfidenceBadge(provenance.confidence)}</Badge>
          )}
          <Badge className="font-mono text-[10px]">v{provenance.methodVersion}</Badge>
        </div>
      </div>

      <p className="text-sm leading-6 text-foreground">{provenance.plainLanguageRationale}</p>

      {provenance.recomputedFromAmendment && (
        <p className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Updated after a check-in correction
          {provenance.amendmentNote ? `: ${provenance.amendmentNote}` : '.'}
        </p>
      )}

      <dl className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Source period
          </dt>
          <dd className="mt-1 text-foreground">{dateRangeLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Method
          </dt>
          <dd className="mt-1 text-foreground">
            {provenance.methodName}
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              v{provenance.methodVersion}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Confidence
          </dt>
          <dd className="mt-1 text-muted-foreground">{provenance.confidenceExplanation}</dd>
        </div>
      </dl>

      {visibleCategories.length > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contributing symptom categories
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Contributing symptom categories">
            {visibleCategories.map(category => (
              <li
                key={category.label}
                className="flex items-center justify-between gap-2 text-sm text-foreground"
              >
                <span>{category.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {category.rating ?? '—'} / 6
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(provenance.restrictedDetailCount ?? 0) > 0 || hiddenCategoryCount > 0 ? (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Some private details are hidden based on your access permissions.
        </p>
      ) : null}

      {!compact && provenance.sourceRecords.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Source records
          </p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {provenance.sourceRecords
              .filter(record => record.visible)
              .map(record => (
                <li key={`${record.recordType}-${record.label}`}>{record.label}</li>
              ))}
          </ul>
        </div>
      )}

      {!compact && provenance.evidenceReferences.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence & rules
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {provenance.evidenceReferences.map(reference => (
              <li key={`${reference.label}-${reference.ruleId ?? reference.version ?? ''}`}>
                <span className="font-medium text-foreground">{reference.label}</span>
                {reference.authority ? ` · ${reference.authority}` : null}
                {reference.citation ? (
                  <span className="block mt-0.5 text-xs leading-5">{reference.citation}</span>
                ) : null}
                {reference.ruleId ? (
                  <span className="block font-mono text-[10px]">
                    Rule {reference.ruleId}
                    {reference.version ? ` v${reference.version}` : ''}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {provenance.technicalDetail ? (
        <Collapsible className="mt-4 border-t border-border pt-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>Technical details</span>
            <ChevronDown className="size-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 text-xs leading-5 text-muted-foreground">
            {provenance.technicalDetail}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        {provenance.nonDiagnosticDisclaimer}
      </p>
    </Card>
  )
}
