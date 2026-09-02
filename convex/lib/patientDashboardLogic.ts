import type { Doc } from '../_generated/dataModel'
import { computeDaysSinceIncident } from './baselineLogic'
import { addDaysToIsoDate, compareIsoDates } from './checkInHistoryLogic'
import {
  detectLongitudinalPatterns,
  toDashboardInsight,
  type CheckInObservation,
  type ExposureObservation,
} from './patternDetection'
import { buildPatternInsightProvenance } from './provenance'

export interface ChartPoint {
  date: string
  dayLabel: string
  symptomBurden: number
  headache: number
}

export interface CheckInConsistency {
  recordedDays: number
  eligibleDays: number
  ratePercent: number | null
  detail: string
}

export interface DashboardInsight {
  status: 'available' | 'insufficient'
  title: string
  description: string
  footer: string
  generatedAt: string | null
  sourceRecordCount: number
  provenance: ReturnType<typeof buildPatternInsightProvenance>
}

export interface SafetyEscalation {
  status: Doc<'safetyEvaluations'>['status']
  headline: string
  guidance: string
  evaluationId: Doc<'safetyEvaluations'>['_id']
  createdAt: number
  requiresAcknowledgement: boolean
}

const SAFETY_ESCALATION_STATUSES = new Set<Doc<'safetyEvaluations'>['status']>([
  'emergency',
  'elevated',
  'review',
  'warning',
])

export function countEligibleEpisodeDays(startDate: string, today: string): number {
  if (compareIsoDates(today, startDate) < 0) return 0
  let count = 0
  let current = startDate
  while (compareIsoDates(current, today) <= 0) {
    count += 1
    current = addDaysToIsoDate(current, 1)
  }
  return count
}

export function computeCheckInConsistency(
  startDate: string,
  today: string,
  checkInDates: string[]
): CheckInConsistency {
  const uniqueDates = new Set(checkInDates)
  const eligibleDays = countEligibleEpisodeDays(startDate, today)
  const recordedDays = uniqueDates.size

  if (eligibleDays === 0) {
    return {
      recordedDays,
      eligibleDays: 0,
      ratePercent: null,
      detail: 'Tracking has not started yet',
    }
  }

  const ratePercent = Math.round((recordedDays / eligibleDays) * 100)
  return {
    recordedDays,
    eligibleDays,
    ratePercent,
    detail: `${recordedDays} of ${eligibleDays} days logged`,
  }
}

export function formatShortDayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  const [year, month, day] = date.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year!, month! - 1, day!))
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    utcDate
  )
}

export function buildChartPoints(
  checkIns: Array<{
    date: string
    symptomTotal: number
    symptoms: { headache: number }
  }>,
  today: string,
  windowDays = 7
): ChartPoint[] {
  const windowStart = addDaysToIsoDate(today, -(windowDays - 1))
  const byDate = new Map<string, (typeof checkIns)[number]>()

  for (const checkIn of checkIns) {
    if (
      compareIsoDates(checkIn.date, windowStart) >= 0 &&
      compareIsoDates(checkIn.date, today) <= 0
    ) {
      byDate.set(checkIn.date, checkIn)
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => compareIsoDates(a, b))
    .map(([date, checkIn]) => ({
      date,
      dayLabel: formatShortDayLabel(date, today),
      symptomBurden: checkIn.symptomTotal,
      headache: checkIn.symptoms.headache,
    }))
}

export function findNextEncounter(
  encounters: Doc<'clinicalEncounters'>[],
  today: string
): Doc<'clinicalEncounters'> | null {
  const upcoming = encounters
    .filter(encounter => encounter.datetime.slice(0, 10) >= today)
    .sort((a, b) => a.datetime.localeCompare(b.datetime))

  return upcoming[0] ?? null
}

export function resolveSafetyEscalation(
  evaluation: Doc<'safetyEvaluations'> | null
): SafetyEscalation | null {
  if (!evaluation || !SAFETY_ESCALATION_STATUSES.has(evaluation.status)) {
    return null
  }

  const requiresAcknowledgement = evaluation.acknowledgedAt === undefined

  switch (evaluation.status) {
    case 'emergency':
      return {
        status: evaluation.status,
        headline: 'Emergency safety guidance is active',
        guidance:
          evaluation.matchedEvidenceSummary[0] ??
          'Seek emergency care immediately if danger signs are present.',
        evaluationId: evaluation._id,
        createdAt: evaluation.createdAt,
        requiresAcknowledgement,
      }
    case 'elevated':
      return {
        status: evaluation.status,
        headline: 'Elevated safety review recommended',
        guidance:
          evaluation.matchedEvidenceSummary[0] ??
          'Contact your care team before resuming routine activities.',
        evaluationId: evaluation._id,
        createdAt: evaluation.createdAt,
        requiresAcknowledgement,
      }
    case 'review':
      return {
        status: evaluation.status,
        headline: 'Professional review suggested',
        guidance:
          evaluation.matchedEvidenceSummary[0] ??
          'Discuss recent symptom changes with a clinician.',
        evaluationId: evaluation._id,
        createdAt: evaluation.createdAt,
        requiresAcknowledgement,
      }
    case 'warning':
      return {
        status: evaluation.status,
        headline: 'Monitor symptoms closely',
        guidance:
          evaluation.matchedEvidenceSummary[0] ??
          'Recent entries suggest closer monitoring may be helpful.',
        evaluationId: evaluation._id,
        createdAt: evaluation.createdAt,
        requiresAcknowledgement,
      }
    default:
      return null
  }
}

export function deriveSleepHeadacheInsight(
  checkIns: Array<{ date: string; symptoms: { headache: number; dizziness: number; concentration: number }; symptomTotal: number }>,
  exposures: Array<{
    date: string
    sleepHours: number
    screenMinutes: number
    physicalExertionScore: number
    cognitiveMinutes: number
  }>,
  today: string
): DashboardInsight {
  const checkInObservations: CheckInObservation[] = checkIns.map(checkIn => ({
    date: checkIn.date,
    symptomTotal: checkIn.symptomTotal,
    symptoms: {
      headache: checkIn.symptoms.headache,
      dizziness: checkIn.symptoms.dizziness,
      concentration: checkIn.symptoms.concentration,
    },
  }))

  const exposureObservations: ExposureObservation[] = exposures.map(exposure => ({
    date: exposure.date,
    sleepHours: exposure.sleepHours,
    screenMinutes: exposure.screenMinutes,
    physicalExertionScore: exposure.physicalExertionScore,
    cognitiveMinutes: exposure.cognitiveMinutes,
  }))

  const result = detectLongitudinalPatterns({
    checkIns: checkInObservations,
    exposures: exposureObservations,
    today,
  })

  return toDashboardInsight(result)
}

export function computeEpisodeDayNumber(incidentDate: string, today: string): number {
  return Math.max(1, computeDaysSinceIncident(incidentDate, Date.parse(`${today}T12:00:00.000Z`)) + 1)
}
