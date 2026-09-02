'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { User, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { TextField, PhoneField, SwitchField } from '@/components/forms'
import { api } from '@/convex/_generated/api'
import {
  DEFAULT_ACCESSIBILITY_PREFERENCES,
  DEFAULT_COMMUNICATION_PREFERENCES,
  DEFAULT_QUIET_HOURS,
  WEARABLE_SYNC_COPY,
} from '@/lib/reminderPreferences'
import { isE2ETestMode } from '@/lib/e2e'
import { CaregiverAccessSection } from '@/components/patient/caregiver-access-section'

function PatientProfileFormDemo() {
  const [profileForm, setProfileForm] = useState({
    name: 'Maya Chen',
    email: 'maya@example.com',
    phone: '(415) 555-0192',
    smsReminders: true,
    largeText: false,
    timeZone: 'America/New_York',
    quietHoursStart: DEFAULT_QUIET_HOURS.start,
    quietHoursEnd: DEFAULT_QUIET_HOURS.end,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account & privacy"
        title="Your profile"
        description="Manage recovery preferences, connected data, and caregiver access."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="border-b border-border pb-3 text-lg font-semibold text-foreground">
            Personal & Contact Info
          </h2>
          <TextField label="Full Name" value={profileForm.name} onChange={() => undefined} icon={User} />
          <TextField label="Email Address" type="email" value={profileForm.email} onChange={() => undefined} icon={Mail} />
          <PhoneField label="Mobile Phone" value={profileForm.phone} onChange={() => undefined} />
          <TextField label="Time zone" value={profileForm.timeZone} onChange={() => undefined} />
        </Card>
        <Card className="space-y-4 p-6">
          <h2 className="border-b border-border pb-3 text-lg font-semibold text-foreground">
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
            checked={profileForm.largeText}
            onChange={e => setProfileForm({ ...profileForm, largeText: e.target.checked })}
          />
          <SwitchField
            inline
            label={WEARABLE_SYNC_COPY.label}
            sublabel={WEARABLE_SYNC_COPY.sublabel}
            checked={false}
            onChange={() => undefined}
            disabled
          />
        </Card>
      </div>
    </div>
  )
}

function PatientProfileFormLive() {
  const me = useQuery(api.users.getMe, {})
  const patient = useQuery(api.patients.getMePatient, {})
  const preferences = useQuery(
    api.profilePreferences.getForPatient,
    patient?._id ? { patientId: patient._id } : 'skip'
  )
  const updatePreferences = useMutation(api.profilePreferences.updateForPatient)

  const [profileForm, setProfileForm] = useState<{
    name: string
    email: string
    phone: string
    smsReminders: boolean
    emailReminders: boolean
    weeklySummary: boolean
    largeText: boolean
    highContrast: boolean
    reducedMotion: boolean
    quietHoursStart: string
    quietHoursEnd: string
    timeZone: string
  }>({
    name: '',
    email: '',
    phone: '',
    smsReminders: DEFAULT_COMMUNICATION_PREFERENCES.smsReminders,
    emailReminders: DEFAULT_COMMUNICATION_PREFERENCES.emailReminders,
    weeklySummary: DEFAULT_COMMUNICATION_PREFERENCES.weeklySummary,
    largeText: DEFAULT_ACCESSIBILITY_PREFERENCES.largeText,
    highContrast: DEFAULT_ACCESSIBILITY_PREFERENCES.highContrast,
    reducedMotion: DEFAULT_ACCESSIBILITY_PREFERENCES.reducedMotion,
    quietHoursStart: DEFAULT_QUIET_HOURS.start,
    quietHoursEnd: DEFAULT_QUIET_HOURS.end,
    timeZone: 'America/New_York',
  })
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (!me || !preferences) return
    setProfileForm(prev => {
      const next = {
        ...prev,
        name: me.name,
        email: me.email,
        phone: me.phone ?? prev.phone,
        smsReminders: preferences.communicationPreferences.smsReminders,
        emailReminders: preferences.communicationPreferences.emailReminders,
        weeklySummary: preferences.communicationPreferences.weeklySummary,
        largeText: preferences.accessibilityPreferences.largeText,
        highContrast: preferences.accessibilityPreferences.highContrast,
        reducedMotion: preferences.accessibilityPreferences.reducedMotion,
        quietHoursStart: preferences.quietHours.start,
        quietHoursEnd: preferences.quietHours.end,
        timeZone: preferences.timeZone ?? prev.timeZone,
      }
      if (
        prev.name === next.name &&
        prev.email === next.email &&
        prev.phone === next.phone &&
        prev.smsReminders === next.smsReminders &&
        prev.emailReminders === next.emailReminders &&
        prev.weeklySummary === next.weeklySummary &&
        prev.largeText === next.largeText &&
        prev.highContrast === next.highContrast &&
        prev.reducedMotion === next.reducedMotion &&
        prev.quietHoursStart === next.quietHoursStart &&
        prev.quietHoursEnd === next.quietHoursEnd &&
        prev.timeZone === next.timeZone
      ) {
        return prev
      }
      return next
    })
  }, [me, preferences])

  const handleSave = async () => {
    if (!patient?._id) return
    setSaveState('saving')
    try {
      await updatePreferences({
        patientId: patient._id,
        timeZone: profileForm.timeZone,
        communicationPreferences: {
          emailReminders: profileForm.emailReminders,
          smsReminders: profileForm.smsReminders,
          weeklySummary: profileForm.weeklySummary,
        },
        accessibilityPreferences: {
          largeText: profileForm.largeText,
          highContrast: profileForm.highContrast,
          reducedMotion: profileForm.reducedMotion,
        },
        quietHours: {
          start: profileForm.quietHoursStart,
          end: profileForm.quietHoursEnd,
        },
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
    }
  }

  const handleRevokeConsent = async () => {
    if (!patient?._id) return
    await updatePreferences({ patientId: patient._id, revokeNotificationConsent: true })
  }

  const handleRestoreConsent = async () => {
    if (!patient?._id) return
    await updatePreferences({ patientId: patient._id, restoreNotificationConsent: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Account & privacy"
        title="Your profile"
        description="Manage recovery preferences, connected data, and caregiver access."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <h2 className="border-b border-border pb-3 text-lg font-semibold text-foreground">
            Personal & Contact Info
          </h2>
          <TextField
            label="Full Name"
            value={profileForm.name}
            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
            icon={User}
            disabled
          />
          <TextField
            label="Email Address"
            type="email"
            value={profileForm.email}
            onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
            icon={Mail}
            disabled
          />
          <PhoneField
            label="Mobile Phone"
            value={profileForm.phone}
            onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
            disabled
          />
          <TextField
            label="Time zone"
            value={profileForm.timeZone}
            onChange={e => setProfileForm({ ...profileForm, timeZone: e.target.value })}
            hint="Used to schedule reminders at appropriate local times."
          />
        </Card>

        <Card className="space-y-4 p-6">
          <h2 className="border-b border-border pb-3 text-lg font-semibold text-foreground">
            Accessibility & Notifications
          </h2>
          <SwitchField
            inline
            label="Email check-in reminders"
            sublabel="Respects quiet hours and consent settings"
            checked={profileForm.emailReminders}
            onChange={e => setProfileForm({ ...profileForm, emailReminders: e.target.checked })}
          />
          <SwitchField
            inline
            label="Daily SMS check-in reminders"
            sublabel="Optional — can be changed anytime"
            checked={profileForm.smsReminders}
            onChange={e => setProfileForm({ ...profileForm, smsReminders: e.target.checked })}
          />
          <SwitchField
            inline
            label="Weekly recovery summary"
            checked={profileForm.weeklySummary}
            onChange={e => setProfileForm({ ...profileForm, weeklySummary: e.target.checked })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Quiet hours start"
              value={profileForm.quietHoursStart}
              onChange={e => setProfileForm({ ...profileForm, quietHoursStart: e.target.value })}
              hint="HH:MM (24h)"
            />
            <TextField
              label="Quiet hours end"
              value={profileForm.quietHoursEnd}
              onChange={e => setProfileForm({ ...profileForm, quietHoursEnd: e.target.value })}
              hint="HH:MM (24h)"
            />
          </div>
          <SwitchField
            inline
            label="High contrast / large text mode"
            sublabel="Increase typography sizing throughout the app"
            checked={profileForm.largeText}
            onChange={e => setProfileForm({ ...profileForm, largeText: e.target.checked })}
          />
          <SwitchField
            inline
            label="Reduce motion"
            checked={profileForm.reducedMotion}
            onChange={e => setProfileForm({ ...profileForm, reducedMotion: e.target.checked })}
          />
          <SwitchField
            inline
            label={WEARABLE_SYNC_COPY.label}
            sublabel={WEARABLE_SYNC_COPY.sublabel}
            checked={false}
            onChange={() => undefined}
            disabled
          />

          {preferences?.notificationConsentRevokedAt && (
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              Notification consent was revoked. Reminders will not be delivered until restored.
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveState === 'saving' || !patient?._id}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save preferences'}
            </button>
            {preferences?.notificationConsentRevokedAt ? (
              <button
                type="button"
                onClick={() => void handleRestoreConsent()}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Restore notification consent
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleRevokeConsent()}
                className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Revoke notification consent
              </button>
            )}
          </div>
          {saveState === 'error' && (
            <p className="text-sm text-destructive">Could not save preferences. Please try again.</p>
          )}
        </Card>
      </div>

      {patient?._id && <CaregiverAccessSection patientId={patient._id} />}
    </div>
  )
}

export function PatientProfileForm() {
  if (isE2ETestMode) {
    return <PatientProfileFormDemo />
  }
  return <PatientProfileFormLive />
}
