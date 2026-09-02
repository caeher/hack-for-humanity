'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExplanationView } from '@/components/explanation'
import { formatConfidenceLabel, formatEffectDirection } from '@/lib/patternDetection'
import type { ConfidenceLevel, EffectDirection } from '@/lib/patternDetection'
import type { ProvenanceMetadata } from '@/lib/provenance'

export interface InsightCardProps {
  title?: string
  description?: string
  footer?: string
  confidence?: ConfidenceLevel | null
  sampleCount?: number
  effectDirection?: EffectDirection | null
  provenance?: ProvenanceMetadata
  showExplanation?: boolean
}

export function InsightCard({
  title = 'Shorter sleep observed alongside higher next-day headache ratings',
  description = 'On 4 of the last 5 nights with less than 7 hours of sleep, the next check-in included a higher headache rating. Observed patterns reflect temporal associations in patient-reported entries and do not establish medical causation.',
  footer = 'BASED ON 12 CHECK-INS · SIMULATED DATA',
  confidence,
  sampleCount,
  effectDirection,
  provenance,
  showExplanation = true,
}: InsightCardProps) {
  const confidenceText = confidence ? formatConfidenceLabel(confidence) : null
  const directionText = effectDirection ? formatEffectDirection(effectDirection) : null

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-accent text-foreground">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {confidenceText ? (
              <Badge tone={confidence === 'high' ? 'good' : 'neutral'}>{confidenceText}</Badge>
            ) : null}
            <Badge>CRI insight</Badge>
          </div>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {(directionText || sampleCount !== undefined) && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {directionText ? <span>{directionText}</span> : null}
            {sampleCount !== undefined ? <span>{sampleCount} paired observations</span> : null}
          </div>
        )}
        <div className="mt-5 border-t border-border pt-4">
          <p className="font-mono text-xs text-muted-foreground uppercase">{footer}</p>
        </div>
      </Card>

      {showExplanation && provenance ? (
        <ExplanationView
          provenance={provenance}
          title="How this insight was generated"
          compact
          id="insight-explanation"
        />
      ) : null}
    </div>
  )
}
