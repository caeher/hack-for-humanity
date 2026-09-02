import { sanitizeInput, validateDateString, validateScore } from './businessLogic'

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

export const SYMPTOMS_WORSENED_VALUES = ['yes', 'no', 'not_sure', 'not_applicable'] as const
export type SymptomsWorsened = (typeof SYMPTOMS_WORSENED_VALUES)[number]

export const EXPOSURE_NOTE_MAX_LENGTH = 250

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export interface ExposureEntryArgs {
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

export interface ValidatedExposureEntry {
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
  warnings: ExposureValidationWarning[]
}

function parseTimeToMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function minutesBetweenTimes(startTime: string, endTime: string): number | null {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start === null || end === null) return null
  if (end >= start) return end - start
  return 24 * 60 - start + end
}

function isValidActivityType(domain: ExposureDomain, activityType: string): boolean {
  return (EXPOSURE_ACTIVITY_TYPES[domain] as readonly string[]).includes(activityType)
}

function validateSymptomsWorsened(value: string): SymptomsWorsened {
  if (!(SYMPTOMS_WORSENED_VALUES as readonly string[]).includes(value)) {
    throw new Error('Invalid symptom response value.')
  }
  return value as SymptomsWorsened
}

function validateDomain(value: string): ExposureDomain {
  if (!(EXPOSURE_DOMAINS as readonly string[]).includes(value)) {
    throw new Error('Invalid exposure category.')
  }
  return value as ExposureDomain
}

export function validateExposureEntryInput(
  raw: ExposureEntryArgs,
  existingEntries: Array<{ startTime?: string; endTime?: string }> = []
): ValidatedExposureEntry {
  const warnings: ExposureValidationWarning[] = []
  const domain = validateDomain(raw.domain)
  const symptomsWorsened = validateSymptomsWorsened(raw.symptomsWorsened)

  if (!isValidActivityType(domain, raw.activityType)) {
    throw new Error('Invalid activity type for the selected category.')
  }

  let durationMinutes = raw.durationMinutes
  let intensity = raw.intensity
  let sleepHours = raw.sleepHours
  let sleepQuality = raw.sleepQuality
  let startTime = raw.startTime?.trim()
  let endTime = raw.endTime?.trim()
  let symptomOnsetMinutes = raw.symptomOnsetMinutes
  let symptomMagnitude = raw.symptomMagnitude
  let symptomRecoveryMinutes = raw.symptomRecoveryMinutes

  if (domain === 'sleep') {
    if (sleepHours === undefined || sleepHours === null) {
      throw new Error('Sleep duration is required.')
    }
    validateScore(sleepHours, 0.25, 24)
    if (sleepQuality !== undefined) {
      validateScore(sleepQuality, 0, 10)
    }
    durationMinutes = undefined
    intensity = undefined
    if (symptomsWorsened === 'not_applicable') {
      // expected for sleep
    }
  } else {
    if (durationMinutes === undefined || durationMinutes === null) {
      throw new Error('Duration in minutes is required.')
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      throw new Error('Duration must be an integer between 1 and 1440 minutes.')
    }
    if (intensity !== undefined) {
      validateScore(intensity, 0, 10)
    }
    sleepHours = undefined
    sleepQuality = undefined
  }

  if (startTime) {
    if (!TIME_PATTERN.test(startTime)) {
      throw new Error('Start time must use HH:MM format (24-hour).')
    }
  } else {
    startTime = undefined
  }

  if (endTime) {
    if (!TIME_PATTERN.test(endTime)) {
      throw new Error('End time must use HH:MM format (24-hour).')
    }
  } else {
    endTime = undefined
  }

  if (startTime && endTime) {
    const span = minutesBetweenTimes(startTime, endTime)
    if (span === null || span <= 0) {
      throw new Error('End time must be after start time.')
    }
    if (
      domain !== 'sleep' &&
      durationMinutes !== undefined &&
      Math.abs(span - durationMinutes) > 15
    ) {
      warnings.push({
        code: 'duration_mismatch',
        message: 'Duration does not match start/end time span.',
      })
    }
  }

  if (symptomsWorsened === 'yes') {
    if (symptomOnsetMinutes !== undefined) {
      validateScore(symptomOnsetMinutes, 0, 1440)
    }
    if (symptomMagnitude !== undefined) {
      if (!Number.isInteger(symptomMagnitude) || symptomMagnitude < 0 || symptomMagnitude > 6) {
        throw new Error('Symptom magnitude must be an integer from 0 to 6.')
      }
    }
    if (symptomRecoveryMinutes !== undefined) {
      validateScore(symptomRecoveryMinutes, 0, 1440)
    }
  } else {
    symptomOnsetMinutes = undefined
    symptomMagnitude = undefined
    symptomRecoveryMinutes = undefined
  }

  let contextNote: string | undefined
  if (raw.contextNote) {
    const sanitized = sanitizeInput(raw.contextNote)
    if (sanitized.length > EXPOSURE_NOTE_MAX_LENGTH) {
      throw new Error(`Context note cannot exceed ${EXPOSURE_NOTE_MAX_LENGTH} characters.`)
    }
    contextNote = sanitized.length > 0 ? sanitized : undefined
  }

  if (startTime && endTime) {
    const newStart = parseTimeToMinutes(startTime)!
    const newEnd = parseTimeToMinutes(endTime)!
    const newEndAdjusted = newEnd <= newStart ? newEnd + 24 * 60 : newEnd

    for (const existing of existingEntries) {
      if (!existing.startTime || !existing.endTime) continue
      const exStart = parseTimeToMinutes(existing.startTime)
      const exEnd = parseTimeToMinutes(existing.endTime)
      if (exStart === null || exEnd === null) continue
      const exEndAdjusted = exEnd <= exStart ? exEnd + 24 * 60 : exEnd
      if (newStart < exEndAdjusted && newEndAdjusted > exStart) {
        warnings.push({
          code: 'overlapping_time',
          message: 'Time range overlaps another entry logged today.',
        })
        break
      }
    }
  }

  return {
    domain,
    activityType: raw.activityType,
    durationMinutes,
    intensity,
    startTime,
    endTime,
    symptomsWorsened,
    symptomOnsetMinutes,
    symptomMagnitude,
    symptomRecoveryMinutes,
    sleepHours,
    sleepQuality,
    contextNote,
    warnings,
  }
}

export interface DailyExposureRollup {
  cognitiveMinutes: number
  screenMinutes: number
  physicalExertionScore: number
  sleepHours: number
  sleepQuality: number
}

export function computeDailyRollup(
  entries: Array<{
    domain: ExposureDomain
    durationMinutes?: number
    intensity?: number
    sleepHours?: number
    sleepQuality?: number
  }>
): DailyExposureRollup {
  let cognitiveMinutes = 0
  let screenMinutes = 0
  let physicalExertionScore = 0
  let sleepHours = 0
  let sleepQuality = 0
  let sleepQualityCount = 0

  for (const entry of entries) {
    switch (entry.domain) {
      case 'screen':
        screenMinutes += entry.durationMinutes ?? 0
        break
      case 'cognitive':
      case 'work_school':
        cognitiveMinutes += entry.durationMinutes ?? 0
        break
      case 'physical':
        physicalExertionScore = Math.max(physicalExertionScore, entry.intensity ?? 0)
        break
      case 'sleep':
        sleepHours += entry.sleepHours ?? 0
        if (entry.sleepQuality !== undefined) {
          sleepQuality += entry.sleepQuality
          sleepQualityCount += 1
        }
        break
      default: {
        const _exhaustive: never = entry.domain
        void _exhaustive
      }
    }
  }

  return {
    cognitiveMinutes,
    screenMinutes,
    physicalExertionScore,
    sleepHours,
    sleepQuality: sleepQualityCount > 0 ? Math.round((sleepQuality / sleepQualityCount) * 10) / 10 : 0,
  }
}

export function validateExposureDate(date: string): string {
  return validateDateString(date, 'Exposure date')
}
