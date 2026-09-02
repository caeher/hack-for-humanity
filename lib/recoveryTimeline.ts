import type { SymptomDimensionId } from './symptomMethodology'
import { METHODOLOGY_COPY } from './symptomMethodology'

export const TIMELINE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'episode', label: 'Full episode' },
] as const

export type TimelineRangeKey = (typeof TIMELINE_RANGE_OPTIONS)[number]['value']

export const SYMPTOM_GROUP_OPTIONS = [
  { value: 'all', label: 'All symptoms (total 0–48)' },
  { value: 'headache', label: 'Headache (0–6)' },
  { value: 'vestibular', label: 'Vestibular — dizziness & nausea (0–12)' },
  { value: 'sensory', label: 'Sensory sensitivity (0–12)' },
  { value: 'cognitive_fatigue', label: 'Cognitive & fatigue (0–12)' },
  { value: 'sleep_related', label: 'Sleep difficulty (0–6)' },
] as const

export type SymptomGroupKey = (typeof SYMPTOM_GROUP_OPTIONS)[number]['value']

export const COMPARISON_VIEW_OPTIONS = [
  { value: 'symptoms_activity', label: 'Symptoms vs Activity' },
  { value: 'symptoms_sleep', label: 'Symptoms vs Sleep' },
  { value: 'symptoms_screen', label: 'Symptoms vs Screen Time' },
] as const

export type ComparisonViewKey = (typeof COMPARISON_VIEW_OPTIONS)[number]['value']

export const TIMELINE_EVENT_LABELS = {
  incident: 'Injury / incident',
  clinical_encounter: 'Clinical encounter',
  plan_change: 'Care plan update',
  amendment: 'Check-in amendment',
  safety_event: 'Safety event',
} as const

export type TimelineEventKind = keyof typeof TIMELINE_EVENT_LABELS

export const TIMELINE_COPY = {
  associationDisclaimer:
    'Observed relationships between symptoms and activity, sleep, or screen time reflect logged entries only. They are not diagnoses, causal findings, or treatment recommendations.',
  missingDataRule: METHODOLOGY_COPY.missingDataRule,
  noInterpolation: METHODOLOGY_COPY.noInterpolation,
  notRecoveryScore: METHODOLOGY_COPY.notRecoveryScore,
  tableCaption:
    'Daily symptom and exposure values from source records. Blank cells are missing data — not zero.',
} as const

export interface SymptomGroupDefinition {
  label: string
  shortLabel: string
  dimensions: readonly SymptomDimensionId[]
  maxValue: number
}

export const SYMPTOM_GROUP_DEFINITIONS: Record<SymptomGroupKey, SymptomGroupDefinition> = {
  all: {
    label: 'Patient-Reported Symptom Total',
    shortLabel: 'Symptom total',
    dimensions: [
      'headache',
      'dizziness',
      'nausea',
      'lightSensitivity',
      'noiseSensitivity',
      'fatigue',
      'concentration',
      'sleepDifficulty',
    ],
    maxValue: 48,
  },
  headache: {
    label: 'Headache rating',
    shortLabel: 'Headache',
    dimensions: ['headache'],
    maxValue: 6,
  },
  vestibular: {
    label: 'Vestibular symptoms',
    shortLabel: 'Vestibular',
    dimensions: ['dizziness', 'nausea'],
    maxValue: 12,
  },
  sensory: {
    label: 'Sensory sensitivity',
    shortLabel: 'Sensory',
    dimensions: ['lightSensitivity', 'noiseSensitivity'],
    maxValue: 12,
  },
  cognitive_fatigue: {
    label: 'Cognitive & fatigue',
    shortLabel: 'Cognitive/fatigue',
    dimensions: ['fatigue', 'concentration'],
    maxValue: 12,
  },
  sleep_related: {
    label: 'Sleep difficulty',
    shortLabel: 'Sleep difficulty',
    dimensions: ['sleepDifficulty'],
    maxValue: 6,
  },
}

export interface ComparisonViewDefinition {
  label: string
  exposureLabel: string
  exposureShortLabel: string
  exposureMax: number
  formatExposureValue: (value: number) => string
}

export const COMPARISON_VIEW_DEFINITIONS: Record<ComparisonViewKey, ComparisonViewDefinition> = {
  symptoms_activity: {
    label: 'Symptoms vs Activity',
    exposureLabel: 'Physical exertion score',
    exposureShortLabel: 'Activity',
    exposureMax: 10,
    formatExposureValue: value => `${value}/10`,
  },
  symptoms_sleep: {
    label: 'Symptoms vs Sleep',
    exposureLabel: 'Sleep duration (hours)',
    exposureShortLabel: 'Sleep',
    exposureMax: 12,
    formatExposureValue: value => {
      const hours = Math.floor(value)
      const minutes = Math.round((value - hours) * 60)
      return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
    },
  },
  symptoms_screen: {
    label: 'Symptoms vs Screen Time',
    exposureLabel: 'Screen time (minutes)',
    exposureShortLabel: 'Screen',
    exposureMax: 720,
    formatExposureValue: value => `${Math.round(value)} min`,
  },
}

export interface TimelineDayPoint {
  date: string
  dayLabel: string
  symptomValue: number | null
  exposureValue: number | null
  checkInId: string | null
  exposureId: string | null
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

export function computeSymptomGroupValue(
  symptoms: Record<SymptomDimensionId, number>,
  group: SymptomGroupKey
): number {
  const definition = SYMPTOM_GROUP_DEFINITIONS[group]
  return definition.dimensions.reduce((sum, dimension) => sum + (symptoms[dimension] ?? 0), 0)
}

export function formatTimelineDateLabel(date: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year!, month! - 1, day!))
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(utcDate)
}

export function formatSymptomValue(value: number | null, group: SymptomGroupKey): string {
  if (value === null) return '—'
  const { maxValue } = SYMPTOM_GROUP_DEFINITIONS[group]
  return `${value} / ${maxValue}`
}

export function formatExposureCellValue(
  value: number | null,
  view: ComparisonViewKey
): string {
  if (value === null) return '—'
  return COMPARISON_VIEW_DEFINITIONS[view].formatExposureValue(value)
}
