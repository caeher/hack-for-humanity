import type { TimelineRangeKey } from '@/lib/recoveryTimeline'

export const RECOVERY_REPORT_SCHEMA_VERSION = '1.0.0' as const

export const REPORT_DISCLAIMER =
  'CRI does not diagnose concussion, predict recovery, determine prognosis, or clear return to sport, school, or work. This report organizes patient-reported and authorized clinical records for discussion with a qualified professional.'

export const REPORT_RANGE_OPTIONS: Array<{ value: TimelineRangeKey; label: string }> = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'episode', label: 'Full episode' },
]

export interface RecoveryReportPayload {
  schemaVersion: string
  disclaimer: string
  methodologyVersions: {
    symptom: string
    pattern: string
    safety: string
    provenanceSchema: string
  }
  metadata: {
    generatedAt: number
    dataCutoffAt: number
    requestedByUserId: string
    requestedByRole: string
    requestedByName: string
    rangeStart: string
    rangeEnd: string
    rangeKey: TimelineRangeKey
    timeZone: string
    dataSource: 'live' | 'simulated'
    patientDisplayId: string
    patientPreferredName: string
    episodeDayLabel: string | null
  }
  sectionsIncluded: string[]
  sectionsOmitted: Array<{
    section: string
    reason: string
    requiredScope?: string
  }>
  episode: {
    sourceKind: string
    incidentDate: string | null
    injuryContext: string | null
    status: string | null
    riskLevel: string | null
    periodStart: string
    periodEnd: string
    missingEpisodeNote?: string
  } | null
  symptoms: {
    sourceKind: string
    methodologyVersion: string
    metricName: string
    metricRange: string
    notRecoveryScore: string
    checkInCount: number
    expectedDays: number
    gapDays: number
    missingDataNote?: string
    latestSymptomTotal: number | null
    dimensionSummaries: Array<{
      dimensionId: string
      label: string
      latestRating: number | null
      averageRating: number | null
      sourceKind: string
    }>
    checkIns: Array<{
      checkInId: string
      date: string
      symptomTotal: number
      symptoms: Record<string, number>
    }>
  } | null
  trends: {
    sourceKind: string
    direction: string
    readiness: string
    summaryText: string
    disclaimerText: string
    dateRangeStart: string
    dateRangeEnd: string
  } | null
  exposure: {
    sourceKind: string
    loggedDays: number
    averageSleepHours: number | null
    averageScreenMinutes: number | null
    averagePhysicalExertion: number | null
    missingDataNote?: string
  } | null
  events: {
    sourceKind: string
    summary: {
      headline: string
      description: string
      loggedSymptomDays: number
      loggedExposureDays: number
      gapDays: number
    }
    markers: Array<{
      id: string
      date: string
      kind: string
      title: string
      detail: string
    }>
  } | null
  planAdherence: {
    sourceKind: string
    totalItems: number
    completedCount: number
    skippedCount: number
    unableCount: number
    pendingCount: number
    neutralSummary: string
    adherenceRate: number | null
  } | null
  patterns: {
    sourceKind: string
    algorithmVersion: string
    disclaimer: string
    patterns: Array<{
      patternType: string
      title: string
      description: string
      footer: string
      status: string
    }>
    insufficientNote?: string
  } | null
  safety: {
    sourceKind: string
    ruleEngineVersion: string
    eventCount: number
    evaluations: Array<{
      evaluationId: string
      status: string
      highestSeverity: string
      matchedRuleCodes: string[]
      createdAt: number
    }>
    missingDataNote?: string
  } | null
  encounters: {
    sourceKind: string
    count: number
    items: Array<{
      encounterId: string
      encounterType: string
      datetime: string
      diagnosis: string
      clinicalSummary: string
      status: string
    }>
    missingDataNote?: string
  } | null
  discussionQuestions: string[]
}

export function formatReportTimestamp(ms: number, timeZone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(ms))
}

export function formatReportDateRange(start: string, end: string): string {
  return `${start} to ${end}`
}

export function downloadReportJson(payload: RecoveryReportPayload, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
