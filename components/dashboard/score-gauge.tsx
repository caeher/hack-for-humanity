import React from 'react'
import { Badge } from '@/components/ui/badge'
import type { TrendDirection } from '@/lib/symptomMethodology'

export interface ScoreGaugeProps {
  score?: number
  maxScore?: number
  tone?: 'good' | 'neutral' | 'warn' | 'bad'
  statusText?: string
  changeText?: string
  description?: string
  trendDirection?: TrendDirection | null
  methodologyVersion?: string
}

const trendToneMap: Record<TrendDirection, ScoreGaugeProps['tone']> = {
  decreasing: 'good',
  stable: 'neutral',
  increasing: 'warn',
  mixed: 'neutral',
}

export function ScoreGauge({
  score = 15,
  maxScore = 48,
  tone = 'good',
  statusText = 'Lower than last week',
  changeText = '-12 points this week',
  description = 'Patient-reported total across eight tracked symptoms. Not a clinical recovery score.',
  trendDirection = null,
  methodologyVersion,
}: ScoreGaugeProps) {
  const progress = Math.min(100, Math.max(0, (score / maxScore) * 100))
  const resolvedTone = trendDirection ? trendToneMap[trendDirection] ?? tone : tone

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative grid size-32 place-items-center rounded-full"
        style={{ background: `conic-gradient(#f9a600 ${progress}%, #f0ede7 0)` }}
      >
        <div className="grid size-24 place-items-center rounded-full bg-card shadow-xs">
          <div className="text-center">
            <strong className="text-4xl tracking-[-.05em] text-foreground">{score}</strong>
            <p className="text-xs text-muted-foreground">of {maxScore}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={resolvedTone}>{statusText}</Badge>
          {methodologyVersion && (
            <span className="font-mono text-[10px] text-muted-foreground">
              method v{methodologyVersion}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground">{changeText}</p>
        <p className="max-w-52 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
