/**
 * AI request orchestrator — coordinates kill switch, de-identification, guardrails, and logging.
 * This is the single entry point for all AI provider calls.
 */

import { deidentifyClinicalContext, detectIdentityViolations, type RawClinicalInput } from './deidentify'
import { evaluateGuardrails, getRefusalMessage } from './guardrails'
import { checkKillSwitch } from './killSwitch'
import { createAuditEntry } from './logging'
import {
  getApprovedProviderConfig,
  wouldExceedCostLimit,
  ESTIMATED_COST_PER_REQUEST_CENTS,
} from './providerConfig'
import type {
  AiAuditEntry,
  AiFeature,
  AiGovernanceState,
  AiRequestOutcome,
  DeidentifiedClinicalContext,
} from './types'

export interface AiRequestParams {
  requestId: string
  feature: AiFeature
  queryText: string
  clinicalInput?: RawClinicalInput
  governance: AiGovernanceState
  orgId?: string
  providerId?: string
  modelId?: string
}

export interface AiRequestResult {
  allowed: boolean
  outcome: AiRequestOutcome
  message?: string
  deidentifiedContext?: DeidentifiedClinicalContext
  auditEntry: AiAuditEntry
}

/**
 * Pre-flight check for an AI request. Does NOT call the provider.
 * Returns de-identified context if allowed, or refusal message if blocked.
 */
export function preflightAiRequest(params: AiRequestParams): AiRequestResult {
  const ctxSessionId = crypto.randomUUID()

  // 1. Kill switch check
  const killSwitch = checkKillSwitch({
    state: params.governance,
    orgId: params.orgId,
    feature: params.feature,
  })

  if (!killSwitch.enabled) {
    const auditEntry = createAuditEntry({
      requestId: params.requestId,
      ctxSessionId,
      feature: params.feature,
      outcome: killSwitch.outcome,
      promptContent: params.queryText,
    })
    return {
      allowed: false,
      outcome: killSwitch.outcome,
      message: killSwitch.fallbackMessage,
      auditEntry,
    }
  }

  // 2. Cost limit check
  if (
    wouldExceedCostLimit(
      params.governance.currentDailyCostCents,
      params.governance.dailyCostLimitCents
    )
  ) {
    const auditEntry = createAuditEntry({
      requestId: params.requestId,
      ctxSessionId,
      feature: params.feature,
      outcome: 'blocked_cost_limit',
      promptContent: params.queryText,
    })
    return {
      allowed: false,
      outcome: 'blocked_cost_limit',
      message: getRefusalMessage('blocked_cost_limit'),
      auditEntry,
    }
  }

  // 3. Model allowlist check (if provider specified)
  if (params.providerId && params.modelId) {
    const config = getApprovedProviderConfig(params.providerId, params.modelId)
    if (!config) {
      const auditEntry = createAuditEntry({
        requestId: params.requestId,
        ctxSessionId,
        feature: params.feature,
        outcome: 'blocked_model_not_allowed',
        promptContent: params.queryText,
        providerId: params.providerId,
        modelId: params.modelId,
      })
      return {
        allowed: false,
        outcome: 'blocked_model_not_allowed',
        message: getRefusalMessage('blocked_model_not_allowed'),
        auditEntry,
      }
    }
  }

  // 4. Input guardrails
  const guardrailResult = evaluateGuardrails({ queryText: params.queryText })
  if (!guardrailResult.allowed) {
    const auditEntry = createAuditEntry({
      requestId: params.requestId,
      ctxSessionId,
      feature: params.feature,
      outcome: guardrailResult.inputResult.outcome,
      promptContent: params.queryText,
    })
    return {
      allowed: false,
      outcome: guardrailResult.inputResult.outcome,
      message: getRefusalMessage(guardrailResult.inputResult.outcome),
      auditEntry,
    }
  }

  // 5. De-identify clinical context
  const deidentifiedContext = deidentifyClinicalContext(
    {
      ...params.clinicalInput,
      queryText: params.queryText,
    },
    ctxSessionId
  )

  // 6. Final identity violation check on serialized payload
  const violations = detectIdentityViolations(
    deidentifiedContext as unknown as Record<string, unknown>
  )
  if (violations.length > 0) {
    const auditEntry = createAuditEntry({
      requestId: params.requestId,
      ctxSessionId,
      feature: params.feature,
      outcome: 'blocked_unsafe_output',
      promptContent: params.queryText,
    })
    return {
      allowed: false,
      outcome: 'blocked_unsafe_output',
      message: 'Request blocked due to privacy policy violation.',
      auditEntry,
    }
  }

  const auditEntry = createAuditEntry({
    requestId: params.requestId,
    ctxSessionId,
    feature: params.feature,
    outcome: 'success',
    promptContent: params.queryText,
    providerId: params.providerId,
    modelId: params.modelId,
  })

  return {
    allowed: true,
    outcome: 'success',
    deidentifiedContext,
    auditEntry,
  }
}

/**
 * Post-processes AI provider output through output guardrails.
 */
export function postprocessAiOutput(params: {
  requestId: string
  ctxSessionId: string
  feature: AiFeature
  queryText: string
  outputText: string
  requireCitations?: boolean
  providerId?: string
  modelId?: string
  latencyMs?: number
}): AiRequestResult {
  const guardrailResult = evaluateGuardrails({
    queryText: params.queryText,
    outputText: params.outputText,
    requireCitations: params.requireCitations,
  })

  const outcome = guardrailResult.outputResult?.outcome ?? 'success'
  const allowed = guardrailResult.allowed

  const auditEntry = createAuditEntry({
    requestId: params.requestId,
    ctxSessionId: params.ctxSessionId,
    feature: params.feature,
    outcome: allowed ? 'success' : outcome,
    promptContent: params.queryText,
    providerId: params.providerId,
    modelId: params.modelId,
    latencyMs: params.latencyMs,
  })

  return {
    allowed,
    outcome: allowed ? 'success' : outcome,
    message: allowed ? undefined : getRefusalMessage(outcome),
    auditEntry,
  }
}

export { ESTIMATED_COST_PER_REQUEST_CENTS }
