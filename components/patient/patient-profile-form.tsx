'use client'

import React, { useState } from 'react'
import { User, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { TextField, PhoneField, ColorPickerField, SwitchField } from '@/components/forms'

export function PatientProfileForm() {
  const [profileForm, setProfileForm] = useState({
    name: 'Maya Chen',
    email: 'maya@example.com',
    phone: '(415) 555-0192',
    color: '#f9a600',
    smsReminders: true,
    largeText: false,
    wearables: false,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account & privacy"
        title="Your profile"
        description="Manage recovery preferences, connected data, and caregiver access."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg text-foreground border-b border-border pb-3">
            Personal & Contact Info
          </h2>
          <TextField
            label="Full Name"
            value={profileForm.name}
            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
            icon={User}
          />
          <TextField
            label="Email Address"
            type="email"
            value={profileForm.email}
            onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
            icon={Mail}
          />
          <PhoneField
            label="Mobile Phone"
            value={profileForm.phone}
            onChange={e => setProfileForm({ ...profileForm, phone: (e.target as any).value })}
          />
          <ColorPickerField
            label="Profile Theme Tint"
            value={profileForm.color}
            onChange={e => setProfileForm({ ...profileForm, color: e.target.value })}
          />
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-lg text-foreground border-b border-border pb-3">
            Accessibility & Notifications
          </h2>
          <SwitchField
            inline
            label="Daily SMS Check-in Reminders"
            sublabel="Sent at 8:00 AM every morning"
            checked={profileForm.smsReminders}
            onChange={e => setProfileForm({ ...profileForm, smsReminders: e.target.checked })}
          />
          <SwitchField
            inline
            label="High Contrast / Large Text Mode"
            sublabel="Increase typography sizing throughout the app"
            checked={profileForm.largeText}
            onChange={e => setProfileForm({ ...profileForm, largeText: e.target.checked })}
          />
          <SwitchField
            inline
            label="Wearable data sync (planned)"
            sublabel="Not connected in this prototype. No device data is being collected."
            checked={profileForm.wearables}
            onChange={e => setProfileForm({ ...profileForm, wearables: e.target.checked })}
            disabled
          />

          <div className="pt-4 border-t border-border">
            <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              Save Preferences
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
