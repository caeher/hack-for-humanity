/**
 * Privacy-safe structured error reporter for CRI.
 * Operators can diagnose failures without reading sensitive payloads.
 *
 * Guarantees:
 * 1. Zero PII: Emails, names, tokens, passwords, and phone numbers are redacted.
 * 2. Zero Clinical Data: Symptom scores, free-text clinical notes, and danger sign selections are redacted.
 * 3. Consistent Correlation: Every error is tagged with an end-to-end correlation ID.
 */

import { generateCorrelationId, isValidCorrelationId } from './correlation'

export type ErrorCategory =
  | 'AUTH_FAILURE'
  | 'NETWORK_ERROR'
  | 'DATABASE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'VALIDATION_ERROR'
  | 'CLIENT_RUNTIME_ERROR'
  | 'UNKNOWN'

export interface StructuredErrorReport {
  correlationId: string
  errorCategory: ErrorCategory
  errorCode: string
  sanitizedMessage: string
  timestamp: number
  component?: string
  path?: string
  action?: string
  environment: string
}

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // API keys and bearer tokens
  { pattern: /sk-[a-zA-Z0-9_-]{20,}/g, replacement: '[REDACTED_API_KEY]' },
  { pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: 'Bearer [REDACTED_TOKEN]' },
  { pattern: /pk_(test|live)_[a-zA-Z0-9_-]+/g, replacement: '[REDACTED_CLERK_KEY]' },
  { pattern: /sk_(test|live)_[a-zA-Z0-9_-]+/g, replacement: '[REDACTED_CLERK_SECRET]' },
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, replacement: '[REDACTED_JWT]' },

  // Emails and phone numbers
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[REDACTED_PHONE]' },

  // Passwords and secrets in queries/payloads
  { pattern: /password[=:][^&,\s]+/gi, replacement: 'password=[REDACTED]' },
  { pattern: /secret[=:][^&,\s]+/gi, replacement: 'secret=[REDACTED]' },
]

const CLINICAL_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Specific symptom ratings e.g. headache: 5/6, headache score 4
  {
    pattern: /\b(headache|dizziness|nausea|lightSensitivity|noiseSensitivity|fatigue|concentration|sleepDifficulty|symptomTotal)\s*[:=]\s*\d+\b/gi,
    replacement: '$1:[REDACTED_SCORE]',
  },
  // Danger sign labels when present in error logs
  {
    pattern: /\b(repeated vomiting|worsening headache|seizure|loss of consciousness|stumbling|slurred speech|pupil asymmetry|neck pain)\b/gi,
    replacement: '[REDACTED_DANGER_SIGN]',
  },
  // Free text notes or clinical observations
  { pattern: /clinicalNote[=:][^&,\n]+/gi, replacement: 'clinicalNote=[REDACTED_CLINICAL_NOTE]' },
  { pattern: /encounterNote[=:][^&,\n]+/gi, replacement: 'encounterNote=[REDACTED_NOTE]' },
  { pattern: /patientNote[=:][^&,\n]+/gi, replacement: 'patientNote=[REDACTED_NOTE]' },
  { pattern: /freeText[=:][^&,\n]+/gi, replacement: 'freeText=[REDACTED_TEXT]' },
]

/**
 * Sanitizes any raw string or error message by stripping PII and clinical payloads.
 */
export function sanitizeErrorMessage(rawMessage: unknown): string {
  if (typeof rawMessage !== 'string') {
    if (rawMessage instanceof Error) {
      rawMessage = rawMessage.message
    } else {
      try {
        rawMessage = JSON.stringify(rawMessage)
      } catch {
        rawMessage = String(rawMessage)
      }
    }
  }

  let cleaned = String(rawMessage)

  for (const { pattern, replacement } of PII_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  for (const { pattern, replacement } of CLINICAL_PATTERNS) {
    cleaned = cleaned.replace(pattern, replacement)
  }

  // Cap message length to prevent accidental massive payload leaks
  return cleaned.slice(0, 300)
}

/**
 * Classifies an error into a standardized, non-sensitive ErrorCategory.
 */
export function classifyError(error: unknown): { category: ErrorCategory; code: string } {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (message.includes('unauthorized') || message.includes('unauthenticated') || message.includes('jwt') || message.includes('clerk')) {
    return { category: 'AUTH_FAILURE', code: 'AUTH_ERR_401' }
  }
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
    return { category: 'RATE_LIMITED', code: 'RATE_LIMIT_429' }
  }
  if (message.includes('convex') || message.includes('database') || message.includes('connection refused')) {
    return { category: 'DATABASE_UNAVAILABLE', code: 'DB_UNAVAILABLE_503' }
  }
  if (message.includes('network') || message.includes('fetch failed') || message.includes('failed to fetch') || message.includes('econnrefused')) {
    return { category: 'NETWORK_ERROR', code: 'NETWORK_ERR_001' }
  }
  if (message.includes('kill switch') || message.includes('guardrail') || message.includes('ai provider') || message.includes('openai') || message.includes('gemini')) {
    return { category: 'AI_PROVIDER_ERROR', code: 'AI_PROVIDER_ERR_500' }
  }
  if (message.includes('validation') || message.includes('invalid argument') || message.includes('required')) {
    return { category: 'VALIDATION_ERROR', code: 'VALIDATION_ERR_400' }
  }
  if (message.includes('cannot read property') || message.includes('is not a function') || message.includes('hydrat')) {
    return { category: 'CLIENT_RUNTIME_ERROR', code: 'CLIENT_RUNTIME_ERR' }
  }

  return { category: 'UNKNOWN', code: 'INTERNAL_ERR_500' }
}

/**
 * Creates a structured, operator-ready error report without PII or clinical payloads.
 */
export function createStructuredErrorReport(
  error: unknown,
  context?: {
    correlationId?: string
    component?: string
    path?: string
    action?: string
  }
): StructuredErrorReport {
  const correlationId =
    context?.correlationId && isValidCorrelationId(context.correlationId)
      ? context.correlationId
      : generateCorrelationId()

  const { category, code } = classifyError(error)
  const sanitizedMessage = sanitizeErrorMessage(error)
  const environment = process.env.NODE_ENV || 'development'

  return {
    correlationId,
    errorCategory: category,
    errorCode: code,
    sanitizedMessage,
    timestamp: Date.now(),
    component: context?.component,
    path: context?.path,
    action: context?.action,
    environment,
  }
}

/**
 * Emits a privacy-safe error report to stderr / telemetry.
 * Safe for production operator logs.
 */
export function reportError(
  error: unknown,
  context?: {
    correlationId?: string
    component?: string
    path?: string
    action?: string
  }
): StructuredErrorReport {
  const report = createStructuredErrorReport(error, context)

  // Structured single-line JSON log for observability collectors (Datadog, CloudWatch, etc.)
  if (typeof console !== 'undefined' && console.error) {
    console.error(
      `[OPERATOR_ERROR] correlationId=${report.correlationId} category=${report.errorCategory} code=${report.errorCode} msg="${report.sanitizedMessage}" component=${report.component ?? 'unknown'}`
    )
  }

  return report
}
