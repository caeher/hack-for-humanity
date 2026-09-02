'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Brain, Briefcase, Dumbbell, Loader2, Monitor, Moon, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { getLocalDateString } from '@/lib/checkInHistory'
import {
  EXPOSURE_ACTIVITY_LABELS,
  EXPOSURE_DOMAIN_LABELS,
  formatDurationMinutes,
  formatSleepHours,
  type ExposureDomain,
  type ExposureEntryInput,
} from '@/lib/exposureTracking'
import { ExposureDetailForm } from './exposure-detail-form'
import { isE2ETestMode } from '@/lib/e2e'

const DOMAIN_ICONS: Record<ExposureDomain, React.ComponentType<{ className?: string }>> = {
  physical: Dumbbell,
  cognitive: Brain,
  work_school: Briefcase,
  screen: Monitor,
  sleep: Moon,
}

export interface ExposureEntryListProps {
  patientId?: Id<'patients'>
  date?: string
  className?: string
}

function DemoExposureList() {
  const demoEntries = [
    { domain: 'screen' as const, activityType: 'computer', duration: 90, worsened: 'no' },
    { domain: 'sleep' as const, activityType: 'night_sleep', sleepHours: 6.5, worsened: 'not_applicable' },
    { domain: 'physical' as const, activityType: 'light_walking', duration: 20, worsened: 'not_sure' },
  ]

  return (
    <Card className={cn('p-6')}>
      <h2 className="font-semibold text-foreground">Today&apos;s exposures</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Demo data — sign in to log and compare physical, cognitive, and screen exposure.
      </p>
      <ul className="mt-4 space-y-3">
        {demoEntries.map((entry, i) => {
          const Icon = DOMAIN_ICONS[entry.domain]
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {EXPOSURE_DOMAIN_LABELS[entry.domain]} ·{' '}
                  {EXPOSURE_ACTIVITY_LABELS[entry.activityType]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.domain === 'sleep'
                    ? formatSleepHours(entry.sleepHours!)
                    : formatDurationMinutes(entry.duration!)}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function ExposureEntryList({ patientId, date, className }: ExposureEntryListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<
    | {
        entryId: Id<'exposureEntries'>
        initialEntry: ExposureEntryInput
      }
    | undefined
  >()
  const targetDate = date ?? getLocalDateString()

  if (isE2ETestMode) {
    return <DemoExposureList />
  }

  return (
    <ExposureEntryListLive
      patientId={patientId}
      date={targetDate}
      className={className}
      formOpen={formOpen}
      setFormOpen={setFormOpen}
      editingEntry={editingEntry}
      setEditingEntry={setEditingEntry}
    />
  )
}

function ExposureEntryListLive({
  patientId: patientIdProp,
  date,
  className,
  formOpen,
  setFormOpen,
  editingEntry,
  setEditingEntry,
}: ExposureEntryListProps & {
  formOpen: boolean
  setFormOpen: (open: boolean) => void
  editingEntry:
    | {
        entryId: Id<'exposureEntries'>
        initialEntry: ExposureEntryInput
      }
    | undefined
  setEditingEntry: (
    entry:
      | {
          entryId: Id<'exposureEntries'>
          initialEntry: ExposureEntryInput
        }
      | undefined
  ) => void
}) {
  const mePatient = useQuery(api.patients.getMePatient, patientIdProp ? 'skip' : {})
  const patientId = patientIdProp ?? mePatient?._id

  const entries = useQuery(
    api.exposureEntries.listByPatient,
    patientId ? { patientId, date, limit: 20 } : 'skip'
  )
  const deleteEntry = useMutation(api.exposureEntries.deleteEntry)

  if (!patientId) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to log and review activity, screen, cognitive, and sleep exposures.
          </p>
        </div>
      </Card>
    )
  }

  if (entries === undefined) {
    return (
      <Card className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading exposures" />
      </Card>
    )
  }

  const handleDelete = async (entryId: Id<'exposureEntries'>) => {
    if (!patientId) return
    await deleteEntry({ patientId, entryId })
  }

  return (
    <>
      <Card className={cn('p-6', className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground">Exposure log</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Physical, cognitive, screen, work/school, and sleep entries for {date}.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingEntry(undefined)
              setFormOpen(true)
            }}
            className="min-h-11"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add entry
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No exposures logged for this date. Add an entry or log during your daily check-in.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map(entry => {
              const Icon = DOMAIN_ICONS[entry.domain]
              const durationLabel =
                entry.domain === 'sleep' && entry.sleepHours !== undefined
                  ? formatSleepHours(entry.sleepHours)
                  : entry.durationMinutes
                    ? formatDurationMinutes(entry.durationMinutes)
                    : 'Duration not recorded'

              return (
                <li
                  key={entry._id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {EXPOSURE_DOMAIN_LABELS[entry.domain]} ·{' '}
                        {EXPOSURE_ACTIVITY_LABELS[entry.activityType] ?? entry.activityType}
                      </p>
                      {entry.symptomsWorsened === 'yes' && (
                        <Badge variant="outline" className="text-warning">
                          Symptoms worsened
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {durationLabel}
                      {entry.startTime && entry.endTime
                        ? ` · ${entry.startTime}–${entry.endTime}`
                        : ''}
                      {entry.intensity !== undefined ? ` · Intensity ${entry.intensity}/10` : ''}
                      {entry.sleepQuality !== undefined
                        ? ` · Quality ${entry.sleepQuality}/10`
                        : ''}
                    </p>
                    {entry.symptomsWorsened === 'yes' && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.symptomOnsetMinutes !== undefined
                          ? `Onset ${entry.symptomOnsetMinutes} min after`
                          : 'Onset not recorded'}
                        {entry.symptomMagnitude !== undefined
                          ? ` · Magnitude ${entry.symptomMagnitude}/6`
                          : ''}
                        {entry.symptomRecoveryMinutes !== undefined
                          ? ` · Recovered in ${entry.symptomRecoveryMinutes} min`
                          : ''}
                      </p>
                    )}
                    {entry.contextNote && (
                      <p className="mt-1 text-xs italic text-muted-foreground">
                        {entry.contextNote}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingEntry({
                          entryId: entry._id,
                          initialEntry: {
                            domain: entry.domain,
                            activityType: entry.activityType,
                            durationMinutes: entry.durationMinutes,
                            intensity: entry.intensity,
                            startTime: entry.startTime,
                            endTime: entry.endTime,
                            symptomsWorsened: entry.symptomsWorsened,
                            symptomOnsetMinutes: entry.symptomOnsetMinutes,
                            symptomMagnitude: entry.symptomMagnitude,
                            symptomRecoveryMinutes: entry.symptomRecoveryMinutes,
                            sleepHours: entry.sleepHours,
                            sleepQuality: entry.sleepQuality,
                            contextNote: entry.contextNote,
                          },
                        })
                        setFormOpen(true)
                      }}
                      className="min-h-11 min-w-11"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(entry._id)}
                      className="min-h-11 min-w-11 text-destructive"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <ExposureDetailForm
        patientId={patientId}
        date={date}
        entryId={editingEntry?.entryId}
        initialEntry={editingEntry?.initialEntry}
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open)
          if (!open) setEditingEntry(undefined)
        }}
      />
    </>
  )
}
