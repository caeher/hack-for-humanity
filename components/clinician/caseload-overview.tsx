'use client'

import React, { useState } from 'react'
import { Activity, AlertTriangle, ClipboardCheck, Plus, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { PatientTable } from './patient-table'
import { alerts } from '@/lib/cri-data'
import { UserInviteModal } from '@/components/admin/user-invite-modal'

export function CaseloadOverview() {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clinical command center"
        title="Caseload overview"
        description="Review patient-reported symptom histories, check-in coverage, and safety events."
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Enroll Patient
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active patients" value="42" detail="8 added this month" icon={Users} />
        <StatCard label="Needs review" value="6" detail="2 high priority" icon={AlertTriangle} />
        <StatCard label="Check-in rate" value="87%" detail="+4% this week" icon={ClipboardCheck} />
        <StatCard label="Avg. symptoms" value="24 / 48" detail="Patient-reported" icon={Activity} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Caseload trajectory</h2>
              <p className="text-sm text-muted-foreground">Average patient-reported symptom total</p>
            </div>
            <Badge>42 patients</Badge>
          </div>
          <TrendChart />
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-foreground">Priority alerts</h2>
            <Badge tone="bad">3 open</Badge>
          </div>
          <div className="space-y-4">
            {alerts.map(a => (
              <div className="border-b border-border pb-3 last:border-0" key={a.patient}>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-foreground">{a.patient}</p>
                  <Badge tone={a.severity === 'High' ? 'bad' : 'warn'}>{a.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <PatientTable onAddPatient={() => setShowAddModal(true)} />

      {showAddModal && (
        <UserInviteModal
          title="Enroll Patient"
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
