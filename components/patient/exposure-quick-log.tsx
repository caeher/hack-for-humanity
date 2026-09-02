'use client'

import React, { useState } from 'react'
import { Brain, Briefcase, Dumbbell, Moon, Monitor, Plus, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { NumberField, ProgressField, RadioGroupField, SelectField, TextareaField } from '@/components/forms'
import { cn } from '@/lib/utils'
import {
  EXPOSURE_ACTIVITY_LABELS,
  EXPOSURE_ACTIVITY_TYPES,
  EXPOSURE_DOMAIN_LABELS,
  EXPOSURE_DOMAINS,
  EXPOSURE_NOTE_MAX_LENGTH,
  EXPOSURE_NOTE_PRIVACY_HINT,
  SYMPTOMS_WORSENED_OPTIONS,
  type ExposureDomain,
  type ExposureEntryInput,
  type SymptomsWorsened,
  validateExposureEntry,
} from '@/lib/exposureTracking'

const DOMAIN_ICONS: Record<ExposureDomain, React.ComponentType<{ className?: string }>> = {
  physical: Dumbbell,
  cognitive: Brain,
  work_school: Briefcase,
  screen: Monitor,
  sleep: Moon,
}

export interface ExposureQuickLogProps {
  value: ExposureEntryInput[]
  onChange: (entries: ExposureEntryInput[]) => void
  className?: string
}

function createDefaultEntry(domain: ExposureDomain): ExposureEntryInput {
  const defaultActivity = EXPOSURE_ACTIVITY_TYPES[domain][0]
  return {
    domain,
    activityType: defaultActivity,
    symptomsWorsened: domain === 'sleep' ? 'not_applicable' : 'not_sure',
    durationMinutes: domain === 'sleep' ? undefined : 30,
    sleepHours: domain === 'sleep' ? 7 : undefined,
  }
}

function QuickEntryCard({
  entry,
  index,
  onUpdate,
  onRemove,
}: {
  entry: ExposureEntryInput
  index: number
  onUpdate: (index: number, entry: ExposureEntryInput) => void
  onRemove: (index: number) => void
}) {
  const validation = validateExposureEntry(entry)
  const isSleep = entry.domain === 'sleep'
  const activityOptions = EXPOSURE_ACTIVITY_TYPES[entry.domain].map(type => ({
    value: type,
    label: EXPOSURE_ACTIVITY_LABELS[type] ?? type,
  }))

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {EXPOSURE_DOMAIN_LABELS[entry.domain]}
        </p>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Remove ${EXPOSURE_DOMAIN_LABELS[entry.domain]} entry`}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <SelectField
          label="Activity type"
          value={entry.activityType}
          onChange={e => onUpdate(index, { ...entry, activityType: e.target.value })}
          options={activityOptions}
        />

        {isSleep ? (
          <>
            <NumberField
              label="Sleep duration (hours)"
              value={entry.sleepHours}
              onChange={e => onUpdate(index, { ...entry, sleepHours: e.target.value })}
              min={0.25}
              max={24}
              step={0.25}
              unit="hrs"
              hint="Self-reported sleep duration — not a symptom score."
            />
            <ProgressField
              label="Sleep quality (optional)"
              min={0}
              max={10}
              step={1}
              value={entry.sleepQuality ?? 0}
              onChange={e =>
                onUpdate(index, { ...entry, sleepQuality: Number(e.target.value) })
              }
              minLabel="Poor"
              maxLabel="Restful"
              hint="How rested you felt — separate from sleep difficulty symptoms."
            />
          </>
        ) : (
          <>
            <NumberField
              label="Duration (minutes)"
              value={entry.durationMinutes}
              onChange={e => onUpdate(index, { ...entry, durationMinutes: e.target.value })}
              min={1}
              max={1440}
              step={5}
              unit="min"
            />
            <ProgressField
              label="Perceived intensity (optional)"
              min={0}
              max={10}
              step={1}
              value={entry.intensity ?? 0}
              onChange={e => onUpdate(index, { ...entry, intensity: Number(e.target.value) })}
              minLabel="Light"
              maxLabel="Hard"
            />
          </>
        )}

        {!isSleep && (
          <RadioGroupField
            label="Did symptoms worsen?"
            layout="segmented"
            value={entry.symptomsWorsened}
            onChange={e =>
              onUpdate(index, {
                ...entry,
                symptomsWorsened: e.target.value as SymptomsWorsened,
              })
            }
            options={SYMPTOMS_WORSENED_OPTIONS.filter(o => o.value !== 'not_applicable').map(
              o => ({ label: o.label, value: o.value })
            )}
          />
        )}

        {validation.warnings.length > 0 && (
          <p className="text-xs text-warning" role="status">
            {validation.warnings[0]?.message}
          </p>
        )}
      </div>
    </div>
  )
}

export function ExposureQuickLog({ value, onChange, className }: ExposureQuickLogProps) {
  const [expanded, setExpanded] = useState(value.length > 0)
  const usedDomains = new Set(value.map(e => e.domain))
  const availableDomains = EXPOSURE_DOMAINS.filter(d => !usedDomains.has(d))

  const addEntry = (domain: ExposureDomain) => {
    onChange([...value, createDefaultEntry(domain)])
    setExpanded(true)
  }

  const updateEntry = (index: number, entry: ExposureEntryInput) => {
    const next = [...value]
    next[index] = entry
    onChange(next)
  }

  const removeEntry = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <Card className={cn('space-y-4 p-4', className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Today&apos;s exposures (optional)</p>
          <p className="text-xs text-muted-foreground">
            Log activity, screen time, cognitive load, or sleep for pattern tracking.
          </p>
        </div>
        <span className="text-xs font-medium text-primary">{expanded ? 'Hide' : 'Add'}</span>
      </button>

      {expanded && (
        <div className="space-y-4">
          {value.length > 0 && (
            <div className="space-y-3">
              {value.map((entry, index) => (
                <QuickEntryCard
                  key={`${entry.domain}-${index}`}
                  entry={entry}
                  index={index}
                  onUpdate={updateEntry}
                  onRemove={removeEntry}
                />
              ))}
            </div>
          )}

          {availableDomains.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Quick add</p>
              <div className="flex flex-wrap gap-2">
                {availableDomains.map(domain => {
                  const Icon = DOMAIN_ICONS[domain]
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => addEntry(domain)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Icon className="size-3.5" aria-hidden="true" />
                      <Plus className="size-3" aria-hidden="true" />
                      {EXPOSURE_DOMAIN_LABELS[domain]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Exposure data is stored separately from symptom scores. Sleep quality here is not a
            symptom rating.
          </p>
        </div>
      )}
    </Card>
  )
}
