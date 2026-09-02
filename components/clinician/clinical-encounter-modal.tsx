'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ToggleField,
  ComboboxField,
  DatetimeField,
  TextareaField,
  TextField,
} from '@/components/forms'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { DataSourceBadge } from './data-source-badge'
import { cn } from '@/lib/utils'

const DIAGNOSIS_OPTIONS = [
  { label: 'Clinician-diagnosed concussion', value: 'diagnosed-concussion' },
  { label: 'Suspected concussion', value: 'suspected-concussion' },
  { label: 'Head injury under evaluation', value: 'head-injury-review' },
  { label: 'Persistent symptoms follow-up', value: 'persistent-symptoms' },
]

const ENCOUNTER_TYPE_OPTIONS = [
  { label: 'In-person', value: 'in-person' },
  { label: 'Telehealth', value: 'telehealth' },
  { label: 'Asynchronous review', value: 'asynchronous' },
]

export interface ClinicalEncounterModalProps {
  open?: boolean
  patientId: Id<'patients'>
  patientName: string
  encounterId?: Id<'clinicalEncounters'>
  mode?: 'create' | 'view' | 'amend'
  onClose: () => void
  onSaved?: () => void
}

function formatNowForDatetime(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function ClinicalEncounterModal({
  open = true,
  patientId,
  patientName,
  encounterId,
  mode = 'create',
  onClose,
  onSaved,
}: ClinicalEncounterModalProps) {
  const saveDraft = useMutation(api.encounters.saveDraft)
  const finalizeEncounter = useMutation(api.encounters.finalizeEncounter)
  const amendEncounter = useMutation(api.encounters.amendEncounter)
  const registerAttachment = useMutation(api.encounters.registerAttachmentMetadata)

  const encounterDetail = useQuery(
    api.encounters.getById,
    encounterId ? { encounterId } : 'skip'
  )
  const attachmentPolicy = useQuery(api.encounters.getAttachmentPolicy, {})

  const [form, setForm] = useState({
    encounterType: 'in-person',
    diagnosis: 'diagnosed-concussion',
    datetime: formatNowForDatetime(),
    clinicalSummary: '',
    notes: '',
    amendmentReason: '',
  })
  const [draftId, setDraftId] = useState<Id<'clinicalEncounters'> | null>(encounterId ?? null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [amending, setAmending] = useState(mode === 'amend')
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isFinalized = encounterDetail?.encounter
    ? (encounterDetail.encounter.status ?? 'finalized') === 'finalized'
    : false
  const isAmendMode = mode === 'amend' || amending
  const isReadOnly = mode === 'view' && isFinalized && !amending
  const canEdit = mode === 'create' || (encounterDetail && !isFinalized)

  useEffect(() => {
    if (!encounterDetail) return
    const latestAmendment = encounterDetail.amendments[0]
    const summary = latestAmendment?.clinicalSummary ?? encounterDetail.encounter.clinicalSummary
    const notes = latestAmendment?.notes ?? encounterDetail.encounter.notes
    setForm(prev => ({
      ...prev,
      encounterType: encounterDetail.encounter.encounterType,
      diagnosis: encounterDetail.encounter.diagnosis,
      datetime: encounterDetail.encounter.datetime,
      clinicalSummary: summary,
      notes,
    }))
    setDraftId(encounterDetail.encounter._id)
  }, [encounterDetail])

  const persistDraft = useCallback(async () => {
    if (!canEdit || isAmendMode) return
    setSaveState('saving')
    setSaveError(null)
    try {
      const id = await saveDraft({
        patientId,
        encounterId: draftId ?? undefined,
        encounterType: form.encounterType as 'in-person' | 'telehealth' | 'asynchronous',
        diagnosis: form.diagnosis,
        datetime: form.datetime,
        clinicalSummary: form.clinicalSummary,
        notes: form.notes,
      })
      setDraftId(id)

      for (const file of pendingFiles) {
        await registerAttachment({
          patientId,
          encounterId: id,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        })
      }
      setPendingFiles([])
      setSaveState('saved')
    } catch (error) {
      setSaveState('error')
      setSaveError(error instanceof Error ? error.message : 'Failed to save draft.')
    }
  }, [
    canEdit,
    isAmendMode,
    saveDraft,
    patientId,
    draftId,
    form,
    pendingFiles,
    registerAttachment,
  ])

  useEffect(() => {
    if (!canEdit || isAmendMode) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      void persistDraft()
    }, 1500)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [form, canEdit, isAmendMode, persistDraft])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setPendingFiles(prev => [...prev, ...files])
  }

  const handleFinalize = async () => {
    if (!draftId) return
    setIsSubmitting(true)
    setSaveError(null)
    try {
      await persistDraft()
      await finalizeEncounter({ encounterId: draftId, confirmFinalization: true })
      onSaved?.()
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to finalize encounter.')
    } finally {
      setIsSubmitting(false)
      setShowFinalizeConfirm(false)
    }
  }

  const handleAmend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!encounterId) return
    setIsSubmitting(true)
    setSaveError(null)
    try {
      await amendEncounter({
        encounterId,
        reason: form.amendmentReason,
        clinicalSummary: form.clinicalSummary,
        notes: form.notes,
      })
      onSaved?.()
      onClose()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to submit amendment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title =
    mode === 'amend'
      ? 'Amend clinical encounter'
      : isFinalized
        ? 'Clinical encounter record'
        : 'Document clinical encounter'

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
            <DataSourceBadge kind="clinician_authored" />
          </div>
          <DialogDescription>
            {isAmendMode
              ? `Submit an audited amendment for ${patientName}. The original finalized record remains immutable.`
              : `Document visit notes, diagnostics, and follow-up context for ${patientName}.`}
          </DialogDescription>
        </DialogHeader>

        {encounterDetail === undefined && encounterId ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading encounter…
          </div>
        ) : (
          <form
            onSubmit={isAmendMode ? handleAmend : event => event.preventDefault()}
            className="space-y-4"
          >
            {isFinalized && !isAmendMode ? (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <p>
                  This encounter is finalized and cannot be silently edited. Use &quot;Submit
                  amendment&quot; to record an audited correction.
                </p>
              </div>
            ) : null}

            {!isAmendMode ? (
              <>
                <ToggleField
                  label="Encounter type"
                  options={ENCOUNTER_TYPE_OPTIONS}
                  value={form.encounterType}
                  onValueChange={v => setForm({ ...form, encounterType: v })}
                  disabled={isReadOnly}
                />

                <ComboboxField
                  label="Reported status / review context"
                  value={form.diagnosis}
                  onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                  options={DIAGNOSIS_OPTIONS}
                  disabled={isReadOnly}
                />

                <DatetimeField
                  label="Encounter date & time"
                  value={form.datetime}
                  onChange={e => setForm({ ...form, datetime: e.target.value })}
                  disabled={isReadOnly}
                />
              </>
            ) : null}

            <TextareaField
              label="Clinical summary"
              hint="Brief encounter overview for the care team"
              placeholder="Summarize the encounter focus and key findings…"
              value={form.clinicalSummary}
              onChange={e => setForm({ ...form, clinicalSummary: e.target.value })}
              autoResize
              showCount
              maxLength={500}
              disabled={isReadOnly}
            />

            <TextareaField
              label="Clinical notes"
              hint="Detailed findings, instructions, and follow-up plan"
              placeholder="Document examination findings, patient-reported changes, and next steps…"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              autoResize
              showCount
              maxLength={5000}
              disabled={isReadOnly}
            />

            {isAmendMode ? (
              <TextField
                label="Amendment reason"
                hint="Required for audit trail (minimum 5 characters)"
                value={form.amendmentReason}
                onChange={e => setForm({ ...form, amendmentReason: e.target.value })}
                required
              />
            ) : null}

            {canEdit && attachmentPolicy ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Attach documentation
                </label>
                <p className="text-xs text-muted-foreground">
                  {attachmentPolicy.malwareScanPlan} Max{' '}
                  {attachmentPolicy.maxSizeBytes / (1024 * 1024)} MB. Allowed:{' '}
                  {attachmentPolicy.allowedExtensions.join(', ')}. No public URLs are exposed.
                </p>
                <input
                  type="file"
                  accept={attachmentPolicy.allowedExtensions.join(',')}
                  multiple
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
                {pendingFiles.length > 0 ? (
                  <ul className="text-xs text-muted-foreground">
                    {pendingFiles.map(file => (
                      <li key={file.name}>
                        {file.name} ({Math.round(file.size / 1024)} KB) — pending scan
                      </li>
                    ))}
                  </ul>
                ) : null}
                {encounterDetail?.attachments.map(att => (
                  <div
                    key={att._id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <Badge tone="neutral">{att.scanStatus}</Badge>
                    {att.fileName} ({Math.round(att.sizeBytes / 1024)} KB)
                  </div>
                ))}
              </div>
            ) : null}

            {encounterDetail?.amendments.length ? (
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amendment history
                </p>
                <ul className="mt-2 space-y-2">
                  {encounterDetail.amendments.map(amendment => (
                    <li key={amendment._id} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{amendment.reason}</span>
                      <span className="ml-2">
                        {new Date(amendment.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {saveError ? (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            ) : null}

            {canEdit && !isAmendMode ? (
              <p
                className={cn(
                  'text-xs',
                  saveState === 'error' ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                {saveState === 'saving'
                  ? 'Saving draft…'
                  : saveState === 'saved'
                    ? 'Draft saved'
                    : 'Changes autosave while you type'}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={onClose}>
                {isReadOnly ? 'Close' : 'Cancel'}
              </Button>
              {isAmendMode ? (
                <Button type="submit" disabled={isSubmitting || form.amendmentReason.length < 5}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Submitting…
                    </>
                  ) : (
                    'Submit amendment'
                  )}
                </Button>
              ) : isFinalized ? (
                <>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  {!amending ? (
                    <Button type="button" onClick={() => setAmending(true)}>
                      Amend record
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  type="button"
                  disabled={isSubmitting || !draftId}
                  onClick={() => setShowFinalizeConfirm(true)}
                >
                  Finalize encounter
                </Button>
              )}
            </DialogFooter>
          </form>
        )}

        {showFinalizeConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
            <CardConfirm
              onCancel={() => setShowFinalizeConfirm(false)}
              onConfirm={() => void handleFinalize()}
              isSubmitting={isSubmitting}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CardConfirm({
  onCancel,
  onConfirm,
  isSubmitting,
}: {
  onCancel: () => void
  onConfirm: () => void
  isSubmitting: boolean
}) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-foreground">Finalize this encounter?</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Finalized encounters become immutable. Future corrections require an audited amendment with
        a documented reason.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Keep editing
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Finalizing…' : 'Yes, finalize'}
        </Button>
      </div>
    </div>
  )
}
