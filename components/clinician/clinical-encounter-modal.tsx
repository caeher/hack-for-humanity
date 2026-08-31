'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  ToggleField,
  ComboboxField,
  DatetimeField,
  TextareaField,
  UploadField,
} from '@/components/forms'

export interface ClinicalEncounterModalProps {
  open?: boolean
  patientId?: string
  patientName?: string
  onClose: () => void
  onSaved?: () => void
}

export function ClinicalEncounterModal({
  open = true,
  patientId = 'P-1042',
  patientName = 'Maya Chen',
  onClose,
  onSaved,
}: ClinicalEncounterModalProps) {
  const [form, setForm] = useState({
    encounterType: 'in-person',
    diagnosis: 'acl',
    datetime: '2026-08-31 09:30',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Clinical encounter saved for ${patientName} (${patientId})!`)
    onSaved?.()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Clinical Encounter</DialogTitle>
          <DialogDescription>
            Document visit notes, diagnostics, and patient instructions for {patientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ToggleField
            label="Encounter Type"
            options={[
              { label: 'In-Person', value: 'in-person' },
              { label: 'Telehealth', value: 'telehealth' },
              { label: 'Chart Review', value: 'chart' },
            ]}
            value={form.encounterType}
            onValueChange={v => setForm({ ...form, encounterType: v })}
          />

          <ComboboxField
            label="Primary Diagnosis / Protocol"
            value={form.diagnosis}
            onChange={e => setForm({ ...form, diagnosis: e.target.value })}
            options={[
              { label: 'ACL Reconstruction Protocol', value: 'acl' },
              { label: 'Total Knee Replacement', value: 'knee' },
              { label: 'Rotator Cuff Tendon Repair', value: 'rotator' },
              { label: 'Lumbar Decompression', value: 'spine' },
            ]}
          />

          <DatetimeField
            label="Encounter Date & Time"
            value={form.datetime}
            onChange={e => setForm({ ...form, datetime: e.target.value })}
          />

          <TextareaField
            label="Clinical Findings & Next Steps"
            placeholder="Document ROM measurements, wound healing, exercise adherence..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            autoResize
            showCount
            maxLength={400}
          />

          <UploadField
            label="Attach Medical Imaging / Documentation"
            maxFiles={2}
            maxSizeMB={10}
            accept=".pdf,.png,.jpg"
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Encounter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

