/**
 * Recovery note extraction orchestration — safety-first, de-identified, user-confirmed.
 */

import { preflightAiRequest } from '@/lib/ai/orchestrator'
import { redactPiiFromText } from '@/lib/ai/deidentify'
import { computePromptFingerprintSync } from '@/lib/ai/logging'
import type { AiGovernanceState } from '@/lib/ai/types'
import {
  evaluateFreeText,
  evaluateStructuredExtraction,
  type SafetyEvaluationResult,
} from '@/convex/lib/safetyEngine'
import { parseRecoveryNoteLocally } from './localParser'
import { validateExtractionOutput } from './schema'
import {
  EXTRACTION_MODEL_ID,
  EXTRACTION_PROMPT_VERSION,
  EXTRACTION_SCHEMA_VERSION,
  type ExtractionResponse,
  type ExtractionValidationOutcome,
  type RecoveryEventCandidate,
} from './types'

export interface ExtractRecoveryEventsParams {
  requestId: string
  noteText: string
  governance: AiGovernanceState
  orgId?: string
  daysSinceInjury?: number
  symptomTotal?: number
}

function buildAudit(params: {
  requestId: string
  ctxSessionId: string
  validationOutcome: ExtractionValidationOutcome
  latencyMs: number
  auditOutcome: string
  candidateCount: number
  promptFingerprint?: string
}): ExtractionResponse['audit'] {
  return {
    requestId: params.requestId,
    ctxSessionId: params.ctxSessionId,
    schemaVersion: EXTRACTION_SCHEMA_VERSION,
    promptVersion: EXTRACTION_PROMPT_VERSION,
    modelId: EXTRACTION_MODEL_ID,
    validationOutcome: params.validationOutcome,
    latencyMs: params.latencyMs,
    auditOutcome: params.auditOutcome,
    candidateCount: params.candidateCount,
    promptFingerprint: params.promptFingerprint,
  }
}

/**
 * Extracts structured recovery event candidates from a note.
 * Always runs Safety Engine on raw text first — parser failure cannot hide danger signs.
 */
export function extractRecoveryEvents(params: ExtractRecoveryEventsParams): ExtractionResponse {
  const start = Date.now()
  const trimmed = params.noteText.trim()

  if (!trimmed) {
    return {
      kind: 'empty',
      candidates: [],
      audit: buildAudit({
        requestId: params.requestId,
        ctxSessionId: crypto.randomUUID(),
        validationOutcome: 'valid',
        latencyMs: Date.now() - start,
        auditOutcome: 'empty_input',
        candidateCount: 0,
      }),
    }
  }

  const rawSafety = evaluateFreeText(trimmed)
  const safetyMessage =
    rawSafety.status === 'emergency'
      ? 'Urgent safety signals detected in your note. Review emergency guidance before confirming suggestions.'
      : undefined

  const preflight = preflightAiRequest({
    requestId: params.requestId,
    feature: 'nlp',
    queryText: trimmed,
    clinicalInput: {
      daysSinceInjury: params.daysSinceInjury,
      symptomTotal: params.symptomTotal,
      queryText: trimmed,
    },
    governance: params.governance,
    orgId: params.orgId,
  })

  const ctxSessionId = preflight.auditEntry.ctxSessionId
  const promptFingerprint = computePromptFingerprintSync(trimmed)

  if (!preflight.allowed) {
    const isKillSwitch = preflight.outcome === 'blocked_kill_switch'
    return {
      kind: isKillSwitch ? 'ai_disabled' : 'blocked',
      candidates: [],
      message: safetyMessage ?? preflight.message,
      audit: buildAudit({
        requestId: params.requestId,
        ctxSessionId,
        validationOutcome: isKillSwitch ? 'ai_disabled' : 'blocked',
        latencyMs: Date.now() - start,
        auditOutcome: preflight.outcome,
        candidateCount: 0,
        promptFingerprint,
      }),
    }
  }

  const deidentified = redactPiiFromText(trimmed)
  const rawCandidates = parseRecoveryNoteLocally(deidentified)
  const validation = validateExtractionOutput(rawCandidates)

  const validationOutcome: ExtractionValidationOutcome = validation.valid
    ? validation.rejectedCount > 0
      ? 'partial'
      : 'valid'
    : rawCandidates.length === 0
      ? 'failed'
      : 'partial'

  const latencyMs = Date.now() - start

  if (validation.candidates.length === 0) {
    return {
      kind: 'parse_failed',
      candidates: [],
      message:
        safetyMessage ??
        'Could not extract structured events from your note. You can still log activities manually.',
      audit: buildAudit({
        requestId: params.requestId,
        ctxSessionId,
        validationOutcome: validationOutcome === 'partial' ? 'partial' : 'failed',
        latencyMs,
        auditOutcome: 'parse_failed',
        candidateCount: 0,
        promptFingerprint,
      }),
    }
  }

  return {
    kind: 'candidates',
    candidates: validation.candidates,
    audit: buildAudit({
      requestId: params.requestId,
      ctxSessionId,
      validationOutcome,
      latencyMs,
      auditOutcome: 'success',
      candidateCount: validation.candidates.length,
      promptFingerprint,
    }),
    message: safetyMessage,
  }
}

/**
 * Evaluates safety on user-confirmed structured candidates before storage.
 */
export function evaluateConfirmedCandidatesSafety(
  candidates: RecoveryEventCandidate[],
  rawNote?: string
): SafetyEvaluationResult {
  const confirmed = candidates.filter(c => c.status === 'confirmed')
  const structuredSafety = evaluateStructuredExtraction(confirmed)
  if (!rawNote?.trim()) return structuredSafety

  const rawSafety = evaluateFreeText(rawNote)
  return mergeSafetyResults(rawSafety, structuredSafety)
}

function mergeSafetyResults(
  a: SafetyEvaluationResult,
  b: SafetyEvaluationResult
): SafetyEvaluationResult {
  const statusPriority: Record<SafetyEvaluationResult['status'], number> = {
    emergency: 4,
    elevated: 3,
    review: 2,
    warning: 1,
    safe: 0,
  }

  const combinedRules = [...a.matchedRules, ...b.matchedRules]
  const uniqueRulesMap = new Map(combinedRules.map(rule => [rule.ruleId, rule]))
  const matchedRules = Array.from(uniqueRulesMap.values())
  const blockedActions = [...new Set([...a.blockedActions, ...b.blockedActions])]

  const status =
    statusPriority[a.status] >= statusPriority[b.status] ? a.status : b.status

  return {
    ...a,
    status,
    isSafe: status === 'safe' || status === 'warning',
    matchedRules,
    blockedActions,
    failSafeApplied: a.failSafeApplied || b.failSafeApplied,
  }
}
