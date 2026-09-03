/**
 * Schema validation for recovery event extraction output.
 * Returns schema-valid candidates or a safe failure — never partial invalid data.
 */

import {
  EXPOSURE_ACTIVITY_TYPES,
  EXPOSURE_DOMAINS,
  type ExposureDomain,
} from '@/lib/exposureTracking'
import {
  CONCUSSION_SYMPTOM_FIELDS,
  type ConcussionSymptomField,
  type ExtractionActivity,
  type ExtractionDuration,
  type ExtractionSymptom,
  type ExtractionTiming,
  type RecoveryEventCandidate,
} from './types'

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export interface SchemaValidationResult {
  valid: boolean
  candidates: RecoveryEventCandidate[]
  rejectedCount: number
  errors: string[]
}

function isSymptomField(value: string): value is ConcussionSymptomField {
  return (CONCUSSION_SYMPTOM_FIELDS as readonly string[]).includes(value)
}

function isExposureDomain(value: string): value is ExposureDomain {
  return (EXPOSURE_DOMAINS as readonly string[]).includes(value)
}

function isValidActivityType(domain: ExposureDomain, activityType: string): boolean {
  return (EXPOSURE_ACTIVITY_TYPES[domain] as readonly string[]).includes(activityType)
}

export function validateSymptom(symptom: ExtractionSymptom | undefined): {
  valid: boolean
  symptom?: ExtractionSymptom
  error?: string
} {
  if (!symptom) return { valid: true }
  if (!isSymptomField(symptom.field)) {
    return { valid: false, error: `unsupported_symptom:${symptom.field}` }
  }
  if (symptom.severity !== undefined) {
    if (!Number.isInteger(symptom.severity) || symptom.severity < 0 || symptom.severity > 6) {
      return { valid: false, error: 'invalid_severity' }
    }
  }
  return { valid: true, symptom }
}

export function validateActivity(activity: ExtractionActivity | undefined): {
  valid: boolean
  activity?: ExtractionActivity
  rejected: boolean
  error?: string
} {
  if (!activity) return { valid: true, rejected: false }

  if (!isExposureDomain(activity.domain)) {
    return {
      valid: true,
      activity: { ...activity, rejected: true, uncertain: true },
      rejected: true,
      error: `unsupported_domain:${activity.domain}`,
    }
  }

  if (!isValidActivityType(activity.domain, activity.activityType)) {
    return {
      valid: true,
      activity: {
        ...activity,
        activityType: 'other',
        uncertain: true,
        rejected: true,
      },
      rejected: true,
      error: `unsupported_activity:${activity.activityType}`,
    }
  }

  return { valid: true, activity, rejected: false }
}

export function validateDuration(duration: ExtractionDuration | undefined): {
  valid: boolean
  duration?: ExtractionDuration
  error?: string
} {
  if (!duration) return { valid: true }
  if (duration.minutes !== undefined) {
    if (!Number.isFinite(duration.minutes) || duration.minutes < 0 || duration.minutes > 24 * 60) {
      return { valid: false, error: 'invalid_duration_minutes' }
    }
  }
  return { valid: true, duration }
}

export function validateTiming(timing: ExtractionTiming | undefined): {
  valid: boolean
  timing?: ExtractionTiming
  error?: string
} {
  if (!timing) return { valid: true }
  if (timing.timeOfDay && !TIME_PATTERN.test(timing.timeOfDay)) {
    return { valid: false, error: 'invalid_time_of_day' }
  }
  return { valid: true, timing }
}

export function validateCandidate(candidate: RecoveryEventCandidate): {
  valid: boolean
  candidate?: RecoveryEventCandidate
  rejected: boolean
  errors: string[]
} {
  const errors: string[] = []
  let rejected = false

  const symptomResult = validateSymptom(candidate.symptom)
  if (!symptomResult.valid) {
    errors.push(symptomResult.error ?? 'invalid_symptom')
    return { valid: false, rejected: false, errors }
  }

  const activityResult = validateActivity(candidate.activity)
  if (!activityResult.valid) {
    errors.push(activityResult.error ?? 'invalid_activity')
    return { valid: false, rejected: false, errors }
  }
  if (activityResult.rejected) rejected = true

  const durationResult = validateDuration(candidate.duration)
  if (!durationResult.valid) {
    errors.push(durationResult.error ?? 'invalid_duration')
    return { valid: false, rejected: false, errors }
  }

  const timingResult = validateTiming(candidate.timing)
  if (!timingResult.valid) {
    errors.push(timingResult.error ?? 'invalid_timing')
    return { valid: false, rejected: false, errors }
  }

  const hasContent =
    symptomResult.symptom !== undefined ||
    activityResult.activity !== undefined ||
    durationResult.duration !== undefined ||
    timingResult.timing !== undefined

  if (!hasContent) {
    errors.push('empty_candidate')
    return { valid: false, rejected: false, errors }
  }

  return {
    valid: true,
    candidate: {
      ...candidate,
      symptom: symptomResult.symptom,
      activity: activityResult.activity,
      duration: durationResult.duration,
      timing: timingResult.timing,
      uncertain: candidate.uncertain || rejected,
    },
    rejected,
    errors,
  }
}

export function validateExtractionOutput(
  candidates: RecoveryEventCandidate[]
): SchemaValidationResult {
  const validated: RecoveryEventCandidate[] = []
  const errors: string[] = []
  let rejectedCount = 0

  for (const candidate of candidates) {
    const result = validateCandidate(candidate)
    if (!result.valid) {
      errors.push(...result.errors)
      continue
    }
    if (result.rejected) rejectedCount++
    if (result.candidate) validated.push(result.candidate)
  }

  return {
    valid: validated.length > 0 || candidates.length === 0,
    candidates: validated,
    rejectedCount,
    errors,
  }
}
