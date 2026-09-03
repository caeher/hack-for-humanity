'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layouts/page-header'
import { ExplanationView } from '@/components/explanation'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { alerts as demoAlerts } from '@/lib/cri-data'
import { isE2ETestMode } from '@/lib/e2e'
import { cn } from '@/lib/utils'

type AlertFilter = 'all' | 'high' | 'unassigned' | 'resolved'

function ClinicalAlertsListDemo() {
  const [resolved, setResolved] = useState<string[]>([])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="[E2E demo shell] Follow-up workspace"
        title="Clinical alerts"
        description="Prototype triage queue — simulated safety events for smoke testing."
      />
      <div className="space-y-3">
        {demoAlerts.map(a => (
          <Card className="p-5" key={a.patient}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-4">
                <div className="grid size-10 place-items-center rounded-lg bg-muted text-foreground shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{a.patient}</p>
                    <Badge tone={a.severity === 'High' ? 'bad' : 'warn'} showIndicator>{a.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.detail} · {a.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setResolved(r => (r.includes(a.patient) ? r : [...r, a.patient]))
                }
                aria-label={`Acknowledge alert for ${a.patient}`}
                className="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              >
                {resolved.includes(a.patient) ? 'Acknowledged' : 'Acknowledge'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ClinicalAlertsListLive() {
  const [filter, setFilter] = useState<AlertFilter>('all')
  const [expandedAlertId, setExpandedAlertId] = useState<Id<'alerts'> | null>(null)
  const [snoozeTarget, setSnoozeTarget] = useState<Id<'alerts'> | null>(null)
  const [snoozeReason, setSnoozeReason] = useState('')

  const listArgs = useMemo(() => {
    if (filter === 'high') {
      return { severity: 'High' as const, includeResolved: false }
    }
    if (filter === 'unassigned') {
      return { unassignedOnly: true, includeResolved: false }
    }
    if (filter === 'resolved') {
      return { status: 'resolved' as const, includeResolved: true }
    }
    return { includeResolved: false }
  }, [filter])

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.alerts.list,
    listArgs,
    { initialNumItems: 15 }
  )

  const acknowledgeAlert = useMutation(api.alerts.acknowledgeAlert)
  const resolveAlert = useMutation(api.alerts.resolveAlert)
  const snoozeAlert = useMutation(api.alerts.snoozeAlert)
  const assignAlert = useMutation(api.alerts.assignAlert)
  const currentUser = useQuery(api.users.getMe)

  const filterButtons: Array<{ key: AlertFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'High priority' },
    { key: 'unassigned', label: 'Unassigned' },
    { key: 'resolved', label: 'Resolved' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Follow-up workspace"
        title="Clinical alerts"
        description="Review patient-reported safety events and patterns that may require follow-up."
      />

      <div className="flex flex-wrap gap-2">
        {filterButtons.map(button => (
          <button
            className={cn(
              'rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors',
              filter === button.key
                ? 'bg-foreground text-background'
                : 'bg-card text-foreground hover:bg-muted'
            )}
            key={button.key}
            type="button"
            onClick={() => setFilter(button.key)}
          >
            {button.label}
          </button>
        ))}
      </div>

      {isLoading && results.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading clinical alerts…
        </div>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No alerts match this filter in your organization caseload.
        </Card>
      ) : (
        <div className="space-y-3">
          {results.map(item => (
            <Card className="p-5" key={item.alert._id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4 min-w-0">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted text-foreground shrink-0">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/clinician/patients/${item.patientDisplayId}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {item.patientName}
                      </Link>
                      <Badge tone={item.alert.severity === 'High' ? 'bad' : 'warn'} showIndicator>
                        {item.alert.severity}
                      </Badge>
                      <Badge tone="neutral">{item.alert.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.alert.detail} · {item.freshnessLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.isUnassigned
                        ? 'Unassigned'
                        : `Assigned to ${item.assignedToName}`}
                      {item.alert.ruleCode ? ` · Rule ${item.alert.ruleCode}` : ''}
                    </p>

                    {item.provenance && expandedAlertId === item.alert._id && (
                      <div className="mt-4">
                        <ExplanationView
                          provenance={item.provenance}
                          title="Alert evidence & provenance"
                          compact
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {item.provenance && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setExpandedAlertId(current =>
                          current === item.alert._id ? null : item.alert._id
                        )
                      }
                    >
                      {expandedAlertId === item.alert._id ? 'Hide evidence' : 'View evidence'}
                    </Button>
                  )}

                  {item.alert.status === 'active' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert({ alertId: item.alert._id })}
                      >
                        Acknowledge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!currentUser}
                        onClick={() => {
                          if (!currentUser) return
                          void assignAlert({
                            alertId: item.alert._id,
                            assigneeUserId: currentUser._id,
                          })
                        }}
                      >
                        Assign to me
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSnoozeTarget(item.alert._id)}
                      >
                        Snooze
                      </Button>
                    </>
                  )}

                  {(item.alert.status === 'active' || item.alert.status === 'acknowledged') && (
                    <Button
                      size="sm"
                      onClick={() => resolveAlert({ alertId: item.alert._id })}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {status === 'CanLoadMore' && (
        <Button variant="outline" onClick={() => loadMore(15)}>
          Load more alerts
        </Button>
      )}

      {snoozeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="font-semibold text-foreground">Snooze alert</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Document why this alert can wait and when to revisit it.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border border-border bg-background p-3 text-sm"
              rows={4}
              value={snoozeReason}
              onChange={e => setSnoozeReason(e.target.value)}
              placeholder="Reason for snooze (required)"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSnoozeTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const snoozeUntil = Date.now() + 24 * 60 * 60 * 1000
                  await snoozeAlert({
                    alertId: snoozeTarget,
                    snoozeUntil,
                    reason: snoozeReason,
                  })
                  setSnoozeTarget(null)
                  setSnoozeReason('')
                }}
                disabled={snoozeReason.trim().length < 5}
              >
                Snooze 24 hours
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

export function ClinicalAlertsList() {
  if (isE2ETestMode) {
    return <ClinicalAlertsListDemo />
  }
  return <ClinicalAlertsListLive />
}
