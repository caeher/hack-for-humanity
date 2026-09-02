'use client'

import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { PageHeader } from '@/components/layouts/page-header'

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
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
  const logs = useQuery(
    api.auditLogs.listRecent,
    org ? { orgId: org._id, limit: 50 } : 'skip'
  )

  const logEntries = Array.isArray(logs) ? logs : logs?.page ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Governance"
        title="Audit log"
        description="A traceable record of access, sharing, and administrative events for your organization."
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {['Time', 'Actor role', 'Event', 'Resource'].map(x => (
                <TableHead key={x}>{x}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs === undefined && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Loading audit events…
                </TableCell>
              </TableRow>
            )}
            {logs !== undefined && logEntries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No audit events recorded yet.
                </TableCell>
              </TableRow>
            )}
            {logEntries.map(log => (
              <TableRow key={log._id}>
                <TableCell className="font-mono text-xs">
                  {formatTimestamp(log.createdAt)}
                </TableCell>
                <TableCell>{log.actorRole}</TableCell>
                <TableCell>{log.event}</TableCell>
                <TableCell className="font-mono text-xs">
                  {log.targetResource}
                  {log.resourceId ? ` · ${log.resourceId}` : ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
