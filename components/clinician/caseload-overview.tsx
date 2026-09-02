'use client'

import React, { useMemo, useState } from 'react'
import { Activity, AlertTriangle, ClipboardCheck, Loader2, Plus, Users } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { PatientTable } from './patient-table'
import { UserInviteModal } from '@/components/admin/user-invite-modal'
import { api } from '@/convex/_generated/api'
import { getLocalDateString } from '@/lib/checkInHistory'
import { alerts as demoAlerts } from '@/lib/cri-data'
import { isE2ETestMode } from '@/lib/e2e'

function CaseloadOverviewDemo() {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="[E2E demo shell] Clinical command center"
        title="Caseload overview"
        description="Prototype clinician dashboard — simulated symptom tracking for smoke testing."
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
            {demoAlerts.slice(0, 3).map(a => (
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
        <UserInviteModal title="Enroll Patient" onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}

function CaseloadOverviewLive() {
  const [showAddModal, setShowAddModal] = useState(false)
  const today = useMemo(() => getLocalDateString(), [])

  const summary = useQuery(api.caseload.getSummary, { today })
  const priorityAlerts = useQuery(api.alerts.listPriority, { limit: 3 })
  const acknowledgeAlert = useMutation(api.alerts.acknowledgeAlert)

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
        <StatCard
          label="Active patients"
          value={summary ? String(summary.activePatientCount) : '—'}
          detail={
            summary
              ? `${summary.newPatientsThisMonth} added this month`
              : 'Loading organization caseload…'
          }
          icon={Users}
        />
        <StatCard
          label="Needs review"
          value={summary ? String(summary.needsReviewCount) : '—'}
          detail={
            summary
              ? `${summary.highPriorityAlertCount} high priority`
              : 'Deriving from safety engine outcomes'
          }
          icon={AlertTriangle}
        />
        <StatCard
          label="Check-in rate"
          value={
            summary?.checkInRatePercent !== null && summary?.checkInRatePercent !== undefined
              ? `${summary.checkInRatePercent}%`
              : '—'
          }
          detail="7-day caseload average"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Avg. symptoms"
          value={
            summary?.averageSymptomTotal !== null && summary?.averageSymptomTotal !== undefined
              ? `${summary.averageSymptomTotal} / 48`
              : '—'
          }
          detail="Patient-reported"
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-foreground">Caseload trajectory</h2>
              <p className="text-sm text-muted-foreground">Average patient-reported symptom total</p>
            </div>
            <Badge>{summary ? `${summary.activePatientCount} patients` : 'Live data'}</Badge>
          </div>
          <TrendChart />
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-foreground">Priority alerts</h2>
            <Badge tone="bad">
              {priorityAlerts ? `${priorityAlerts.length} open` : '…'}
            </Badge>
          </div>

          {priorityAlerts === undefined ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading alerts…
            </div>
          ) : priorityAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active high-priority alerts.</p>
          ) : (
            <div className="space-y-4">
              {priorityAlerts.map(item => (
                <div
                  className="border-b border-border pb-3 last:border-0"
                  key={item.alert._id}
                >
                  <div className="flex justify-between items-center gap-2">
                    <Link
                      href={`/clinician/patients/${item.patientDisplayId}`}
                      className="text-sm font-semibold text-foreground hover:underline"
                    >
                      {item.patientName}
                    </Link>
                    <Badge tone={item.alert.severity === 'High' ? 'bad' : 'warn'}>
                      {item.alert.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.alert.detail}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{item.freshnessLabel}</span>
                    {item.alert.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => acknowledgeAlert({ alertId: item.alert._id })}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <PatientTable onAddPatient={() => setShowAddModal(true)} />

      {showAddModal && (
        <UserInviteModal title="Enroll Patient" onClose={() => setShowAddModal(false)} />
      )}
    </div>
  )
}

export function CaseloadOverview() {
  if (isE2ETestMode) {
    return <CaseloadOverviewDemo />
  }
  return <CaseloadOverviewLive />
}
