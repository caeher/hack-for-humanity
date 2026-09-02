import React from 'react'
import { Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  getMethodologyInspectionRules,
  METHODOLOGY_COPY,
  SYMPTOM_METHODOLOGY_VERSION,
  type ContributingRating,
  type SymptomTotalComputation,
} from '@/lib/symptomMethodology'
import { cn } from '@/lib/utils'

export interface SymptomMethodologyPanelProps {
  computation?: SymptomTotalComputation
  contributingRatings?: ContributingRating[]
  className?: string
  compact?: boolean
}

export function SymptomMethodologyPanel({
  computation,
  contributingRatings,
  className,
  compact = false,
}: SymptomMethodologyPanelProps) {
  const ratings = contributingRatings ?? computation?.contributingRatings ?? []
  const rules = getMethodologyInspectionRules()

  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-accent text-foreground">
            <Info className="size-4" aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              How this {METHODOLOGY_COPY.metricShortName} is calculated
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {METHODOLOGY_COPY.calculationRule}
            </p>
          </div>
        </div>
        <Badge className="shrink-0 font-mono text-[10px]">v{SYMPTOM_METHODOLOGY_VERSION}</Badge>
      </div>

      {ratings.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contributing ratings
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {ratings.map(entry => (
              <li
                key={entry.dimensionId}
                className="flex items-center justify-between gap-2 text-sm text-foreground"
              >
                <span>{entry.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {entry.rating} / 6
                </span>
              </li>
            ))}
          </ul>
          {computation && (
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              Sum: {computation.total ?? 0}
              {computation.status === 'partial'
                ? ` across ${computation.answeredCount} of ${computation.requiredCount} dimensions (partial — missing excluded)`
                : ` / ${computation.requiredCount * 6} maximum`}
            </p>
          )}
        </div>
      )}

      {!compact && (
        <dl className="flex flex-col gap-3">
          {rules.map(rule => (
            <div key={rule.title}>
              <dt className="text-xs font-semibold text-foreground">{rule.title}</dt>
              <dd className="mt-0.5 text-xs leading-5 text-muted-foreground">{rule.detail}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className={cn('text-xs leading-5 text-muted-foreground', !compact && 'mt-4 border-t border-border pt-4')}>
        {METHODOLOGY_COPY.notRecoveryScore}
      </p>
    </Card>
  )
}
