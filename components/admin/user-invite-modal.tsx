'use client'

import React, { useState } from 'react'
import { User, Mail } from 'lucide-react'
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
  TextField,
  SelectField,
  CalendarField,
  PhoneField,
  SwitchField,
} from '@/components/forms'

export interface UserInviteModalProps {
  title?: string
  open?: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function UserInviteModal({
  title = 'Enroll / Invite User',
  open = true,
  onClose,
  onSuccess,
}: UserInviteModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'patient',
    birthDate: '',
    phone: '',
    newsletter: true,
  })

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`User ${formData.fullName || 'New User'} registered successfully!`)
    onSuccess?.()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Register and provision user access tokens
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <CalendarField
              label="Date of Birth"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
            />

            <PhoneField
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <SwitchField
            inline
            label="Subscribe to weekly recovery notifications"
            name="newsletter"
            checked={formData.newsletter}
            onChange={handleChange}
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
              Complete Registration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

