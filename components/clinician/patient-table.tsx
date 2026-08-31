'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
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
import { patients } from '@/lib/cri-data'

export interface PatientTableProps {
  onAddPatient?: () => void
}

export function PatientTable({ onAddPatient }: PatientTableProps) {
  const [query, setQuery] = useState('')
  const filtered = patients.filter(
    p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.recoveryContext.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Card className="overflow-hidden p-0">
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
          <Button
            size="sm"
            onClick={onAddPatient}
          >
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
                <Badge
                  tone={
                    p.attention === 'Routine'
                      ? 'good'
                      : p.attention === 'Safety'
                      ? 'bad'
                      : 'warn'
                  }
                >
                  {p.attention}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

