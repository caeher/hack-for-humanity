import type { Doc, Id } from '../_generated/dataModel'
import {
  addDaysToIsoDate,
  compareIsoDates,
  resolveEpisodeEndDate,
} from './checkInHistoryLogic'
import type { SymptomDimensionId } from './symptomMethodology'

export type TimelineRangeKey = '7' | '14' | '30' | 'episode'

export type SymptomGroupKey =
  | 'all'
  | 'headache'
  | 'vestibular'
  | 'sensory'
  | 'cognitive_fatigue'
  | 'sleep_related'

export type ComparisonViewKey = 'symptoms_activity' | 'symptoms_sleep' | 'symptoms_screen'

export type TimelineEventKind =
  | 'incident'
  | 'clinical_encounter'
  | 'plan_change'
  | 'amendment'
  | 'safety_event'

const SYMPTOM_GROUP_DIMENSIONS: Record<SymptomGroupKey, readonly SymptomDimensionId[]> = {
  all: [
    'headache',
    'dizziness',
    'nausea',
    'lightSensitivity',
    'noiseSensitivity',
    'fatigue',
    'concentration',
    'sleepDifficulty',
  ],
  headache: ['headache'],
  vestibular: ['dizziness', 'nausea'],
  sensory: ['lightSensitivity', 'noiseSensitivity'],
  cognitive_fatigue: ['fatigue', 'concentration'],
  sleep_related: ['sleepDifficulty'],
}

const SAFETY_EVENT_STATUSES = new Set<Doc<'safetyEvaluations'>['status']>([
  'warning',
  'review',
  'elevated',
  'emergency',
])

export interface TimelineDayPoint {
  date: string
  dayLabel: string
  symptomValue: number | null
  exposureValue: number | null
  checkInId: Id<'checkIns'> | null
  exposureId: Id<'activityExposures'> | null
}

export interface TimelineEventMarker {
  id: string
  date: string
  kind: TimelineEventKind
  title: string
  detail: string
  sourceType: string
  sourceId: string
}

export interface TimelineSummary {
  headline: string
  description: string
  loggedSymptomDays: number
  loggedExposureDays: number
  gapDays: number
  associationNote: string
}

export interface BuildTimelineArgs {
  range: TimelineRangeKey
  symptomGroup: SymptomGroupKey
  comparisonView: ComparisonViewKey
  today: string
  timeZone: string
  episode: Doc<'recoveryEpisodes'> | null
  checkIns: Doc<'checkIns'>[]
  exposures: Doc<'activityExposures'>[]
  encounters: Doc<'clinicalEncounters'>[]
  carePlans: Doc<'carePlans'>[]
  amendments: Doc<'checkInAmendments'>[]
  safetyEvaluations: Doc<'safetyEvaluations'>[]
}

function computeSymptomGroupValue(
  symptoms: Doc<'checkIns'>['symptoms'],
  group: SymptomGroupKey
): number {
  const dimensions = SYMPTOM_GROUP_DIMENSIONS[group]
  return dimensions.reduce((sum, dimension) => sum + symptoms[dimension], 0)
}

function getExposureValue(
  exposure: Doc<'activityExposures'>,
  view: ComparisonViewKey
): number {
  switch (view) {
    case 'symptoms_activity':
      return exposure.physicalExertionScore
    case 'symptoms_sleep':
      return exposure.sleepHours
    case 'symptoms_screen':
      return exposure.screenMinutes
    default: {
      const _exhaustive: never = view
      void _exhaustive
      return 0
    }
  }
}

function hasExposureRecord(exposure: Doc<'activityExposures'> | undefined): exposure is Doc<'activityExposures'> {
  return exposure !== undefined
}

export function resolveTimelineWindow(
  range: TimelineRangeKey,
  today: string,
  episode: Doc<'recoveryEpisodes'> | null
): { startDate: string; endDate: string } {
  const endDate = episode ? resolveEpisodeEndDate(episode, today) : today

  if (range === 'episode') {
    const startDate = episode?.incidentDate ?? episode?.startDate ?? addDaysToIsoDate(today, -29)
    return {
      startDate: compareIsoDates(startDate, endDate) <= 0 ? startDate : endDate,
      endDate,
    }
  }

  const days = Number(range)
  const startDate = addDaysToIsoDate(endDate, -(days - 1))
  const episodeStart = episode?.incidentDate ?? episode?.startDate
  if (episodeStart && compareIsoDates(startDate, episodeStart) < 0) {
    return { startDate: episodeStart, endDate }
  }
  return { startDate, endDate }
}

export function formatShortDayLabel(date: string, today: string, timeZone: string): string {
  if (date === today) return 'Today'
  const [year, month, day] = date.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year!, month! - 1, day!))
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(utcDate)
}

export function buildTimelineDayPoints(args: BuildTimelineArgs): TimelineDayPoint[] {
  const { startDate, endDate } = resolveTimelineWindow(args.range, args.today, args.episode)
  const checkInsByDate = new Map(args.checkIns.map(checkIn => [checkIn.date, checkIn]))
  const exposuresByDate = new Map(args.exposures.map(exposure => [exposure.date, exposure]))

  const points: TimelineDayPoint[] = []
  let current = startDate

  while (compareIsoDates(current, endDate) <= 0) {
    const checkIn = checkInsByDate.get(current)
    const exposure = exposuresByDate.get(current)

    let exposureValue: number | null = null
    if (hasExposureRecord(exposure)) {
      exposureValue = getExposureValue(exposure, args.comparisonView)
    }

    points.push({
      date: current,
      dayLabel: formatShortDayLabel(current, args.today, args.timeZone),
      symptomValue: checkIn ? computeSymptomGroupValue(checkIn.symptoms, args.symptomGroup) : null,
      exposureValue,
      checkInId: checkIn?._id ?? null,
      exposureId: exposure?._id ?? null,
    })

    current = addDaysToIsoDate(current, 1)
  }

  return points
}

export function buildTimelineEventMarkers(args: BuildTimelineArgs): TimelineEventMarker[] {
  const { startDate, endDate } = resolveTimelineWindow(args.range, args.today, args.episode)
  const markers: TimelineEventMarker[] = []

  const inWindow = (date: string) =>
    compareIsoDates(date, startDate) >= 0 && compareIsoDates(date, endDate) <= 0

  if (args.episode?.incidentDate && inWindow(args.episode.incidentDate)) {
    markers.push({
      id: `incident-${args.episode._id}`,
      date: args.episode.incidentDate,
      kind: 'incident',
      title: 'Injury / incident reported',
      detail: args.episode.injuryContext ?? 'Recovery episode started',
      sourceType: 'recoveryEpisodes',
      sourceId: args.episode._id,
    })
  }

  for (const encounter of args.encounters) {
    const date = encounter.datetime.slice(0, 10)
    if (!inWindow(date)) continue
    markers.push({
      id: `encounter-${encounter._id}`,
      date,
      kind: 'clinical_encounter',
      title: encounter.encounterType === 'telehealth' ? 'Telehealth visit' : 'Clinical encounter',
      detail: encounter.diagnosis,
      sourceType: 'clinicalEncounters',
      sourceId: encounter._id,
    })
  }

  const plansByDate = new Map<string, Doc<'carePlans'>[]>()
  for (const plan of args.carePlans) {
    const date = formatIsoDateFromTimestamp(plan.createdAt, args.timeZone)
    if (!inWindow(date)) continue
    const existing = plansByDate.get(date) ?? []
    existing.push(plan)
    plansByDate.set(date, existing)
  }

  for (const [date, plans] of plansByDate.entries()) {
    const titles = [...new Set(plans.map(plan => plan.title))].slice(0, 2)
    markers.push({
      id: `plan-${date}-${plans[0]!._id}`,
      date,
      kind: 'plan_change',
      title: 'Care plan update',
      detail:
        titles.length === 1
          ? titles[0]!
          : `${titles[0]} and ${plans.length - 1} more update${plans.length > 2 ? 's' : ''}`,
      sourceType: 'carePlans',
      sourceId: plans[0]!._id,
    })
  }

  for (const amendment of args.amendments) {
    const date = formatIsoDateFromTimestamp(amendment.createdAt, args.timeZone)
    if (!inWindow(date)) continue
    markers.push({
      id: `amendment-${amendment._id}`,
      date,
      kind: 'amendment',
      title: 'Check-in amended',
      detail: `Symptom total updated from ${amendment.originalSymptomTotal} to ${amendment.symptomTotal}`,
      sourceType: 'checkInAmendments',
      sourceId: amendment._id,
    })
  }

  for (const evaluation of args.safetyEvaluations) {
    if (!SAFETY_EVENT_STATUSES.has(evaluation.status)) continue
    const date = formatIsoDateFromTimestamp(evaluation.createdAt, args.timeZone)
    if (!inWindow(date)) continue
    markers.push({
      id: `safety-${evaluation._id}`,
      date,
      kind: 'safety_event',
      title: `Safety ${evaluation.status}`,
      detail:
        evaluation.matchedEvidenceSummary[0] ?? evaluation.primaryEscalation ?? 'Safety review recorded',
      sourceType: 'safetyEvaluations',
      sourceId: evaluation._id,
    })
  }

  return markers.sort((a, b) => compareIsoDates(a.date, b.date))
}

function formatIsoDateFromTimestamp(timestampMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestampMs))
}

export function buildTimelineSummary(
  points: TimelineDayPoint[],
  symptomGroup: SymptomGroupKey,
  comparisonView: ComparisonViewKey
): TimelineSummary {
  const loggedSymptomDays = points.filter(point => point.symptomValue !== null).length
  const loggedExposureDays = points.filter(point => point.exposureValue !== null).length
  const gapDays = points.filter(
    point => point.symptomValue === null && point.exposureValue === null
  ).length

  const symptomLabel = symptomGroup === 'all' ? 'symptom total' : 'symptom group total'
  const exposureLabels: Record<ComparisonViewKey, string> = {
    symptoms_activity: 'physical exertion',
    symptoms_sleep: 'sleep duration',
    symptoms_screen: 'screen time',
  }

  let headline = 'Longitudinal recovery view'
  let description = `Showing ${loggedSymptomDays} day${loggedSymptomDays === 1 ? '' : 's'} with logged ${symptomLabel} and ${loggedExposureDays} day${loggedExposureDays === 1 ? '' : 's'} with ${exposureLabels[comparisonView]} data.`

  if (loggedSymptomDays === 0 && loggedExposureDays === 0) {
    headline = 'No logged data in this range'
    description =
      'Complete daily check-ins and exposure logs to populate this timeline. Missing days remain blank — never shown as zero.'
  } else if (gapDays > 0) {
    description += ` ${gapDays} calendar day${gapDays === 1 ? '' : 's'} have no symptom or exposure records and are shown as gaps.`
  }

  const symptomValues = points
    .map(point => point.symptomValue)
    .filter((value): value is number => value !== null)
  if (symptomValues.length >= 2) {
    const first = symptomValues[0]!
    const last = symptomValues[symptomValues.length - 1]!
    const delta = last - first
    if (delta !== 0) {
      description += ` ${symptomLabel.charAt(0).toUpperCase()}${symptomLabel.slice(1)} moved from ${first} to ${last} across logged days — a within-person descriptive change, not a prognosis.`
    }
  }

  return {
    headline,
    description,
    loggedSymptomDays,
    loggedExposureDays,
    gapDays,
    associationNote:
      'Temporal associations between symptoms and lifestyle context do not establish medical causation or diagnosis.',
  }
}
