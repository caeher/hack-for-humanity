/**
 * Pure, database-independent business logic functions.
 * Keeps function handlers thin and ensures easy unit testing.
 */

export interface CheckInScores {
  painScore: number
  sleepScore: number
  mobilityScore: number
  emotionalScore: number
}

/**
 * Validates check-in symptom scores.
 * Concussion recovery check-ins measure 0-6 severity per category (or 0-10 max scale).
 */
export function validateCheckInScores(scores: CheckInScores): void {
  const { painScore, sleepScore, mobilityScore, emotionalScore } = scores

  const fields = [
    { name: 'painScore', val: painScore },
    { name: 'sleepScore', val: sleepScore },
    { name: 'mobilityScore', val: mobilityScore },
    { name: 'emotionalScore', val: emotionalScore },
  ]

  for (const { name, val } of fields) {
    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error(`Invalid score for ${name}: must be a valid number.`)
    }
    if (val < 0 || val > 10) {
      throw new Error(`Score for ${name} (${val}) out of bounds: must be between 0 and 10.`)
    }
  }
}

/**
 * Validates recovery symptom total (0 to 100).
 */
export function validateScore(score: number, min = 0, max = 100): void {
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
