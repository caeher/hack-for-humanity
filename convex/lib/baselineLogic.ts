/**
 * Pure validation and computation helpers for initial recovery baseline assessments.
 */

import type { ConcussionSymptoms } from './businessLogic'
import { validateConcussionSymptoms, validateDateString, validateStringLength, sanitizeInput } from './businessLogic'

export const BASELINE_SLEEP_HOURS_MIN = 0
export const BASELINE_SLEEP_HOURS_MAX = 24
export const BASELINE_DEMAND_SCALE_MIN = 0
export const BASELINE_DEMAND_SCALE_MAX = 6

export type SkippableBaselineFieldId =
  | 'careReceived'
  | 'sleepHours'
  | 'schoolWorkDemand'
  | 'physicalActivityLevel'
  | 'cognitiveActivityLevel'
  | 'screenTolerance'

export interface SkippedFieldInput {
  fieldId: string
  reason: string
}

const SKIPPABLE_FIELD_IDS = new Set<string>([
  'careReceived',
  'sleepHours',
  'schoolWorkDemand',
  'physicalActivityLevel',
  'cognitiveActivityLevel',
  'screenTolerance',
])

export function validateOptionalLikert(
  value: number | undefined,
  fieldName: string,
  min = BASELINE_DEMAND_SCALE_MIN,
  max = BASELINE_DEMAND_SCALE_MAX
): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${fieldName} must be an integer between ${min} and ${max}.`)
  }
  return value
}

export function validateOptionalSleepHours(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || Number.isNaN(value) || value < BASELINE_SLEEP_HOURS_MIN || value > BASELINE_SLEEP_HOURS_MAX) {
    throw new Error(`Sleep hours must be a number between ${BASELINE_SLEEP_HOURS_MIN} and ${BASELINE_SLEEP_HOURS_MAX}.`)
  }
  return value
}

export function validateSkippedFields(
  skippedFields: SkippedFieldInput[],
  provided: {
    careReceived?: string
    sleepHours?: number
    schoolWorkDemand?: number
    physicalActivityLevel?: number
    cognitiveActivityLevel?: number
    screenTolerance?: number
  }
): SkippedFieldInput[] {
  const normalized: SkippedFieldInput[] = []

  for (const entry of skippedFields) {
    if (!SKIPPABLE_FIELD_IDS.has(entry.fieldId)) {
      throw new Error(`Field "${entry.fieldId}" cannot be skipped.`)
    }
    const reason = validateStringLength(entry.reason, `Skip reason for ${entry.fieldId}`, 3, 500)
    normalized.push({ fieldId: entry.fieldId, reason })
  }

  const skippedIds = new Set(normalized.map(entry => entry.fieldId))

  for (const fieldId of SKIPPABLE_FIELD_IDS) {
    const isSkipped = skippedIds.has(fieldId)
    const hasValue =
      fieldId === 'careReceived'
        ? Boolean(provided.careReceived?.trim())
        : provided[fieldId as keyof typeof provided] !== undefined

    if (isSkipped && hasValue) {
      throw new Error(`Cannot skip "${fieldId}" when a value is provided.`)
    }
    if (!isSkipped && fieldId !== 'careReceived' && provided[fieldId as keyof typeof provided] === undefined) {
      // Optional exertion fields may remain unset without an explicit skip.
    }
  }

  return normalized
}

export function computeSymptomTotalFromInventory(symptoms: ConcussionSymptoms): number {
  return validateConcussionSymptoms(symptoms)
}

export function validateBaselineIncidentContext(incidentContext: string): string {
  return validateStringLength(sanitizeInput(incidentContext), 'Incident context', 10, 2000)
}

export function validateBaselineCareReceived(careReceived: string | undefined): string | undefined {
  if (!careReceived) return undefined
  return validateStringLength(sanitizeInput(careReceived), 'Care already received', 3, 2000)
}

export function validateBaselineIncidentDate(incidentDate: string): string {
  return validateDateString(incidentDate, 'Incident date')
}

export function computeDaysSinceIncident(incidentDate: string, referenceMs: number): number {
  const incidentMs = Date.parse(incidentDate)
  if (Number.isNaN(incidentMs)) return 0
  const diffMs = Math.max(0, referenceMs - incidentMs)
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

export function validateCompletionDuration(durationMs: number): number {
  const maxDurationMs = 2 * 60 * 60 * 1000
  if (!Number.isInteger(durationMs) || durationMs < 0 || durationMs > maxDurationMs) {
    throw new Error('Completion duration must be a non-negative integer in milliseconds.')
  }
  return durationMs
}
