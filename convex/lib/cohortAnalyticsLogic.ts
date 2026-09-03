/**
 * Privacy-preserving cohort analytics for organization program evaluation.
 *
 * Design principles:
 * - Aggregate counts only — no patient IDs in outputs
 * - Small-cell suppression (k-anonymity) before any cell is exposed
 * - Symptom totals are descriptive patient-reported data, never recovery scores
 * - No procedure/surgery dimensions — concussion engagement & completeness only
 */

import type { Doc, Id } from '../_generated/dataModel'

/** Minimum group size before a metric or segment is shown. Documented in UI. */
export const COHORT_SMALL_CELL_THRESHOLD = 5

export const COHORT_METHODOLOGY_VERSION = '1.0.0' as const

export const COHORT_PERIOD_DAYS = 30

export type AgeBand = '13-17' | '18-24' | '25-39' | '40-54' | '55-plus' | 'unknown'

export type EpisodeDurationBand =
  | '0-7d'
  | '8-14d'
  | '15-30d'
  | '31-90d'
  | '91d-plus'
  | 'unknown'

export type EngagementTier = 'high' | 'moderate' | 'low' | 'none'

export interface CohortMetricDefinition {
  metricId: string
  label: string
  definition: string
  denominator: string
  caveat: string
  sourceQuery: string
  unit: 'count' | 'percent' | 'median'
  /** When true, values must never be framed as recovery or readiness. */
  descriptiveOnly: boolean
}

export const COHORT_METRIC_DEFINITIONS: readonly CohortMetricDefinition[] = [
  {
    metricId: 'enrollment_count',
    label: 'Active enrollments',
    definition:
      'Count of patients with Active status in the organization at snapshot time.',
    denominator: 'All active patients in organization',
    caveat: 'Enrollment status only — not clinical severity or recovery stage.',
    sourceQuery: 'patients.by_orgId_and_status → status=Active',
    unit: 'count',
    descriptiveOnly: false,
  },
  {
    metricId: 'check_in_engagement_7d',
    label: '7-day check-in engagement',
    definition:
      'Share of active patients who submitted at least one daily check-in in the trailing 7 days.',
    denominator: 'Active patients in organization (or filtered cohort)',
    caveat:
      'Engagement metric only. Missing check-ins may reflect access barriers, not symptom improvement.',
    sourceQuery: 'checkIns.by_patientId_and_date → date >= rangeStart',
    unit: 'percent',
    descriptiveOnly: false,
  },
  {
    metricId: 'baseline_completion_rate',
    label: 'Baseline assessment completion',
    definition:
      'Share of active recovery episodes with a completed initial symptom baseline on file.',
    denominator: 'Active recovery episodes in organization (or filtered cohort)',
    caveat:
      'Data completeness indicator. Baseline captures starting self-reported symptoms — not a clinical diagnosis.',
    sourceQuery: 'recoveryBaselines.by_episodeId_and_isCurrent → isCurrent=true',
    unit: 'percent',
    descriptiveOnly: false,
  },
  {
    metricId: 'median_symptom_total_7d',
    label: 'Median patient-reported symptom total (7d)',
    definition:
      'Median of daily symptom totals (sum of 8 categories, each 0–6; range 0–48) among submitted check-ins in the trailing 7 days.',
    denominator: 'Submitted check-ins in trailing 7 days (or filtered cohort)',
    caveat:
      'Descriptive patient-reported burden only. NOT recovery progress, severity grade, prognosis, or return-to-activity readiness.',
    sourceQuery: 'checkIns.symptomTotal aggregated per patient → median',
    unit: 'median',
    descriptiveOnly: true,
  },
  {
    metricId: 'danger_sign_report_rate',
    label: 'Danger-sign report rate',
    definition:
      'Share of submitted check-ins where the patient indicated at least one listed danger sign.',
    denominator: 'Submitted check-ins in trailing 30 days (or filtered cohort)',
    caveat:
      'Operational triage signal for program monitoring. Does not replace emergency evaluation or clinical assessment.',
    sourceQuery: 'checkIns.dangerSignsPresent → count where true',
    unit: 'percent',
    descriptiveOnly: false,
  },
  {
    metricId: 'data_completeness_exposure_30d',
    label: 'Exposure logging completeness (30d)',
    definition:
      'Share of active patients with at least one activity/exposure entry in the trailing 30 days.',
    denominator: 'Active patients in organization (or filtered cohort)',
    caveat:
      'Data completeness metric. Missing logs do not imply non-adherence or clinical stability.',
    sourceQuery: 'exposureEntries.by_patientId_and_date → date >= rangeStart',
    unit: 'percent',
    descriptiveOnly: false,
  },
  {
    metricId: 'active_alert_rate',
    label: 'Active alert rate',
    definition:
      'Share of active patients with at least one open clinical alert in the organization triage queue.',
    denominator: 'Active patients in organization (or filtered cohort)',
    caveat:
      'Operational triage metric. Alert presence reflects workflow flags — not automated diagnosis.',
    sourceQuery: 'alerts.by_orgId_and_status → status=active',
    unit: 'percent',
    descriptiveOnly: false,
  },
] as const

export function getMetricDefinition(metricId: string): CohortMetricDefinition | undefined {
  return COHORT_METRIC_DEFINITIONS.find(m => m.metricId === metricId)
}

export function daysBetweenIsoDates(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00.000Z`)
  const endMs = Date.parse(`${end}T00:00:00.000Z`)
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return 0
  }
  return Math.max(0, Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)))
}

export function classifyEpisodeDurationBand(
  incidentDate: string,
  asOfDate: string
): EpisodeDurationBand {
  const days = daysBetweenIsoDates(incidentDate, asOfDate)
  if (days <= 7) return '0-7d'
  if (days <= 14) return '8-14d'
  if (days <= 30) return '15-30d'
  if (days <= 90) return '31-90d'
  if (days > 90) return '91d-plus'
  return 'unknown'
}

export function classifyEngagementTier(checkInsIn7d: number): EngagementTier {
  if (checkInsIn7d >= 5) return 'high'
  if (checkInsIn7d >= 3) return 'moderate'
  if (checkInsIn7d >= 1) return 'low'
  return 'none'
}

export function normalizeProgramPathway(
  injuryContext: string,
  orgPathways?: string[]
): string {
  const normalized = injuryContext.trim()
  if (orgPathways && orgPathways.length > 0) {
    const match = orgPathways.find(
      p => normalized.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(normalized.toLowerCase().slice(0, 20))
    )
    if (match) return match
  }
  // Group simulated demo contexts into broad program categories
  const lower = normalized.toLowerCase()
  if (lower.includes('sport') || lower.includes('soccer') || lower.includes('basketball')) {
    return 'Sports-related injury'
  }
  if (lower.includes('motor vehicle') || lower.includes('collision')) {
    return 'Motor vehicle collision'
  }
  if (lower.includes('fall') || lower.includes('slip')) {
    return 'Fall-related injury'
  }
  if (lower.includes('cycling') || lower.includes('bike')) {
    return 'Cycling-related injury'
  }
  return 'Other program context'
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 10) / 10
  }
  return sorted[mid]!
}

export function percentRate(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

export function shouldSuppress(count: number): boolean {
  return count < COHORT_SMALL_CELL_THRESHOLD
}

export interface DimensionalCell {
  ageBand: AgeBand
  episodeDurationBand: EpisodeDurationBand
  engagementTier: EngagementTier
  programPathway: string
  patientCount: number
  patientsWithCheckIn7d: number
  patientsWithBaseline: number
  patientsWithExposure30d: number
  patientsWithActiveAlert: number
  checkInsSubmitted30d: number
  dangerSignCheckIns30d: number
  symptomTotals7d: number[]
}

export interface PatientCohortBuckets {
  patientId: Id<'patients'>
  ageBand: AgeBand
  episodeDurationBand: EpisodeDurationBand
  engagementTier: EngagementTier
  programPathway: string
  hasCheckIn7d: boolean
  hasBaseline: boolean
  hasExposure30d: boolean
  hasActiveAlert: boolean
  checkIns30d: number
  dangerSignCheckIns30d: number
  symptomTotals7d: number[]
}

export function buildDimensionalKey(
  ageBand: AgeBand,
  episodeDurationBand: EpisodeDurationBand,
  engagementTier: EngagementTier,
  programPathway: string
): string {
  return `${ageBand}|${episodeDurationBand}|${engagementTier}|${programPathway}`
}

export function aggregateDimensionalCells(
  buckets: PatientCohortBuckets[]
): DimensionalCell[] {
  const map = new Map<string, DimensionalCell>()

  for (const bucket of buckets) {
    const key = buildDimensionalKey(
      bucket.ageBand,
      bucket.episodeDurationBand,
      bucket.engagementTier,
      bucket.programPathway
    )
    const existing = map.get(key)
    if (existing) {
      existing.patientCount += 1
      if (bucket.hasCheckIn7d) existing.patientsWithCheckIn7d += 1
      if (bucket.hasBaseline) existing.patientsWithBaseline += 1
      if (bucket.hasExposure30d) existing.patientsWithExposure30d += 1
      if (bucket.hasActiveAlert) existing.patientsWithActiveAlert += 1
      existing.checkInsSubmitted30d += bucket.checkIns30d
      existing.dangerSignCheckIns30d += bucket.dangerSignCheckIns30d
      existing.symptomTotals7d.push(...bucket.symptomTotals7d)
    } else {
      map.set(key, {
        ageBand: bucket.ageBand,
        episodeDurationBand: bucket.episodeDurationBand,
        engagementTier: bucket.engagementTier,
        programPathway: bucket.programPathway,
        patientCount: 1,
        patientsWithCheckIn7d: bucket.hasCheckIn7d ? 1 : 0,
        patientsWithBaseline: bucket.hasBaseline ? 1 : 0,
        patientsWithExposure30d: bucket.hasExposure30d ? 1 : 0,
        patientsWithActiveAlert: bucket.hasActiveAlert ? 1 : 0,
        checkInsSubmitted30d: bucket.checkIns30d,
        dangerSignCheckIns30d: bucket.dangerSignCheckIns30d,
        symptomTotals7d: [...bucket.symptomTotals7d],
      })
    }
  }

  return Array.from(map.values())
}

export interface CohortFilters {
  ageBand?: AgeBand
  episodeDurationBand?: EpisodeDurationBand
  engagementTier?: EngagementTier
  programPathway?: string
}

export function filterDimensionalCells(
  cells: DimensionalCell[],
  filters: CohortFilters
): DimensionalCell[] {
  return cells.filter(cell => {
    if (filters.ageBand && cell.ageBand !== filters.ageBand) return false
    if (filters.episodeDurationBand && cell.episodeDurationBand !== filters.episodeDurationBand) {
      return false
    }
    if (filters.engagementTier && cell.engagementTier !== filters.engagementTier) return false
    if (filters.programPathway && cell.programPathway !== filters.programPathway) return false
    return true
  })
}

export interface AggregatedCohortMetrics {
  patientCount: number
  suppressed: boolean
  suppressionReason?: string
  metrics: Array<{
    metricId: string
    value: number | null
    numerator: number
    denominator: number
    suppressed: boolean
  }>
}

export function computeFilteredMetrics(
  cells: DimensionalCell[],
  filters: CohortFilters
): AggregatedCohortMetrics {
  const filtered = filterDimensionalCells(cells, filters)

  const patientCount = filtered.reduce((sum, c) => sum + c.patientCount, 0)
  if (shouldSuppress(patientCount)) {
    return {
      patientCount,
      suppressed: true,
      suppressionReason: `Cohort size (${patientCount}) is below the minimum threshold of ${COHORT_SMALL_CELL_THRESHOLD} for privacy protection.`,
      metrics: COHORT_METRIC_DEFINITIONS.map(def => ({
        metricId: def.metricId,
        value: null,
        numerator: 0,
        denominator: 0,
        suppressed: true,
      })),
    }
  }

  const patientsWithCheckIn7d = filtered.reduce((s, c) => s + c.patientsWithCheckIn7d, 0)
  const patientsWithBaseline = filtered.reduce((s, c) => s + c.patientsWithBaseline, 0)
  const patientsWithExposure30d = filtered.reduce((s, c) => s + c.patientsWithExposure30d, 0)
  const patientsWithActiveAlert = filtered.reduce((s, c) => s + c.patientsWithActiveAlert, 0)
  const checkIns30d = filtered.reduce((s, c) => s + c.checkInsSubmitted30d, 0)
  const dangerSignCheckIns = filtered.reduce((s, c) => s + c.dangerSignCheckIns30d, 0)
  const allSymptomTotals7d = filtered.flatMap(c => c.symptomTotals7d)

  const metrics: AggregatedCohortMetrics['metrics'] = [
    {
      metricId: 'enrollment_count',
      value: patientCount,
      numerator: patientCount,
      denominator: patientCount,
      suppressed: false,
    },
    {
      metricId: 'check_in_engagement_7d',
      value: percentRate(patientsWithCheckIn7d, patientCount),
      numerator: patientsWithCheckIn7d,
      denominator: patientCount,
      suppressed: false,
    },
    {
      metricId: 'baseline_completion_rate',
      value: percentRate(patientsWithBaseline, patientCount),
      numerator: patientsWithBaseline,
      denominator: patientCount,
      suppressed: false,
    },
    {
      metricId: 'median_symptom_total_7d',
      value: shouldSuppress(allSymptomTotals7d.length)
        ? null
        : median(allSymptomTotals7d),
      numerator: allSymptomTotals7d.length,
      denominator: allSymptomTotals7d.length,
      suppressed: shouldSuppress(allSymptomTotals7d.length),
    },
    {
      metricId: 'danger_sign_report_rate',
      value: percentRate(dangerSignCheckIns, checkIns30d),
      numerator: dangerSignCheckIns,
      denominator: checkIns30d,
      suppressed: shouldSuppress(checkIns30d),
    },
    {
      metricId: 'data_completeness_exposure_30d',
      value: percentRate(patientsWithExposure30d, patientCount),
      numerator: patientsWithExposure30d,
      denominator: patientCount,
      suppressed: false,
    },
    {
      metricId: 'active_alert_rate',
      value: percentRate(patientsWithActiveAlert, patientCount),
      numerator: patientsWithActiveAlert,
      denominator: patientCount,
      suppressed: false,
    },
  ]

  return {
    patientCount,
    suppressed: false,
    metrics,
  }
}

export interface SegmentBreakdown {
  segmentType: 'ageBand' | 'episodeDurationBand' | 'engagementTier' | 'programPathway'
  label: string
  count: number
  suppressed: boolean
}

export function buildSegmentBreakdowns(
  cells: DimensionalCell[]
): SegmentBreakdown[] {
  const segments: SegmentBreakdown[] = []

  const segmentTypes: Array<{
    type: SegmentBreakdown['segmentType']
    labels: Record<string, string>
    accessor: (c: DimensionalCell) => string
  }> = [
    {
      type: 'ageBand',
      labels: {
        '13-17': '13–17',
        '18-24': '18–24',
        '25-39': '25–39',
        '40-54': '40–54',
        '55-plus': '55+',
        unknown: 'Not reported',
      },
      accessor: c => c.ageBand,
    },
    {
      type: 'episodeDurationBand',
      labels: {
        '0-7d': '0–7 days',
        '8-14d': '8–14 days',
        '15-30d': '15–30 days',
        '31-90d': '31–90 days',
        '91d-plus': '91+ days',
        unknown: 'Unknown duration',
      },
      accessor: c => c.episodeDurationBand,
    },
    {
      type: 'engagementTier',
      labels: {
        high: 'High (5+ check-ins/7d)',
        moderate: 'Moderate (3–4 check-ins/7d)',
        low: 'Low (1–2 check-ins/7d)',
        none: 'None (0 check-ins/7d)',
      },
      accessor: c => c.engagementTier,
    },
    {
      type: 'programPathway',
      labels: {},
      accessor: c => c.programPathway,
    },
  ]

  for (const { type, labels, accessor } of segmentTypes) {
    const counts = new Map<string, number>()
    for (const cell of cells) {
      const key = accessor(cell)
      counts.set(key, (counts.get(key) ?? 0) + cell.patientCount)
    }
    for (const [key, count] of counts.entries()) {
      segments.push({
        segmentType: type,
        label: labels[key] ?? key,
        count,
        suppressed: shouldSuppress(count),
      })
    }
  }

  return segments.sort((a, b) => {
    if (a.segmentType !== b.segmentType) return a.segmentType.localeCompare(b.segmentType)
    return b.count - a.count
  })
}

export function detectDataSource(
  patients: Doc<'patients'>[],
  episodes: Doc<'recoveryEpisodes'>[]
): 'live' | 'simulated' {
  const hasSimulatedMarker =
    patients.some(p => p.notes?.includes('[SIMULATED DEMO]')) ||
    episodes.some(e => e.injuryContext.includes('[SIMULATED DEMO]'))
  return hasSimulatedMarker ? 'simulated' : 'live'
}
