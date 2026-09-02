/**
 * De-identification and payload minimization for AI provider calls.
 * Ensures no direct identifiers are sent to external AI providers.
 */

import type {
  AgeBand,
  DeidentifiedClinicalContext,
  SymptomSeverityBand,
  TrendDirection,
} from './types'

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const PHONE_PATTERN = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/
const MRN_PATTERN = /\b(?:MRN|mrn|patient\s*#?)\s*:?\s*\w+/i
const URL_TOKEN_PATTERN = /https?:\/\/[^\s]+/g

/** Fields excluded from PII scanning (known safe pseudonymous identifiers) */
const PII_SCAN_EXCLUDED_FIELDS = new Set(['ctxSessionId', 'requestId'])

/** Fields that must never appear in AI payloads */
const FORBIDDEN_IDENTITY_FIELDS = new Set([
  'name',
  'email',
  'phone',
  'address',
  'dateOfBirth',
  'dob',
  'patientId',
  'userId',
  'clerkId',
  'tokenIdentifier',
  'mrn',
  'ssn',
  'preferredName',
  'firstName',
  'lastName',
  'fullName',
])

/**
 * Computes age band from date of birth without sending exact DOB to provider.
 */
export function computeAgeBand(dateOfBirth?: string | Date): AgeBand {
  if (!dateOfBirth) return 'unknown'

  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  if (isNaN(dob.getTime())) return 'unknown'

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }

  if (age < 13) return 'unknown'
  if (age <= 17) return '13-17'
  if (age <= 24) return '18-24'
  if (age <= 44) return '25-44'
  if (age <= 64) return '45-64'
  return '65+'
}

/**
 * Maps symptom total (0-48) to severity band for minimized disclosure.
 */
export function computeSymptomSeverityBand(total: number): SymptomSeverityBand {
  if (total <= 8) return 'minimal'
  if (total <= 16) return 'mild'
  if (total <= 28) return 'moderate'
  return 'severe'
}

/**
 * Computes trend direction from recent symptom totals.
 */
export function computeTrendDirection(totals: number[]): TrendDirection {
  if (totals.length < 3) return 'insufficient_data'

  const recent = totals.slice(-3)
  const first = recent[0]!
  const last = recent[recent.length - 1]!
  const delta = last - first

  if (delta <= -3) return 'improving'
  if (delta >= 3) return 'worsening'
  return 'stable'
}

/**
 * Redacts PII patterns from free text.
 */
export function redactPiiFromText(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/\b(?:MRN|mrn|patient\s*#?)\s*:?\s*\w+/gi, '[REDACTED_MRN]')
    .replace(URL_TOKEN_PATTERN, '[REDACTED_URL]')
}

/**
 * Checks if text contains detectable PII patterns.
 */
export function containsPii(text: string): boolean {
  return (
    EMAIL_PATTERN.test(text) ||
    PHONE_PATTERN.test(text) ||
    SSN_PATTERN.test(text) ||
    MRN_PATTERN.test(text)
  )
}

/**
 * Strips forbidden identity fields from a raw payload object.
 */
export function stripIdentityFields(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(payload)) {
    if (FORBIDDEN_IDENTITY_FIELDS.has(key)) continue

    if (typeof value === 'string') {
      cleaned[key] = redactPiiFromText(value)
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = stripIdentityFields(value as Record<string, unknown>)
    } else {
      cleaned[key] = value
    }
  }

  return cleaned
}

/**
 * Generates an ephemeral pseudonymous session ID.
 * Not reversible to patient ID — used only for request correlation.
 */
export function generateCtxSessionId(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface RawClinicalInput {
  dateOfBirth?: string
  daysSinceInjury?: number
  symptomTotal?: number
  recentSymptomTotals?: number[]
  activityContext?: string
  queryText?: string
  /** Any additional fields — identity fields will be stripped */
  extra?: Record<string, unknown>
}

/**
 * Transforms raw clinical input into a de-identified context safe for AI providers.
 */
export function deidentifyClinicalContext(
  input: RawClinicalInput,
  ctxSessionId?: string
): DeidentifiedClinicalContext {
  const sessionId = ctxSessionId ?? generateCtxSessionId()
  const symptomTotal = input.symptomTotal ?? 0

  const context: DeidentifiedClinicalContext = {
    ctxSessionId: sessionId,
    ageBand: computeAgeBand(input.dateOfBirth),
    daysSinceInjury: input.daysSinceInjury,
    symptomTotalBand: computeSymptomSeverityBand(symptomTotal),
    symptomTotal: symptomTotal > 0 ? symptomTotal : undefined,
    trendDirection: computeTrendDirection(input.recentSymptomTotals ?? []),
    activityContext: input.activityContext
      ? redactPiiFromText(input.activityContext)
      : undefined,
    queryText: input.queryText ? redactPiiFromText(input.queryText) : undefined,
  }

  return context
}

/**
 * Validates that a payload contains no direct identifiers.
 * Returns list of violations for testing and CI gates.
 */
export function detectIdentityViolations(payload: Record<string, unknown>): string[] {
  const violations: string[] = []

  function scan(obj: Record<string, unknown>, path: string): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key

      if (FORBIDDEN_IDENTITY_FIELDS.has(key)) {
        violations.push(`forbidden_field:${fullPath}`)
      }

      if (PII_SCAN_EXCLUDED_FIELDS.has(key)) continue

      if (typeof value === 'string') {
        if (containsPii(value)) {
          violations.push(`pii_pattern:${fullPath}`)
        }
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        scan(value as Record<string, unknown>, fullPath)
      }
    }
  }

  scan(payload, '')
  return violations
}

/**
 * Serializes de-identified context for provider API call.
 * Final gate before any external transmission.
 */
export function serializeForProvider(context: DeidentifiedClinicalContext): string {
  const safe = stripIdentityFields(context as unknown as Record<string, unknown>)
  const violations = detectIdentityViolations(safe)
  if (violations.length > 0) {
    throw new Error(`Identity violations detected in AI payload: ${violations.join(', ')}`)
  }
  return JSON.stringify(safe)
}
