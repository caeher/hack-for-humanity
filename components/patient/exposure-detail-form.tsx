'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  NumberField,
  ProgressField,
  RadioGroupField,
  SelectField,
  TextareaField,
  TimeField,
} from '@/components/forms'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
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
import { getLocalDateString } from '@/lib/checkInHistory'

export interface ExposureDetailFormProps {
  patientId: Id<'patients'>
  episodeId?: Id<'recoveryEpisodes'>
  checkInId?: Id<'checkIns'>
  date?: string
  initialEntry?: ExposureEntryInput
  entryId?: Id<'exposureEntries'>
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

function createEmptyEntry(): ExposureEntryInput {
  return {
    domain: 'screen',
    activityType: 'phone',
    durationMinutes: 30,
    symptomsWorsened: 'not_sure',
  }
}

export function ExposureDetailForm({
  patientId,
  episodeId,
  checkInId,
  date,
  initialEntry,
  entryId,
  open,
  onOpenChange,
  onSaved,
}: ExposureDetailFormProps) {
  const [entry, setEntry] = useState<ExposureEntryInput>(initialEntry ?? createEmptyEntry())
  const [serverError, setServerError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const logEntry = useMutation(api.exposureEntries.logEntry)
  const updateEntry = useMutation(api.exposureEntries.updateEntry)

  useEffect(() => {
    if (open) {
      setEntry(initialEntry ?? createEmptyEntry())
      setServerError(null)
      setWarnings([])
    }
  }, [open, initialEntry])

  const isSleep = entry.domain === 'sleep'
  const activityOptions = useMemo(
    () =>
      EXPOSURE_ACTIVITY_TYPES[entry.domain].map(type => ({
        value: type,
        label: EXPOSURE_ACTIVITY_LABELS[type] ?? type,
      })),
    [entry.domain]
  )

  const domainOptions = EXPOSURE_DOMAINS.map(domain => ({
    value: domain,
    label: EXPOSURE_DOMAIN_LABELS[domain],
  }))

  const clientValidation = validateExposureEntry(entry)

  const handleDomainChange = (domain: ExposureDomain) => {
    const defaultActivity = EXPOSURE_ACTIVITY_TYPES[domain][0]
    setEntry({
      domain,
      activityType: defaultActivity,
      symptomsWorsened: domain === 'sleep' ? 'not_applicable' : 'not_sure',
      durationMinutes: domain === 'sleep' ? undefined : 30,
      sleepHours: domain === 'sleep' ? 7 : undefined,
      intensity: undefined,
      sleepQuality: undefined,
      startTime: undefined,
      endTime: undefined,
      symptomOnsetMinutes: undefined,
      symptomMagnitude: undefined,
      symptomRecoveryMinutes: undefined,
      contextNote: undefined,
    })
  }

  const handleSave = async () => {
    if (!clientValidation.valid) return

    setIsSaving(true)
    setServerError(null)
    setWarnings([])

    try {
      const targetDate = date ?? getLocalDateString()
      const result = entryId
        ? await updateEntry({ patientId, entryId, entry })
        : await logEntry({
            patientId,
            episodeId,
            checkInId,
            date: targetDate,
            entry,
          })

      const warningMessages = result.warnings.map((w: { message: string }) => w.message)
      setWarnings(warningMessages)
      onSaved?.()
      if (warningMessages.length === 0) {
        onOpenChange(false)
      }
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Could not save exposure entry.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entryId ? 'Edit exposure entry' : 'Log exposure'}</DialogTitle>
          <DialogDescription>
            Record activity, cognitive load, screen time, work/school, or sleep. This data supports
            longitudinal pattern review — not treatment decisions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SelectField
            label="Category"
            value={entry.domain}
            onChange={e => handleDomainChange(e.target.value as ExposureDomain)}
            options={domainOptions}
          />

          <SelectField
            label="Activity type"
            value={entry.activityType}
            onChange={e => setEntry({ ...entry, activityType: e.target.value })}
            options={activityOptions}
          />

          {isSleep ? (
            <>
              <NumberField
                label="Sleep duration (hours)"
                value={entry.sleepHours}
                onChange={e => setEntry({ ...entry, sleepHours: e.target.value })}
                min={0.25}
                max={24}
                step={0.25}
                unit="hrs"
                hint="Self-reported duration — separate from sleep difficulty symptom ratings."
              />
              <ProgressField
                label="Sleep quality (optional)"
                min={0}
                max={10}
                step={1}
                value={entry.sleepQuality ?? 0}
                onChange={e => setEntry({ ...entry, sleepQuality: Number(e.target.value) })}
                minLabel="Poor"
                maxLabel="Restful"
              />
            </>
          ) : (
            <>
              <NumberField
                label="Duration (minutes)"
                value={entry.durationMinutes}
                onChange={e => setEntry({ ...entry, durationMinutes: e.target.value })}
                min={1}
                max={1440}
                step={5}
                unit="min"
                required
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <TimeField
                  label="Start time (optional)"
                  value={entry.startTime ?? ''}
                  onChange={e => setEntry({ ...entry, startTime: e.target.value })}
                  format24h
                />
                <TimeField
                  label="End time (optional)"
                  value={entry.endTime ?? ''}
                  onChange={e => setEntry({ ...entry, endTime: e.target.value })}
                  format24h
                />
              </div>

              <ProgressField
                label="Perceived intensity (optional)"
                min={0}
                max={10}
                step={1}
                value={entry.intensity ?? 0}
                onChange={e => setEntry({ ...entry, intensity: Number(e.target.value) })}
                minLabel="Light"
                maxLabel="Hard"
              />
            </>
          )}

          {!isSleep && (
            <>
              <RadioGroupField
                label="Did symptoms worsen?"
                layout="segmented"
                value={entry.symptomsWorsened}
                onChange={e =>
                  setEntry({
                    ...entry,
                    symptomsWorsened: e.target.value as SymptomsWorsened,
                  })
                }
                options={SYMPTOMS_WORSENED_OPTIONS.filter(o => o.value !== 'not_applicable').map(
                  o => ({ label: o.label, value: o.value })
                )}
              />

              {entry.symptomsWorsened === 'yes' && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
                  <NumberField
                    label="Onset after activity (minutes, optional)"
                    value={entry.symptomOnsetMinutes}
                    onChange={e =>
                      setEntry({ ...entry, symptomOnsetMinutes: e.target.value })
                    }
                    min={0}
                    max={1440}
                    step={5}
                    unit="min"
                  />
                  <ProgressField
                    label="How much worse? (0–6, optional)"
                    min={0}
                    max={6}
                    step={1}
                    value={entry.symptomMagnitude ?? 0}
                    onChange={e =>
                      setEntry({ ...entry, symptomMagnitude: Number(e.target.value) })
                    }
                    minLabel="No change"
                    maxLabel="Much worse"
                  />
                  <NumberField
                    label="Recovery duration (minutes, if known)"
                    value={entry.symptomRecoveryMinutes}
                    onChange={e =>
                      setEntry({ ...entry, symptomRecoveryMinutes: e.target.value })
                    }
                    min={0}
                    max={1440}
                    step={5}
                    unit="min"
                    hint="How long until symptoms returned to prior level."
                  />
                </div>
              )}
            </>
          )}

          <TextareaField
            label="Optional context"
            value={entry.contextNote ?? ''}
            onChange={e => setEntry({ ...entry, contextNote: e.target.value })}
            maxLength={EXPOSURE_NOTE_MAX_LENGTH}
            showCount
            hint={EXPOSURE_NOTE_PRIVACY_HINT}
            autoResize
          />

          {clientValidation.errors.length > 0 && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-3" role="alert">
              <ul className="list-inside list-disc text-sm text-foreground">
                {clientValidation.errors.map(err => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {clientValidation.warnings.map(w => (
            <p key={w.code} className="text-xs text-warning" role="status">
              {w.message}
            </p>
          ))}

          {warnings.length > 0 && (
            <div className="rounded-lg border border-warning bg-warning/5 p-3" role="status">
              {warnings.map(msg => (
                <p key={msg} className="text-sm text-foreground">
                  {msg}
                </p>
              ))}
            </div>
          )}

          {serverError && (
            <div className="rounded-lg border border-destructive bg-destructive/5 p-3" role="alert">
              <p className="text-sm text-foreground">{serverError}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !clientValidation.valid}
          >
            {isSaving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {isSaving ? 'Saving...' : 'Save entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
