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
import { TextField } from '@/components/forms'

export interface ConfirmActionDialogProps {
  open: boolean
  title: string
  description: string
  impactSummary: string
  confirmLabel: string
  confirmationEmail?: string
  onClose: () => void
  onConfirm: () => Promise<void> | void
  destructive?: boolean
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  impactSummary,
  confirmLabel,
  confirmationEmail,
  onClose,
  onConfirm,
  destructive = false,
}: ConfirmActionDialogProps) {
  const [typedEmail, setTypedEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requiresEmail = Boolean(confirmationEmail)
  const emailMatches =
    !requiresEmail ||
    typedEmail.trim().toLowerCase() === confirmationEmail!.trim().toLowerCase()

  const handleConfirm = async () => {
    if (!emailMatches) {
      setError('Confirmation email does not match.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      setTypedEmail('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) {
          setTypedEmail('')
          setError(null)
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Impact</p>
          <p>{impactSummary}</p>
        </div>

        {requiresEmail && (
          <TextField
            label="Type the user's email to confirm"
            value={typedEmail}
            onChange={e => setTypedEmail(e.target.value)}
            placeholder={confirmationEmail}
            hint="Step-up confirmation required for this action"
          />
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={() => void handleConfirm()}
            disabled={submitting || !emailMatches}
          >
            {submitting ? 'Processing…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
