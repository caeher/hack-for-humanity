import React from 'react'
import { Badge } from '@/components/ui/badge'

export interface ScoreGaugeProps {
  score?: number
  tone?: 'good' | 'neutral' | 'warn' | 'bad'
  statusText?: string
  changeText?: string
  description?: string
}

export function ScoreGauge({
  score = 78,
  tone = 'good',
  statusText = 'On track',
  changeText = '+6 this week',
  description = 'Mobility and pain are trending in the right direction.',
}: ScoreGaugeProps) {
  return (
    <div className="flex items-center gap-6">
      <div
        className="relative grid size-32 place-items-center rounded-full"
        style={{ background: `conic-gradient(#f9a600 ${score}%, #f0ede7 0)` }}
      >
        <div className="grid size-24 place-items-center rounded-full bg-card shadow-xs">
          <div className="text-center">
            <strong className="text-4xl tracking-[-.05em] text-foreground">{score}</strong>
            <p className="text-xs text-muted-foreground">of 100</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <Badge tone={tone}>{statusText}</Badge>
        </div>
        <p className="text-sm font-semibold text-foreground">{changeText}</p>
        <p className="max-w-44 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
