'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layouts/page-header'
import { SelectField } from '@/components/forms'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { getLocalDateString } from '@/lib/checkInHistory'
import { isE2ETestMode } from '@/lib/e2e'
import {
  downloadReportJson,
  REPORT_RANGE_OPTIONS,
  type RecoveryReportPayload,
} from '@/lib/recoveryReport'
import { DEMO_RECOVERY_REPORT_PAYLOAD } from '@/lib/recoveryReportDemo'
import type { TimelineRangeKey } from '@/lib/recoveryTimeline'
import {
  RecoveryReportDocument,
  RecoveryReportPreviewCard,
} from './recovery-report-document'

export interface RecoveryReportsViewProps {
  patientId?: Id<'patients'>
}

function RecoveryReportsDemo() {
  const [range, setRange] = useState<TimelineRangeKey>('14')
  const demoPayload = useMemo(() => DEMO_RECOVERY_REPORT_PAYLOAD, [])

  const handlePrint = () => window.print()
  const handleExport = () =>
    downloadReportJson(demoPayload, `cri-recovery-report-demo-${demoPayload.metadata.rangeStart}.json`)

  return (
    <RecoveryReportsShell
      range={range}
      onRangeChange={setRange}
      isGenerating={false}
      onGenerate={() => undefined}
      payload={demoPayload}
      onPrint={handlePrint}
      onExport={handleExport}
      dataSourceLabel="Simulated demo data for CI and demonstrations."
    />
  )
}

function RecoveryReportsLive({ patientId: patientIdProp }: RecoveryReportsViewProps) {
  const [range, setRange] = useState<TimelineRangeKey>('14')
  const [generatedPayload, setGeneratedPayload] = useState<RecoveryReportPayload | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mePatient = useQuery(api.patients.getMePatient, patientIdProp ? 'skip' : {})
  const patientId = patientIdProp ?? mePatient?._id
  const today = useMemo(() => getLocalDateString(new Date(), mePatient?.timeZone), [mePatient?.timeZone])

  const latestReport = useQuery(
    api.recoveryReports.getLatest,
    patientId ? { patientId } : 'skip'
  )

  const generateReport = useMutation(api.recoveryReports.generate)

  const activePayload = generatedPayload ?? (latestReport?.payload as RecoveryReportPayload | undefined) ?? null

  const handleGenerate = async () => {
    if (!patientId) return
    setIsGenerating(true)
    setError(null)
    try {
      const result = await generateReport({ patientId, today, range })
      setGeneratedPayload(result.payload as RecoveryReportPayload)
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'Failed to generate report.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => window.print()
  const handleExport = () => {
    if (!activePayload) return
    downloadReportJson(
      activePayload,
      `cri-recovery-report-${activePayload.metadata.patientDisplayId}-${activePayload.metadata.rangeStart}.json`
    )
  }

  if (patientId === undefined) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" />
        Loading patient context…
      </div>
    )
  }

  return (
    <RecoveryReportsShell
      range={range}
      onRangeChange={setRange}
      isGenerating={isGenerating}
      onGenerate={handleGenerate}
      payload={activePayload}
      onPrint={handlePrint}
      onExport={handleExport}
      error={error}
      dataSourceLabel={
        activePayload?.metadata.dataSource === 'live'
          ? 'Values reconcile with saved source records at the stated cutoff.'
          : undefined
      }
    />
  )
}

function RecoveryReportsShell({
  range,
  onRangeChange,
  isGenerating,
  onGenerate,
  payload,
  onPrint,
  onExport,
  error,
  dataSourceLabel,
}: {
  range: TimelineRangeKey
  onRangeChange: (value: TimelineRangeKey) => void
  isGenerating: boolean
  onGenerate: () => void
  payload: RecoveryReportPayload | null
  onPrint: () => void
  onExport: () => void
  error?: string | null
  dataSourceLabel?: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clinical handoff"
        title="Recovery reports"
        description="Clear summaries designed to support conversations with your care team."
        action={
          <Button onClick={onGenerate} disabled={isGenerating} className="no-print">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate report'
            )}
          </Button>
        }
      />

      <div className="no-print grid gap-4 sm:grid-cols-[minmax(0,240px)_1fr]">
        <SelectField
          label="Report period"
          value={range}
          onChange={event => onRangeChange(event.target.value as TimelineRangeKey)}
          options={REPORT_RANGE_OPTIONS.map(option => ({
            value: option.value,
            label: option.label,
          }))}
        />
        {error && (
          <p className="self-end text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      {payload ? (
        <>
          <RecoveryReportPreviewCard payload={payload} onPrint={onPrint} onExport={onExport} />
          <div className="paper-grid rounded-2xl border border-border p-4 sm:p-8">
            <RecoveryReportDocument payload={payload} />
          </div>
          {dataSourceLabel && (
            <p className="text-xs leading-5 text-muted-foreground no-print">{dataSourceLabel}</p>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground no-print">
          Select a period and generate a report to preview printable output and machine-readable export.
        </div>
      )}
    </div>
  )
}

export function RecoveryReportsView(props: RecoveryReportsViewProps) {
  if (isE2ETestMode) {
    return <RecoveryReportsDemo />
  }

  return <RecoveryReportsLive {...props} />
}
