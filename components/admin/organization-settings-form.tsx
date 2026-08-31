'use client'

import React, { useState } from 'react'
import { Building, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import {
  TextField,
  SelectField,
  NumberField,
  CurrencyField,
  ColorPickerField,
  MultiSelectField,
  SwitchField,
} from '@/components/forms'

export function OrganizationSettingsForm() {
  const [settings, setSettings] = useState({
    orgName: 'Northstar Orthopedics',
    primaryContact: 'clinicalops@northstar.example',
    retention: '7 years',
    cohortLimit: 250,
    fee: 175.0,
    themeColor: '#f9a600',
    pathways: ['acl', 'knee', 'spine'],
    autoEscalate: true,
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Administration"
        title="Organization settings"
        description="Configure identity, governance, notifications, and prototype integrations."
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="p-3 space-y-1 h-fit">
          {['Organization', 'Roles & permissions', 'Alert rules', 'Integrations', 'Data governance'].map((x, i) => (
            <button
              className={`w-full rounded-lg p-3 text-left text-sm font-semibold transition-colors cursor-pointer ${
                i === 0 ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              key={x}
            >
              {x}
            </button>
          ))}
        </Card>
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-3">
            <h2 className="text-lg font-semibold text-foreground">Organization profile & parameters</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Configured using dynamic form tokens and field components
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Organization Name"
              value={settings.orgName}
              onChange={e => setSettings({ ...settings, orgName: e.target.value })}
              icon={Building}
            />

            <TextField
              label="Primary Contact Email"
              type="email"
              value={settings.primaryContact}
              onChange={e => setSettings({ ...settings, primaryContact: e.target.value })}
              icon={Mail}
            />

            <SelectField
              label="Default Retention Policy"
              value={settings.retention}
              onChange={e => setSettings({ ...settings, retention: e.target.value })}
              options={['3 years', '5 years', '7 years', '10 years', 'Indefinite']}
            />

            <NumberField
              label="Max Active Cohort Capacity"
              value={settings.cohortLimit}
              onChange={e => setSettings({ ...settings, cohortLimit: e.target.value })}
              min={10}
              max={1000}
              step={10}
              unit="patients"
            />

            <CurrencyField
              label="Standard Consultation Base Fee"
              value={settings.fee}
              onChange={e => setSettings({ ...settings, fee: e.target.value })}
            />

            <ColorPickerField
              label="Organization Brand Accent"
              value={settings.themeColor}
              onChange={e => setSettings({ ...settings, themeColor: e.target.value })}
            />
          </div>

          <MultiSelectField
            label="Active Clinical Recovery Pathways"
            value={settings.pathways}
            onChange={e => setSettings({ ...settings, pathways: e.target.value })}
            options={[
              { label: 'ACL Reconstruction', value: 'acl' },
              { label: 'Total Knee Arthroplasty', value: 'knee' },
              { label: 'Spine Recovery', value: 'spine' },
              { label: 'Rotator Cuff', value: 'rotator' },
            ]}
          />

          <SwitchField
            inline
            label="Automated High-Risk Escalations"
            sublabel="Immediately notify attending surgeon if 3-day recovery trajectory drops by >15%"
            checked={settings.autoEscalate}
            onChange={e => setSettings({ ...settings, autoEscalate: e.target.checked })}
          />

          <div className="pt-2 border-t border-border">
            <button className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs">
              Save changes
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
