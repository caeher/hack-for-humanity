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
    diagnosis: 'diagnosed-concussion',
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
            label="Reported Status / Review Context"
            value={form.diagnosis}
            onChange={e => setForm({ ...form, diagnosis: e.target.value })}
            options={[
              { label: 'Clinician-diagnosed concussion', value: 'diagnosed-concussion' },
              { label: 'Suspected concussion', value: 'suspected-concussion' },
              { label: 'Head injury under evaluation', value: 'head-injury-review' },
              { label: 'Persistent symptoms follow-up', value: 'persistent-symptoms' },
            ]}
          />

          <DatetimeField
            label="Encounter Date & Time"
            value={form.datetime}
            onChange={e => setForm({ ...form, datetime: e.target.value })}
          />

          <TextareaField
            label="Clinical Findings & Next Steps"
            placeholder="Document patient-reported changes, examination findings, and follow-up context..."
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

