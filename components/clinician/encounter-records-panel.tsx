'use client'

import React, { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { FileText, Loader2, Plus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataSourceBadge } from './data-source-badge'
import { cn } from '@/lib/utils'

const ENCOUNTER_TYPE_LABELS: Record<string, string> = {
  'in-person': 'In-person',
  telehealth: 'Telehealth',
  asynchronous: 'Asynchronous review',
}

export interface EncounterRecordsPanelProps {
  patientId: Id<'patients'>
  onAddEncounter?: () => void
  onViewEncounter?: (encounterId: Id<'clinicalEncounters'>) => void
  className?: string
}

export function EncounterRecordsPanel({
  patientId,
  onAddEncounter,
  onViewEncounter,
  className,
}: EncounterRecordsPanelProps) {
  const encounters = useQuery(api.encounters.listByPatient, {
    patientId,
    includeDrafts: true,
  })

  const sorted = useMemo(() => {
    if (!encounters || !Array.isArray(encounters)) return []
    return [...encounters]
  }, [encounters])

  if (encounters === undefined) {
    return (
      <Card className={cn('flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground', className)}>
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading encounter records…
      </Card>
    )
  }

  if (sorted.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">No clinical encounters yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Document in-person, telehealth, or asynchronous review notes for this patient.
            </p>
          </div>
          {onAddEncounter ? (
            <Button type="button" onClick={onAddEncounter} className="mt-2">
              <Plus className="size-4" aria-hidden="true" />
              Add encounter
            </Button>
          ) : null}
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">Clinical encounters</h2>
            <DataSourceBadge kind="clinician_authored" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Finalized records are immutable; amendments are audited.
          </p>
        </div>
        {onAddEncounter ? (
          <Button type="button" size="sm" onClick={onAddEncounter}>
            <Plus className="size-4" aria-hidden="true" />
            Add
          </Button>
        ) : null}
      </div>
      <div className="space-y-3">
        {sorted.map(encounter => {
          const status = encounter.status ?? 'finalized'
          return (
            <button
              key={encounter._id}
              type="button"
              onClick={() => onViewEncounter?.(encounter._id)}
              className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {ENCOUNTER_TYPE_LABELS[encounter.encounterType] ?? encounter.encounterType}
                </p>
                <div className="flex items-center gap-2">
                  <Badge tone={status === 'draft' ? 'warn' : 'good'}>
                    {status === 'draft' ? 'Draft' : 'Finalized'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{encounter.datetime}</span>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {encounter.clinicalSummary || encounter.notes || 'No summary yet'}
              </p>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
