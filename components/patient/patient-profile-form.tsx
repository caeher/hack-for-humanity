'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { User, Mail, Download, Trash2, Shield, AlertTriangle } from 'lucide-react'
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
import { useAccessibility } from '@/components/providers'

function PatientProfileFormDemo() {
  const { preferences: a11yPrefs, updatePreferences: updateA11yPrefs } = useAccessibility()
  const [profileForm, setProfileForm] = useState({
    name: 'Maya Chen',
    email: 'maya@example.com',
    phone: '(415) 555-0192',
    smsReminders: true,
    largeText: a11yPrefs.largeText,
    highContrast: a11yPrefs.highContrast,
    reducedMotion: a11yPrefs.reducedMotion,
    timeZone: a11yPrefs.timeZone,
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
          <TextField label="Time zone" value={profileForm.timeZone} onChange={e => {
            setProfileForm({ ...profileForm, timeZone: e.target.value })
            updateA11yPrefs({ timeZone: e.target.value })
          }} />
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
            label="Large text mode"
            sublabel="Increase typography sizing throughout the app"
            checked={profileForm.largeText}
            onChange={e => {
              setProfileForm({ ...profileForm, largeText: e.target.checked })
              updateA11yPrefs({ largeText: e.target.checked })
            }}
          />
          <SwitchField
            inline
            label="High contrast mode"
            sublabel="Enhance text and border contrast ratios"
            checked={profileForm.highContrast}
            onChange={e => {
              setProfileForm({ ...profileForm, highContrast: e.target.checked })
              updateA11yPrefs({ highContrast: e.target.checked })
            }}
          />
          <SwitchField
            inline
            label="Reduce motion"
            sublabel="Suppress non-essential animations and transitions"
            checked={profileForm.reducedMotion}
            onChange={e => {
              setProfileForm({ ...profileForm, reducedMotion: e.target.checked })
              updateA11yPrefs({ reducedMotion: e.target.checked })
            }}
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

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            Recovery Data Privacy & Right to be Forgotten
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            [E2E Demo Shell] Export recovery archives under GDPR/HIPAA or request account erasure.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="rounded-md bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground"
            >
              Download Demo Archive
            </button>
            <button
              type="button"
              className="rounded-md border border-destructive/40 bg-background px-3.5 py-1.5 text-xs font-semibold text-destructive"
            >
              Request Deletion (Demo)
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function PatientProfileFormLive() {
  const { updatePreferences: updateA11yPrefs } = useAccessibility()
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
    if (
      !me ||
      !preferences ||
      !preferences.communicationPreferences ||
      !preferences.accessibilityPreferences ||
      !preferences.quietHours
    ) {
      return
    }
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
            label="Large text mode"
            sublabel="Increase typography sizing throughout the app"
            checked={profileForm.largeText}
            onChange={e => {
              setProfileForm({ ...profileForm, largeText: e.target.checked })
              updateA11yPrefs({ largeText: e.target.checked })
            }}
          />
          <SwitchField
            inline
            label="High contrast mode"
            sublabel="Enhance text and border contrast ratios"
            checked={profileForm.highContrast}
            onChange={e => {
              setProfileForm({ ...profileForm, highContrast: e.target.checked })
              updateA11yPrefs({ highContrast: e.target.checked })
            }}
          />
          <SwitchField
            inline
            label="Reduce motion"
            sublabel="Suppress non-essential animations and transitions"
            checked={profileForm.reducedMotion}
            onChange={e => {
              setProfileForm({ ...profileForm, reducedMotion: e.target.checked })
              updateA11yPrefs({ reducedMotion: e.target.checked })
            }}
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
      {patient?._id && (
        <PatientDataPrivacySection patientId={patient._id} displayId={patient.displayId} />
      )}
    </div>
  )
}

function PatientDataPrivacySection({
  patientId,
  displayId,
}: {
  patientId: any
  displayId: string
}) {
  const requestExport = useMutation(api.privacy.requestExport)
  const latestExport = useQuery(api.privacy.getLatestExport, { patientId })
  const requestDeletion = useMutation(api.privacy.requestDeletion)
  const confirmDeletion = useMutation(api.privacy.confirmDeletion)

  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletionChallenge, setDeletionChallenge] = useState<string | null>(null)
  const [deletionRequestId, setDeletionRequestId] = useState<any>(null)
  const [verificationInput, setVerificationInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deletionBlocked, setDeletionBlocked] = useState<string | null>(null)
  const [deletionSuccess, setDeletionSuccess] = useState<string | null>(null)

  const handleExport = async () => {
    try {
      setExporting(true)
      await requestExport({ patientId, reason: 'Patient requested full archive' })
      setExportMessage('Export compiled successfully.')
    } catch (err) {
      setExportMessage(`Export failed: ${String(err)}`)
    } finally {
      setExporting(false)
    }
  }

  const downloadArchive = () => {
    if (!latestExport?.exportPayload) return
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(latestExport.exportPayload, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute(
      'download',
      `cri-recovery-archive-${displayId}-${new Date().toISOString().slice(0, 10)}.json`
    )
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleInitiateDeletion = async () => {
    try {
      setIsDeleting(true)
      const res = await requestDeletion({ patientId, reason: 'Right to be forgotten request' })
      if (res.isBlocked) {
        setDeletionBlocked(res.message)
      } else {
        setDeletionRequestId(res.requestId)
        setDeletionChallenge(res.verificationCode)
        setShowDeleteModal(true)
      }
    } catch (err) {
      setDeletionBlocked(String(err))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleConfirmDeletion = async () => {
    if (!deletionRequestId) return
    try {
      setIsDeleting(true)
      const res = await confirmDeletion({
        requestId: deletionRequestId,
        verificationCode: verificationInput.trim(),
      })
      setDeletionSuccess(`Your data has been anonymized and deleted (${res.anonymizedDisplayId}).`)
      setShowDeleteModal(false)
    } catch (err) {
      alert(`Error confirming deletion: ${String(err)}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="p-6 flex flex-col gap-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Recovery Data Privacy & Right to be Forgotten
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Export your complete health record under GDPR Art. 20 and HIPAA, or exercise your right to account erasure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Data */}
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Download className="h-4 w-4 text-foreground" />
              Download Recovery Archive
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Obtain a machine-readable JSON archive of all daily check-ins, symptom trends, activity exposures, care plans, alerts, and access logs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-md bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              {exporting ? 'Compiling…' : 'Generate Export'}
            </button>
            {latestExport?.exportPayload && (
              <button
                type="button"
                onClick={downloadArchive}
                className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Download JSON Archive
              </button>
            )}
          </div>
          {exportMessage && <p className="text-xs text-muted-foreground">{exportMessage}</p>}
        </div>

        {/* Delete Data */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex flex-col justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              Request Data Erasure
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Permanently anonymize personal identifiers, discharge recovery episodes, and revoke caregiver access.
            </p>
          </div>
          <div>
            {deletionBlocked ? (
              <div className="rounded-md bg-destructive/10 p-2.5 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{deletionBlocked}</span>
              </div>
            ) : deletionSuccess ? (
              <p className="text-xs text-success font-medium">{deletionSuccess}</p>
            ) : (
              <button
                type="button"
                onClick={handleInitiateDeletion}
                disabled={isDeleting}
                className="rounded-md border border-destructive/40 bg-background px-3.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Checking Holds…' : 'Request Deletion'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background border border-border p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-base font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirm Data Deletion
            </h3>
            <p className="text-xs text-muted-foreground">
              This action is permanent and cannot be undone. All direct identifiers will be irreversibly anonymized.
            </p>
            <div className="rounded-md bg-muted p-3 text-xs font-mono text-foreground select-all">
              Challenge Code: <strong>{deletionChallenge}</strong>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Type the verification challenge code exactly to confirm:
              </label>
              <input
                type="text"
                value={verificationInput}
                onChange={e => setVerificationInput(e.target.value)}
                placeholder={deletionChallenge ?? ''}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono text-foreground"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletion}
                disabled={isDeleting || verificationInput.trim() !== deletionChallenge}
                className="px-3 py-1.5 text-xs rounded-md bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export function PatientProfileForm() {
  if (isE2ETestMode) {
    return <PatientProfileFormDemo />
  }
  return <PatientProfileFormLive />
}
