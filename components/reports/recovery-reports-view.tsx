'use client'

import React from 'react'
import { Activity, AlertTriangle, Check, FileText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/layouts/page-header'
import { StatCard } from '@/components/dashboard/stat-card'

export function RecoveryReportsView() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clinical handoff"
        title="Recovery reports"
        description="Clear summaries designed to support conversations with your care team."
        action={
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Generate report
          </button>
        }
      />
      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid size-12 place-items-center rounded-lg bg-muted text-foreground shrink-0">
              <FileText className="size-6" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">14-day recovery summary</h2>
              <p className="text-sm text-muted-foreground">Aug 17–31 · 8 pages · Updated today</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              Preview
            </button>
            <button className="rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              Share
            </button>
          </div>
        </div>
      </Card>
      <div className="paper-grid p-8 rounded-2xl border border-border">
        <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-8 warm-shadow">
          <p className="font-mono text-xs text-muted-foreground">CRI RECOVERY SUMMARY · P-1042</p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Maya Chen</h2>
          <p className="mt-1 text-sm text-muted-foreground">ACL reconstruction · Day 18</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <StatCard label="Score" value="78" detail="On track" icon={Activity} />
            <StatCard label="Adherence" value="92%" detail="High" icon={Check} />
            <StatCard label="Flags" value="1" detail="Low priority" icon={AlertTriangle} />
          </div>
        </div>
      </div>
    </div>
  )
}
