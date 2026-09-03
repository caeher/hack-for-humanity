'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus } from 'lucide-react'
import { usePaginatedQuery } from 'convex/react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { SearchField } from '@/components/forms'
import { api } from '@/convex/_generated/api'
import { getLocalDateString } from '@/lib/checkInHistory'
import { patients as demoPatients } from '@/lib/cri-data'
import { isE2ETestMode } from '@/lib/e2e'
import { cn } from '@/lib/utils'

export interface PatientTableProps {
  onAddPatient?: () => void
  className?: string
}

function attentionTone(attention: string): 'good' | 'warn' | 'bad' {
  if (attention === 'Safety') return 'bad'
  if (attention === 'Review') return 'warn'
  return 'good'
}

function PatientTableDemo({ onAddPatient, className }: PatientTableProps) {
  const [query, setQuery] = useState('')
  const filtered = demoPatients.filter(
    p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.recoveryContext.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 bg-card">
        <div className="flex-1 max-w-md">
          <SearchField
            placeholder="Search patients by name or recovery context..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            size="sm"
          />
        </div>
        {onAddPatient && (
          <Button size="sm" onClick={onAddPatient}>
            <Plus className="size-3.5" /> Add Patient
          </Button>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {['Patient', 'Recovery context', 'Day', 'Symptoms', 'Check-ins', 'Attention'].map(x => (
              <TableHead key={x}>{x}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(p => (
            <TableRow key={p.id}>
              <TableCell>
                <Link
                  href={`/clinician/patients/${p.id}`}
                  className="font-semibold text-foreground hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-muted-foreground font-mono">{p.id}</p>
              </TableCell>
              <TableCell>{p.recoveryContext}</TableCell>
              <TableCell>{p.day}</TableCell>
              <TableCell className="font-semibold">{p.symptomTotal} / 48</TableCell>
              <TableCell>{p.checkInRate}%</TableCell>
              <TableCell>
                <Badge tone={attentionTone(p.attention)} showIndicator>{p.attention}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function PatientTableLive({ onAddPatient, className }: PatientTableProps) {
  const [query, setQuery] = useState('')
  const today = useMemo(() => getLocalDateString(), [])

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.caseload.listPatients,
    {
      today,
      search: query.trim() || undefined,
      sortBy: 'displayId',
    },
    { initialNumItems: 20 }
  )

  return (
    <Card className={cn('overflow-hidden p-0', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-border p-4 bg-card">
        <div className="flex-1 max-w-md">
          <SearchField
            placeholder="Search patients by name or recovery context..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            size="sm"
          />
        </div>
        {onAddPatient && (
          <Button size="sm" onClick={onAddPatient}>
            <Plus className="size-3.5" /> Add Patient
          </Button>
        )}
      </div>

      {isLoading && results.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading caseload…
        </div>
      ) : results.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          No patients match your search in this organization caseload.
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {['Patient', 'Recovery context', 'Day', 'Symptoms', 'Check-ins', 'Attention'].map(
                  x => (
                    <TableHead key={x}>{x}</TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(row => (
                <TableRow key={row.patientId}>
                  <TableCell>
                    <Link
                      href={`/clinician/patients/${row.displayId}`}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {row.patientName}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">{row.displayId}</p>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {row.recoveryContext ?? 'No active episode'}
                  </TableCell>
                  <TableCell>{row.dayNumber ?? '—'}</TableCell>
                  <TableCell className="font-semibold">
                    {row.symptomTotal !== null ? `${row.symptomTotal} / 48` : '—'}
                  </TableCell>
                  <TableCell>
                    {row.checkInRate !== null ? `${row.checkInRate}%` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={attentionTone(row.attention)}
                      showIndicator
                      title={row.attentionReasons.join(' ')}
                    >
                      {row.attention}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {status === 'CanLoadMore' && (
            <div className="border-t border-border p-4">
              <Button variant="outline" size="sm" onClick={() => loadMore(20)}>
                Load more patients
              </Button>
            </div>
          )}

          {status === 'LoadingMore' && (
            <div className="flex items-center justify-center gap-2 border-t border-border p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading more…
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export function PatientTable(props: PatientTableProps) {
  if (isE2ETestMode) {
    return <PatientTableDemo {...props} />
  }
  return <PatientTableLive {...props} />
}
