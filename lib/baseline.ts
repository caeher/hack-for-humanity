/**
 * Shared constants and types for the initial recovery assessment (Phase 1 baseline).
 * Non-diagnostic: captures patient-reported context and symptom severity only.
 */

import type { DiagnosisStatus } from '@/lib/onboarding'

export type BaselineSymptomId =
  | 'headache'
  | 'dizziness'
  | 'nausea'
  | 'lightSensitivity'
  | 'noiseSensitivity'
  | 'fatigue'
  | 'concentration'
  | 'sleepDifficulty'

export type SkippableBaselineFieldId =
  | 'careReceived'
  | 'sleepHours'
  | 'schoolWorkDemand'
  | 'physicalActivityLevel'
  | 'cognitiveActivityLevel'
  | 'screenTolerance'

export interface SkippedField {
  fieldId: SkippableBaselineFieldId
  reason: string
}

export interface BaselineSymptomsDraft {
  headache?: number
  dizziness?: number
  nausea?: number
  lightSensitivity?: number
  noiseSensitivity?: number
  fatigue?: number
  concentration?: number
  sleepDifficulty?: number
}

export interface BaselineAssessmentDraft {
  step: number
  startedAt?: number
  incidentDate?: string
  incidentContext?: string
  careReceived?: string
  diagnosisStatus?: DiagnosisStatus
  symptoms?: BaselineSymptomsDraft
  sleepHours?: number
  schoolWorkDemand?: number
  physicalActivityLevel?: number
  cognitiveActivityLevel?: number
  screenTolerance?: number
  skippedFields?: SkippedField[]
  dangerSigns?: string[]
}

export const BASELINE_ASSESSMENT_STEP_COUNT = 6

export const BASELINE_SYMPTOM_SCALE_MIN = 0
export const BASELINE_SYMPTOM_SCALE_MAX = 6
export const BASELINE_DEMAND_SCALE_MIN = 0
export const BASELINE_DEMAND_SCALE_MAX = 6
export const BASELINE_SLEEP_HOURS_MIN = 0
export const BASELINE_SLEEP_HOURS_MAX = 24
export const BASELINE_COMPLETION_TARGET_MS = 5 * 60 * 1000

export const BASELINE_SYMPTOM_QUESTIONS: ReadonlyArray<{
  id: BaselineSymptomId
  title: string
  sub: string
  whyItMatters: string
}> = [
  {
    id: 'headache',
    title: 'Headache',
    sub: 'Rate headache severity right now (or over the past 24 hours).',
    whyItMatters:
      'Headache is one of the most commonly reported symptoms after a head injury and helps establish your starting point.',
  },
  {
    id: 'dizziness',
    title: 'Dizziness or balance',
    sub: 'Rate dizziness, unsteadiness, or trouble with balance.',
    whyItMatters:
      'Balance-related symptoms can affect pacing for school, work, and daily movement.',
  },
  {
    id: 'nausea',
    title: 'Nausea',
    sub: 'Rate nausea, with or without vomiting.',
    whyItMatters: 'Nausea patterns help your care team notice changes that may need follow-up.',
  },
  {
    id: 'lightSensitivity',
    title: 'Light sensitivity',
    sub: 'Rate discomfort from indoor lights, sunlight, or screens.',
    whyItMatters: 'Light sensitivity often guides screen-time and environment adjustments.',
  },
  {
    id: 'noiseSensitivity',
    title: 'Noise sensitivity',
    sub: 'Rate discomfort from conversations, traffic, or crowded spaces.',
    whyItMatters: 'Noise sensitivity can inform cognitive load and return-to-school planning.',
  },
  {
    id: 'fatigue',
    title: 'Fatigue or low energy',
    sub: 'Rate how tired or drained you feel compared with your usual day.',
    whyItMatters: 'Fatigue is a core recovery domain tracked over time — not a composite index.',
  },
  {
    id: 'concentration',
    title: 'Concentration difficulty',
    sub: 'Rate difficulty reading, working, studying, or following conversations.',
    whyItMatters: 'Cognitive symptoms help structure pacing — CRI does not clear you for school or work.',
  },
  {
    id: 'sleepDifficulty',
    title: 'Sleep difficulty',
    sub: 'Rate trouble falling asleep, staying asleep, or sleeping more than usual.',
    whyItMatters: 'Sleep changes are common after head injury and affect daily planning.',
  },
] as const

export const BASELINE_DANGER_SIGNS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'worsening-headache', label: 'A headache that is getting worse and does not go away' },
  { id: 'repeated-vomiting', label: 'Repeated vomiting' },
  { id: 'seizure', label: 'A seizure or convulsion' },
  { id: 'slurred-speech', label: 'Slurred speech or unusual behavior' },
  { id: 'confusion', label: 'Increasing confusion, restlessness, or agitation' },
  { id: 'weakness', label: 'Weakness, numbness, or decreased coordination' },
  { id: 'unequal-pupils', label: 'One pupil larger than the other' },
  {
    id: 'cannot-wake',
    label: 'Extreme drowsiness, loss of consciousness, or difficulty waking up',
  },
  { id: 'neck-pain', label: 'Severe neck pain or tenderness' },
  { id: 'fluid-bleeding', label: 'Clear fluid or bleeding from the nose or ears' },
] as const

export const SKIPPABLE_BASELINE_FIELDS: ReadonlyArray<{
  id: SkippableBaselineFieldId
  label: string
  whyItMatters: string
}> = [
  {
    id: 'careReceived',
    label: 'Care already received',
    whyItMatters:
      'Knowing whether you visited urgent care, the ER, or a clinician helps organize your timeline — it is not a diagnosis.',
  },
  {
    id: 'sleepHours',
    label: 'Typical sleep (hours per night)',
    whyItMatters: 'Sleep patterns provide context for symptom fluctuations over the coming days.',
  },
  {
    id: 'schoolWorkDemand',
    label: 'School or work demands',
    whyItMatters:
      'Current academic or work load helps frame pacing — CRI does not clear return to school or work.',
  },
  {
    id: 'physicalActivityLevel',
    label: 'Physical activity level',
    whyItMatters: 'Activity context supports symptom-guided pacing, not activity clearance.',
  },
  {
    id: 'cognitiveActivityLevel',
    label: 'Cognitive activity level',
    whyItMatters: 'Mental exertion context helps you and your clinician review patterns over time.',
  },
  {
    id: 'screenTolerance',
    label: 'Screen tolerance',
    whyItMatters: 'Screen exposure is commonly tracked alongside headache and fatigue symptoms.',
  },
] as const

export const BASELINE_SYMPTOM_MARKS = [
  { value: 0, label: 'None' },
  { value: 2, label: 'Mild' },
  { value: 4, label: 'Moderate' },
  { value: 6, label: 'Severe' },
] as const

export const BASELINE_DEMAND_MARKS = [
  { value: 0, label: 'None / resting' },
  { value: 3, label: 'Moderate' },
  { value: 6, label: 'High demand' },
] as const

export function getPostBaselineRoute(): string {
  return '/patient/check-in'
}

export function isLikertInRange(value: number, min = BASELINE_SYMPTOM_SCALE_MIN, max = BASELINE_SYMPTOM_SCALE_MAX): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}
