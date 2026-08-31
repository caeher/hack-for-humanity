'use client'

import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { alerts } from '@/lib/cri-data'

export function ClinicalAlertsList() {
  const [resolved, setResolved] = useState<string[]>([])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Follow-up workspace"
        title="Clinical alerts"
        description="Review patient-reported safety events and patterns that may require follow-up."
      />
      <div className="flex gap-2">
        {['All', 'High priority', 'Unassigned', 'Resolved'].map((x, i) => (
          <button
            className={`rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors ${
              i === 0 ? 'bg-foreground text-background' : 'bg-card text-foreground hover:bg-muted'
            }`}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {alerts.map(a => (
          <Card className="p-5" key={a.patient}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-4">
                <div className="grid size-10 place-items-center rounded-lg bg-muted text-foreground shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{a.patient}</p>
                    <Badge tone={a.severity === 'High' ? 'bad' : 'warn'}>{a.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.detail} · {a.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResolved(r => (r.includes(a.patient) ? r : [...r, a.patient]))}
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
