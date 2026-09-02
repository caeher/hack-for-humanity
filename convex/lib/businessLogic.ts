/**
 * Pure, database-independent business logic functions for Concussion Recovery Intelligence.
 * Keeps function handlers thin and ensures easy unit testing.
 */

export interface ConcussionSymptoms {
  headache: number
  dizziness: number
  nausea: number
  lightSensitivity: number
  noiseSensitivity: number
  fatigue: number
  concentration: number
  sleepDifficulty: number
}

export const CDC_DANGER_SIGNS = [
  'Worsening headache that does not go away',
  'Repeated vomiting or nausea',
  'Seizures or convulsions',
  'Slurred speech, weakness, numbness, or decreased coordination',
  'Increasing confusion, restlessness, or agitation',
  'One pupil larger than the other',
  'Extreme drowsiness, loss of consciousness, or inability to wake up',
  'Unusual behavior',
] as const

/**
 * Validates 8-symptom Likert inventory (0 to 6 per symptom dimension).
 * Returns the computed total (0 to 48).
 */
export function validateConcussionSymptoms(symptoms: ConcussionSymptoms): number {
  const fields: (keyof ConcussionSymptoms)[] = [
    'headache',
    'dizziness',
    'nausea',
    'lightSensitivity',
    'noiseSensitivity',
    'fatigue',
    'concentration',
    'sleepDifficulty',
  ]

  let total = 0
  for (const field of fields) {
    const val = symptoms[field]
    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error(`Invalid rating for ${field}: must be a number.`)
    }
    if (val < 0 || val > 6 || !Number.isInteger(val)) {
      throw new Error(`Rating for ${field} (${val}) out of bounds: must be an integer between 0 and 6.`)
    }
    total += val
  }

  return total
}

/**
 * Validates recovery symptom total (0 to 48 for concussion symptom total, or up to 100 for percentage metrics).
 */
export function validateScore(score: number, min = 0, max = 48): void {
  if (typeof score !== 'number' || isNaN(score) || score < min || score > max) {
    throw new Error(`Score (${score}) must be a number between ${min} and ${max}.`)
  }
}

/**
 * Validates adherence percentage (0 to 100).
 */
export function validateAdherence(adherence: number): void {
  if (typeof adherence !== 'number' || isNaN(adherence) || adherence < 0 || adherence > 100) {
    throw new Error(`Adherence (${adherence}) must be a number between 0 and 100.`)
  }
}

/**
 * Validates string length and non-emptiness.
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  min = 1,
  max = 1000
): string {
  const trimmed = (value ?? '').trim()
  if (trimmed.length < min) {
    throw new Error(`${fieldName} cannot be empty and must be at least ${min} characters.`)
  }
  if (trimmed.length > max) {
    throw new Error(`${fieldName} exceeds maximum permitted length of ${max} characters.`)
  }
  return trimmed
}

/**
 * Basic email format verification.
 */
export function validateEmail(email: string): string {
  const trimmed = (email ?? '').trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    throw new Error(`Invalid email address format: "${email}".`)
  }
  if (trimmed.length > 254) {
    throw new Error('Email address too long.')
  }
  return trimmed
}

/**
 * Validates a date string (e.g. YYYY-MM-DD or standard ISO date string).
 */
export function validateDateString(dateStr: string, fieldName = 'date'): string {
  const trimmed = (dateStr ?? '').trim()
  if (!trimmed) {
    throw new Error(`${fieldName} must not be empty.`)
  }
  const timestamp = Date.parse(trimmed)
  if (isNaN(timestamp) && !/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    throw new Error(`Invalid date format for ${fieldName}: "${dateStr}".`)
  }
  return trimmed
}

/**
 * Sanitizes input string by trimming and removing potential control characters.
 */
export function sanitizeInput(text: string): string {
  if (!text) return ''
  return text.trim().replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
}

