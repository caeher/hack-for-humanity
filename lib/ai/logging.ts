/**
 * Safe AI audit logging — never logs secrets, full prompts, or clinical notes.
 */

import type { AiAuditEntry, AiFeature, AiRequestOutcome } from './types'

const FORBIDDEN_LOG_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /Bearer\s+[a-zA-Z0-9._-]+/,
  /api[_-]?key/i,
  /password/i,
  /secret/i,
]

/**
 * Computes a SHA-256 fingerprint of prompt content for audit correlation
 * without storing the actual prompt.
 */
export async function computePromptFingerprint(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

/**
 * Synchronous fingerprint for environments without async crypto.
 */
export function computePromptFingerprintSync(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Validates that a log entry contains no forbidden content.
 */
export function validateLogEntry(entry: Record<string, unknown>): {
  safe: boolean
  violations: string[]
} {
  const violations: string[] = []
  const serialized = JSON.stringify(entry)

  for (const pattern of FORBIDDEN_LOG_PATTERNS) {
    if (pattern.test(serialized)) {
      violations.push(`forbidden_pattern:${pattern.source}`)
    }
  }

  const forbiddenFields = [
    'prompt',
    'fullPrompt',
    'response',
    'fullResponse',
    'clinicalNote',
    'checkInNote',
    'apiKey',
    'secret',
    'password',
    'token',
    'email',
    'phone',
    'name',
    'dateOfBirth',
  ]

  for (const field of forbiddenFields) {
    if (field in entry) {
      violations.push(`forbidden_field:${field}`)
    }
  }

  return { safe: violations.length === 0, violations }
}

/**
 * Creates a safe audit entry for an AI request.
 * Only includes non-sensitive metadata.
 */
export function createAuditEntry(params: {
  requestId: string
  ctxSessionId: string
  feature: AiFeature
  outcome: AiRequestOutcome
  promptContent: string
  providerId?: string
  modelId?: string
  latencyMs?: number
  tokenCount?: number
}): AiAuditEntry {
  const entry: AiAuditEntry = {
    requestId: params.requestId,
    ctxSessionId: params.ctxSessionId,
    feature: params.feature,
    outcome: params.outcome,
    promptFingerprint: computePromptFingerprintSync(params.promptContent),
    timestamp: Date.now(),
    providerId: params.providerId,
    modelId: params.modelId,
    latencyMs: params.latencyMs,
    tokenCount: params.tokenCount,
  }

  const validation = validateLogEntry(entry as unknown as Record<string, unknown>)
  if (!validation.safe) {
    throw new Error(`Unsafe audit entry: ${validation.violations.join(', ')}`)
  }

  return entry
}

/**
 * Formats audit entry for console logging (development only).
 * Never includes prompt or response content.
 */
export function formatAuditLogLine(entry: AiAuditEntry): string {
  return [
    `[AI_AUDIT]`,
    `req=${entry.requestId.slice(0, 8)}`,
    `session=${entry.ctxSessionId.slice(0, 8)}`,
    `feature=${entry.feature}`,
    `outcome=${entry.outcome}`,
    entry.modelId ? `model=${entry.modelId}` : null,
    entry.latencyMs ? `latency=${entry.latencyMs}ms` : null,
    `fp=${entry.promptFingerprint}`,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Redacts any accidental sensitive content from error messages before logging.
 */
export function redactErrorForLog(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, '[REDACTED_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, '[REDACTED_TOKEN]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .slice(0, 200)
}
