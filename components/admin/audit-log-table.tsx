import React from 'react'
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

const auditEvents = [
  ['10:42 AM', 'Dr. Brooks', 'Viewed recovery report', 'P-1042'],
  ['9:18 AM', 'Admin Lee', 'Changed user role', 'U-088'],
  ['Yesterday', 'Maya Chen', 'Shared caregiver access', 'P-1042'],
  ['Aug 29', 'Dr. Brooks', 'Updated clinical care plan', 'P-1038'],
  ['Aug 28', 'System', 'Generated automated weekly report', 'Cohort-A'],
]

export function AuditLogTable() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Governance"
        title="Audit log"
        description="A traceable record of access, sharing, and administrative events."
      />
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {['Time', 'Actor', 'Event', 'Resource'].map(x => (
                <TableHead key={x}>{x}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEvents.map(r => (
              <TableRow key={r[0] + r[2]}>
                {r.map((x, idx) => (
                  <TableCell
                    key={x}
                    className={idx === 0 || idx === 3 ? 'font-mono text-xs' : ''}
                  >
                    {x}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

