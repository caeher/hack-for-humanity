'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type DataSourceKind = 'patient_reported' | 'computed_insight' | 'clinician_authored'

const LABELS: Record<DataSourceKind, string> = {
  patient_reported: 'Patient-reported',
  computed_insight: 'Computed insight',
  clinician_authored: 'Clinician-authored',
}

const TONES: Record<DataSourceKind, 'neutral' | 'good' | 'warn'> = {
  patient_reported: 'neutral',
  computed_insight: 'good',
  clinician_authored: 'warn',
}

export interface DataSourceBadgeProps {
  kind: DataSourceKind
  className?: string
}

export function DataSourceBadge({ kind, className }: DataSourceBadgeProps) {
  return (
    <Badge tone={TONES[kind]} className={cn('text-[10px] uppercase tracking-wide', className)}>
      {LABELS[kind]}
    </Badge>
  )
}
