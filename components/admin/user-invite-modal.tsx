'use client'

import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { User, Mail } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TextField, SelectField } from '@/components/forms'

export interface UserInviteModalProps {
  orgId?: Id<'organizations'>
  title?: string
  open?: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UserInviteModal({
  orgId,
  title = 'Enroll / Invite User',
  open = true,
  onClose,
  onSuccess,
}: UserInviteModalProps) {
  const inviteOrgUser = useMutation(api.orgProvisioning.inviteUser)
  const inviteLegacyUser = useMutation(api.users.inviteUser)

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'patient',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (orgId) {
        await inviteOrgUser({
          orgId,
          name: formData.fullName,
          email: formData.email,
          role: formData.role as 'patient' | 'caregiver' | 'clinician' | 'admin',
        })
      } else {
        await inviteLegacyUser({
          name: formData.fullName,
          email: formData.email,
          role: formData.role as 'patient' | 'caregiver' | 'clinician' | 'admin',
        })
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Send an organization invitation. Status syncs between Clerk and Convex when configured.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              icon={User}
              hint="As it appears on ID"
              required
            />

            <TextField
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              icon={Mail}
              required
            />
          </div>

          <SelectField
            label="Primary Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={[
              { label: 'Patient', value: 'patient' },
              { label: 'Caregiver', value: 'caregiver' },
              { label: 'Clinician / Specialist', value: 'clinician' },
              { label: 'Administrator', value: 'admin' },
            ]}
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
