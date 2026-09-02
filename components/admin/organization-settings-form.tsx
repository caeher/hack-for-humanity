'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Building, Mail } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import {
  TextField,
  SelectField,
  NumberField,
  ColorPickerField,
  MultiSelectField,
  SwitchField,
} from '@/components/forms'

const PATHWAY_OPTIONS = [
  { label: 'Clinician-diagnosed concussion', value: 'diagnosed' },
  { label: 'Suspected concussion', value: 'suspected' },
  { label: 'Persistent symptoms', value: 'persistent' },
  { label: 'Return-to-learn support', value: 'return-to-learn' },
]

const POLICY_OPTIONS = [
  { label: 'CDC concussion symptom guidance', value: 'CDC concussion symptom guidance' },
  { label: 'Return-to-learn accommodations', value: 'Return-to-learn accommodations' },
  { label: 'Privacy and consent policy', value: 'Privacy and consent policy' },
  { label: 'AI insights governance policy', value: 'AI insights governance policy' },
]

const LOCALE_OPTIONS = [
  { label: 'English (US)', value: 'en-US' },
  { label: 'English (UK)', value: 'en-GB' },
  { label: 'Spanish (US)', value: 'es-US' },
  { label: 'French (Canada)', value: 'fr-CA' },
]

export function OrganizationSettingsForm() {
  const org = useQuery(api.organizations.getMyOrganization, {})
  const settings = useQuery(
    api.organizations.getSettings,
    org ? { orgId: org._id } : 'skip'
  )
  const updateSettings = useMutation(api.organizations.updateSettings)

  const [form, setForm] = useState({
    orgName: '',
    primaryContact: '',
    retentionDays: 2555,
    cohortLimit: 250,
    themeColor: '#0ea5e9',
    pathways: [] as string[],
    policies: [] as string[],
    locale: 'en-US',
    autoEscalate: true,
    aiInsights: true,
    caregiverPortal: true,
    secureMessaging: true,
    patternDetection: true,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!settings) return
    const { organization, featureFlags } = settings
    setForm({
      orgName: organization.name,
      primaryContact: organization.primaryContactEmail,
      retentionDays: organization.retentionPolicyDays,
      cohortLimit: organization.cohortCapacity ?? 250,
      themeColor: organization.accentColor ?? '#0ea5e9',
      pathways: organization.activePathways ?? [],
      policies: organization.approvedPolicies ?? [],
      locale: organization.locale ?? 'en-US',
      autoEscalate: organization.autoEscalateAlerts,
      aiInsights: featureFlags.aiInsights,
      caregiverPortal: featureFlags.caregiverPortal,
      secureMessaging: featureFlags.secureMessaging,
      patternDetection: featureFlags.patternDetection,
    })
  }, [settings])

  const handleSave = async () => {
    if (!org) return
    setSaving(true)
    setMessage(null)
    try {
      await updateSettings({
        orgId: org._id,
        name: form.orgName,
        primaryContactEmail: form.primaryContact,
        retentionPolicyDays: Number(form.retentionDays),
        cohortCapacity: Number(form.cohortLimit),
        accentColor: form.themeColor,
        activePathways: form.pathways,
        approvedPolicies: form.policies,
        locale: form.locale,
        autoEscalateAlerts: form.autoEscalate,
        featureFlags: {
          aiInsights: form.aiInsights,
          caregiverPortal: form.caregiverPortal,
          secureMessaging: form.secureMessaging,
          patternDetection: form.patternDetection,
        },
      })
      setMessage('Settings saved successfully.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (!org) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading organization settings…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Organization settings"
        description="Configure identity, governance, feature flags, and approved policies for your organization."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="p-3 space-y-1 h-fit">
          {['Organization', 'Roles & permissions', 'Alert rules', 'Integrations', 'Data governance'].map(
            (x, i) => (
              <button
                className={`w-full rounded-lg p-3 text-left text-sm font-semibold transition-colors cursor-pointer ${
                  i === 0
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                key={x}
                type="button"
              >
                {x}
              </button>
            )
          )}
        </Card>
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-semibold text-foreground">Organization profile & parameters</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Changes apply to {org.name} and are audited.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Organization Name"
              value={form.orgName}
              onChange={e => setForm({ ...form, orgName: e.target.value })}
              icon={Building}
            />

            <TextField
              label="Primary Contact Email"
              type="email"
              value={form.primaryContact}
              onChange={e => setForm({ ...form, primaryContact: e.target.value })}
              icon={Mail}
            />

            <SelectField
              label="Locale"
              value={form.locale}
              onChange={e => setForm({ ...form, locale: e.target.value })}
              options={LOCALE_OPTIONS}
            />

            <NumberField
              label="Retention policy (days)"
              value={form.retentionDays}
              onChange={e => setForm({ ...form, retentionDays: Number(e.target.value) })}
              min={365}
              max={3650}
              step={365}
              unit="days"
            />

            <NumberField
              label="Max Active Cohort Capacity"
              value={form.cohortLimit}
              onChange={e => setForm({ ...form, cohortLimit: Number(e.target.value) })}
              min={10}
              max={1000}
              step={10}
              unit="patients"
            />

            <ColorPickerField
              label="Organization Brand Accent"
              value={form.themeColor}
              onChange={e => setForm({ ...form, themeColor: e.target.value })}
            />
          </div>

          <MultiSelectField
            label="Active Clinical Recovery Pathways"
            value={form.pathways}
            onChange={e => setForm({ ...form, pathways: e.target.value })}
            options={PATHWAY_OPTIONS}
          />

          <MultiSelectField
            label="Approved policies"
            value={form.policies}
            onChange={e => setForm({ ...form, policies: e.target.value })}
            options={POLICY_OPTIONS}
          />

          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">Feature flags</h3>
            <SwitchField
              inline
              label="AI insights"
              checked={form.aiInsights}
              onChange={e => setForm({ ...form, aiInsights: e.target.checked })}
            />
            <SwitchField
              inline
              label="Caregiver portal"
              checked={form.caregiverPortal}
              onChange={e => setForm({ ...form, caregiverPortal: e.target.checked })}
            />
            <SwitchField
              inline
              label="Secure messaging"
              checked={form.secureMessaging}
              onChange={e => setForm({ ...form, secureMessaging: e.target.checked })}
            />
            <SwitchField
              inline
              label="Pattern detection"
              checked={form.patternDetection}
              onChange={e => setForm({ ...form, patternDetection: e.target.checked })}
            />
          </div>

          <SwitchField
            inline
            label="Automated High-Risk Escalations"
            sublabel="Notify the assigned reviewer when a versioned safety rule records a patient-reported danger sign"
            checked={form.autoEscalate}
            onChange={e => setForm({ ...form, autoEscalate: e.target.checked })}
          />

          <div className="pt-2 border-t border-border flex items-center gap-4">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
