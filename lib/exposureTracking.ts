/**
 * Shared exposure-tracking types, controlled categories, and client-side validation.
 * Sleep is recorded as lifestyle context — not as a symptom score.
 */

export const EXPOSURE_DOMAINS = [
  'physical',
  'cognitive',
  'work_school',
  'screen',
  'sleep',
] as const

export type ExposureDomain = (typeof EXPOSURE_DOMAINS)[number]

export const EXPOSURE_ACTIVITY_TYPES: Record<ExposureDomain, readonly string[]> = {
  physical: [
    'light_walking',
    'moderate_exercise',
    'strenuous_activity',
    'sports',
    'household',
    'other',
  ],
  cognitive: ['reading', 'computer_work', 'meeting', 'studying', 'conversation', 'other'],
  work_school: ['classes', 'homework', 'work_meeting', 'commute', 'other'],
  screen: ['phone', 'computer', 'tv', 'gaming', 'other'],
  sleep: ['night_sleep', 'nap', 'other'],
}

export const EXPOSURE_DOMAIN_LABELS: Record<ExposureDomain, string> = {
  physical: 'Physical activity',
  cognitive: 'Cognitive load',
  work_school: 'Work or school',
  screen: 'Screen time',
  sleep: 'Sleep',
}

export const EXPOSURE_ACTIVITY_LABELS: Record<string, string> = {
  light_walking: 'Light walking',
  moderate_exercise: 'Moderate exercise',
  strenuous_activity: 'Strenuous activity',
  sports: 'Sports or practice',
  household: 'Household chores',
  reading: 'Reading',
  computer_work: 'Computer work',
  meeting: 'Meeting or call',
  studying: 'Studying',
  conversation: 'Conversation',
  classes: 'Classes',
  homework: 'Homework',
  work_meeting: 'Work meeting',
  commute: 'Commute',
  phone: 'Phone',
  computer: 'Computer or tablet',
  tv: 'TV',
  gaming: 'Gaming',
  night_sleep: 'Night sleep',
  nap: 'Nap',
  other: 'Other',
}

export const SYMPTOMS_WORSENED_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
  { value: 'not_applicable', label: 'Not applicable' },
] as const

export type SymptomsWorsened = (typeof SYMPTOMS_WORSENED_OPTIONS)[number]['value']

export const EXPOSURE_NOTE_MAX_LENGTH = 250

export const EXPOSURE_NOTE_PRIVACY_HINT =
  'Private note — visible to you and your authorized care team only.'

export interface ExposureEntryInput {
  domain: ExposureDomain
  activityType: string
  durationMinutes?: number
  intensity?: number
  startTime?: string
  endTime?: string
  symptomsWorsened: SymptomsWorsened
  symptomOnsetMinutes?: number
  symptomMagnitude?: number
  symptomRecoveryMinutes?: number
  sleepHours?: number
  sleepQuality?: number
  contextNote?: string
}

export interface ExposureValidationWarning {
  code: 'duration_mismatch' | 'overlapping_time' | 'impossible_duration'
  message: string
}

export interface ExposureValidationResult {
  valid: boolean
  errors: string[]
  warnings: ExposureValidationWarning[]
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function parseTimeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function minutesBetweenTimes(startTime: string, endTime: string): number | null {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start === null || end === null) return null
  if (end >= start) return end - start
  return 24 * 60 - start + end
}

export function isValidActivityType(domain: ExposureDomain, activityType: string): boolean {
  return (EXPOSURE_ACTIVITY_TYPES[domain] as readonly string[]).includes(activityType)
}

export function validateExposureEntry(
  entry: ExposureEntryInput,
  existingEntries: Array<{ startTime?: string; endTime?: string; domain: ExposureDomain }> = []
): ExposureValidationResult {
  const errors: string[] = []
  const warnings: ExposureValidationWarning[] = []

  if (!EXPOSURE_DOMAINS.includes(entry.domain)) {
    errors.push('Select a valid exposure category.')
  }

  if (!isValidActivityType(entry.domain, entry.activityType)) {
    errors.push('Select a valid activity type for this category.')
  }

  if (entry.domain === 'sleep') {
    if (entry.sleepHours === undefined || entry.sleepHours === null) {
      errors.push('Enter sleep duration in hours.')
    } else if (entry.sleepHours <= 0 || entry.sleepHours > 24) {
      errors.push('Sleep duration must be between 0 and 24 hours.')
    }
    if (entry.sleepQuality !== undefined) {
      if (entry.sleepQuality < 0 || entry.sleepQuality > 10) {
        errors.push('Sleep quality must be between 0 and 10.')
      }
    }
  } else {
    if (entry.durationMinutes === undefined || entry.durationMinutes === null) {
      errors.push('Enter duration in minutes.')
    } else if (entry.durationMinutes <= 0 || entry.durationMinutes > 1440) {
      errors.push('Duration must be between 1 and 1440 minutes.')
    }

    if (entry.intensity !== undefined) {
      if (entry.intensity < 0 || entry.intensity > 10) {
        errors.push('Perceived intensity must be between 0 and 10.')
      }
    }
  }

  if (entry.startTime && !TIME_PATTERN.test(entry.startTime)) {
    errors.push('Start time must use HH:MM format (24-hour).')
  }
  if (entry.endTime && !TIME_PATTERN.test(entry.endTime)) {
    errors.push('End time must use HH:MM format (24-hour).')
  }

  if (entry.startTime && entry.endTime) {
    const span = minutesBetweenTimes(entry.startTime, entry.endTime)
    if (span === null) {
      errors.push('Could not calculate time span from start and end times.')
    } else if (span <= 0) {
      errors.push('End time must be after start time.')
    } else if (
      entry.domain !== 'sleep' &&
      entry.durationMinutes !== undefined &&
      Math.abs(span - entry.durationMinutes) > 15
    ) {
      warnings.push({
        code: 'duration_mismatch',
        message:
          'Duration does not match the time between start and end. The entry will be saved using your entered duration.',
      })
    }
  }

  if (entry.symptomsWorsened === 'yes') {
    if (entry.symptomOnsetMinutes !== undefined) {
      if (entry.symptomOnsetMinutes < 0 || entry.symptomOnsetMinutes > 1440) {
        errors.push('Symptom onset must be between 0 and 1440 minutes after the activity.')
      }
    }
    if (entry.symptomMagnitude !== undefined) {
      if (!Number.isInteger(entry.symptomMagnitude) || entry.symptomMagnitude < 0 || entry.symptomMagnitude > 6) {
        errors.push('Symptom increase magnitude must be an integer from 0 to 6.')
      }
    }
    if (entry.symptomRecoveryMinutes !== undefined) {
      if (entry.symptomRecoveryMinutes < 0 || entry.symptomRecoveryMinutes > 1440) {
        errors.push('Symptom recovery duration must be between 0 and 1440 minutes.')
      }
    }
  }

  if (entry.contextNote && entry.contextNote.length > EXPOSURE_NOTE_MAX_LENGTH) {
    errors.push(`Context note cannot exceed ${EXPOSURE_NOTE_MAX_LENGTH} characters.`)
  }

  if (entry.startTime && entry.endTime) {
    const newStart = parseTimeToMinutes(entry.startTime)!
    const newEnd = parseTimeToMinutes(entry.endTime)!
    const newEndAdjusted = newEnd <= newStart ? newEnd + 24 * 60 : newEnd

    for (const existing of existingEntries) {
      if (!existing.startTime || !existing.endTime) continue
      const exStart = parseTimeToMinutes(existing.startTime)
      const exEnd = parseTimeToMinutes(existing.endTime)
      if (exStart === null || exEnd === null) continue
      const exEndAdjusted = exEnd <= exStart ? exEnd + 24 * 60 : exEnd

      const overlaps = newStart < exEndAdjusted && newEndAdjusted > exStart
      if (overlaps) {
        warnings.push({
          code: 'overlapping_time',
          message:
            'This time range overlaps another logged entry today. Both entries will be saved for your record.',
        })
        break
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

export function formatSleepHours(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  if (minutes === 0) return `${wholeHours}h`
  return `${wholeHours}h ${minutes}m`
}
