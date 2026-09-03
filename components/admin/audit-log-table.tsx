'use client'

import React, { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { PageHeader } from '@/components/layouts/page-header'
import { Search, Filter, ShieldCheck, Download } from 'lucide-react'

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getActionTone(action: string): 'good' | 'warn' | 'bad' | 'neutral' {
  switch (action) {
    case 'create':
    case 'consent_grant':
      return 'good'
    case 'update':
    case 'export':
    case 'report_generate':
    case 'legal_hold_apply':
    case 'legal_hold_release':
      return 'warn'
    case 'delete':
    case 'retention_purge':
    case 'auth_failure':
    case 'consent_revoke':
      return 'bad'
    default:
      return 'neutral'
  }
}

function getResultTone(result?: string): 'good' | 'bad' | 'neutral' {
  if (result === 'success') return 'good'
  if (result === 'failure' || result === 'denied') return 'bad'
  return 'good'
}

export function AuditLogTable() {
  if (isE2ETestMode) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow="Governance"
          title="Audit log"
          description="[E2E demo shell] Traceable record of administrative and recovery workspace events."
        />
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            Demo audit events for role changes, recovery report access, and consent updates.
          </p>
        </Card>
      </div>
    )
  }

  return <AuditLogTableLive />
}

function AuditLogTableLive() {
  const org = useQuery(api.organizations.getMyOrganization, {})

  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedResource, setSelectedResource] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [pageSize, setPageSize] = useState<number>(50)

  const logs = useQuery(
    api.auditLogs.listRecent,
    org
      ? {
          orgId: org._id,
          action: selectedAction !== 'all' ? (selectedAction as any) : undefined,
          targetResource: selectedResource !== 'all' ? selectedResource : undefined,
          limit: pageSize,
        }
      : 'skip'
  )

  const logEntries = Array.isArray(logs) ? logs : logs?.page ?? []

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return logEntries
    const q = searchQuery.toLowerCase()
    return logEntries.filter(
      log =>
        log.event.toLowerCase().includes(q) ||
        (log.actorName && log.actorName.toLowerCase().includes(q)) ||
        log.actorRole.toLowerCase().includes(q) ||
        log.targetResource.toLowerCase().includes(q) ||
        (log.resourceId && log.resourceId.toLowerCase().includes(q))
    )
  }, [logEntries, searchQuery])

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return
    const headers = ['Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Resource', 'Resource ID', 'Result', 'Event']
    const rows = filteredEntries.map(l => [
      new Date(l.createdAt).toISOString(),
      `"${l.actorName ?? 'Unknown'}"`,
      `"${l.actorRole}"`,
      `"${l.action}"`,
      `"${l.targetResource}"`,
      `"${l.resourceId ?? ''}"`,
      `"${l.result ?? 'success'}"`,
      `"${l.event.replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `audit-log-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Compliance & Governance"
          title="Audit Log"
          description="Append-only, forensic ledger of data access, consent updates, clinical mutations, and retention events."
        />
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredEntries.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filter toolbar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by actor, event, or resource ID…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Action:</span>
          </div>
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Actions</option>
            <option value="create">create</option>
            <option value="read">read</option>
            <option value="update">update</option>
            <option value="delete">delete</option>
            <option value="export">export</option>
            <option value="retention_purge">retention_purge</option>
            <option value="legal_hold_apply">legal_hold_apply</option>
            <option value="legal_hold_release">legal_hold_release</option>
            <option value="consent_grant">consent_grant</option>
            <option value="consent_revoke">consent_revoke</option>
            <option value="auth_failure">auth_failure</option>
            <option value="safety_acknowledgement">safety_acknowledgement</option>
            <option value="report_generate">report_generate</option>
          </select>

          <select
            value={selectedResource}
            onChange={e => setSelectedResource(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Resources</option>
            <option value="checkIns">checkIns</option>
            <option value="clinicalEncounters">clinicalEncounters</option>
            <option value="carePlans">carePlans</option>
            <option value="alerts">alerts</option>
            <option value="patients">patients</option>
            <option value="privacyRequests">privacyRequests</option>
            <option value="legalHolds">legalHolds</option>
            <option value="activityExposures">activityExposures</option>
            <option value="exposureEntries">exposureEntries</option>
            <option value="consentGrants">consentGrants</option>
            <option value="attachments">attachments</option>
            <option value="organizations">organizations</option>
          </select>
        </div>
      </Card>

      {/* Main Audit Table */}
      <Card className="overflow-hidden p-0 border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[180px]">Actor</TableHead>
              <TableHead className="w-[130px]">Action</TableHead>
              <TableHead className="w-[180px]">Resource</TableHead>
              <TableHead className="w-[100px]">Result</TableHead>
              <TableHead>Event Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs === undefined && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="h-6 w-6 animate-spin text-primary" />
                    <span>Loading verified audit log trail…</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {logs !== undefined && filteredEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No matching audit events found.
                </TableCell>
              </TableRow>
            )}
            {filteredEntries.map(log => (
              <TableRow key={log._id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(log.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground">
                      {log.actorName ?? 'System / Anonymous'}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {log.actorRole}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge tone={getActionTone(log.action)} className="font-mono text-[11px] uppercase">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col font-mono text-xs">
                    <span className="font-medium text-foreground">{log.targetResource}</span>
                    {log.resourceId && (
                      <span className="text-muted-foreground text-[11px] truncate max-w-[150px]">
                        {log.resourceId}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge tone={getResultTone(log.result)} className="capitalize text-xs">
                    {log.result ?? 'success'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-foreground/90 font-sans">
                  {log.event}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground bg-muted/20">
          <span>Showing {filteredEntries.length} audit event{filteredEntries.length === 1 ? '' : 's'}</span>
          <span className="font-mono text-[11px]">Append-only • Payload-sanitized (No PHI notes)</span>
        </div>
      </Card>
    </div>
  )
}
