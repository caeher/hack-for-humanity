/**
 * Education assistant orchestration — safety-first, corpus-grounded responses.
 */

import { evaluateAiQuery, evaluateFreeText, type SafetyEvaluationResult } from '@/convex/lib/safetyEngine'
import { preflightAiRequest, postprocessAiOutput } from '@/lib/ai/orchestrator'
import { evaluateGuardrails } from '@/lib/ai/guardrails'
import type { AiGovernanceState } from '@/lib/ai/types'
import { classifyEducationRequest } from './classifyRequest'
import {
  composeGroundedAnswer,
  REFUSAL_MESSAGES,
} from './composeAnswer'
import { filterChunksByClassification, retrieveCorpusChunks } from './retrieval'
import type {
  EducationAssistantResponse,
  EducationCorpusChunk,
  EducationRequestClassification,
} from './types'
import { EDUCATION_CORPUS_VERSION } from './types'

export interface ProcessEducationQuestionParams {
  requestId: string
  queryText: string
  chunks: EducationCorpusChunk[]
  corpusVersion: string
  environment: string
  governance: AiGovernanceState
  orgId?: string
}

function mergeSafetyEvaluations(
  aiQuery: SafetyEvaluationResult,
  freeText: SafetyEvaluationResult
): SafetyEvaluationResult {
  const combinedRules = [...aiQuery.matchedRules, ...freeText.matchedRules]
  const uniqueRulesMap = new Map(combinedRules.map(rule => [rule.ruleId, rule]))
  const matchedRules = Array.from(uniqueRulesMap.values())
  const blockedActions = [...new Set([...aiQuery.blockedActions, ...freeText.blockedActions])]

  const statusPriority: Record<SafetyEvaluationResult['status'], number> = {
    emergency: 4,
    elevated: 3,
    review: 2,
    warning: 1,
    safe: 0,
  }

  const status =
    statusPriority[aiQuery.status] >= statusPriority[freeText.status]
      ? aiQuery.status
      : freeText.status

  return {
    ...aiQuery,
    status,
    isSafe: status === 'safe' || status === 'warning',
    matchedRules,
    blockedActions,
    failSafeApplied: aiQuery.failSafeApplied || freeText.failSafeApplied,
  }
}

function evaluateEducationSafety(queryText: string): SafetyEvaluationResult {
  return mergeSafetyEvaluations(evaluateAiQuery(queryText), evaluateFreeText(queryText))
}

function buildSafetyRefusal(params: {
  requestId: string
  ctxSessionId: string
  classification: EducationRequestClassification
  safety: SafetyEvaluationResult
  corpusVersion: string
  environment: string
}): EducationAssistantResponse {
  const guidance =
    params.safety.matchedRules[0]?.userGuidance?.defaultSafeText ??
    REFUSAL_MESSAGES.unsafe

  return {
    kind: 'safety_refusal',
    answerText: guidance,
    citations: [],
    classification: params.classification,
    corpusVersion: params.corpusVersion,
    environment: params.environment,
    safetyStatus: params.safety.status,
    safetyGuidance: guidance,
    requestId: params.requestId,
    ctxSessionId: params.ctxSessionId,
    auditOutcome: 'blocked_safety_engine',
  }
}

function buildGuardrailRefusal(params: {
  requestId: string
  ctxSessionId: string
  classification: EducationRequestClassification
  message: string
  outcome: string
  corpusVersion: string
  environment: string
}): EducationAssistantResponse {
  return {
    kind: 'guardrail_refusal',
    answerText: params.message,
    citations: [],
    classification: params.classification,
    corpusVersion: params.corpusVersion,
    environment: params.environment,
    requestId: params.requestId,
    ctxSessionId: params.ctxSessionId,
    auditOutcome: params.outcome,
  }
}

/**
 * Processes an education question through Safety Engine, classification, retrieval,
 * and deterministic grounded composition. AI provider calls are optional; retrieval-only
 * fallback is used when AI is disabled.
 */
export function processEducationQuestion(
  params: ProcessEducationQuestionParams
): EducationAssistantResponse {
  const ctxSessionId = crypto.randomUUID()
  const classification = classifyEducationRequest(params.queryText)
  const safety = evaluateEducationSafety(params.queryText)

  if (
    safety.status === 'emergency' ||
    safety.blockedActions.includes('invoke_llm') ||
    (classification === 'unsafe_diagnostic' && safety.matchedRules.length > 0)
  ) {
    return buildSafetyRefusal({
      requestId: params.requestId,
      ctxSessionId,
      classification: 'unsafe_diagnostic',
      safety,
      corpusVersion: params.corpusVersion,
      environment: params.environment,
    })
  }

  const guardrails = evaluateGuardrails({ queryText: params.queryText })
  if (!guardrails.allowed) {
    return buildGuardrailRefusal({
      requestId: params.requestId,
      ctxSessionId,
      classification,
      message:
        guardrails.inputResult.reason ??
        'Your request could not be processed. Please ask a recovery-related question using your own words.',
      outcome: guardrails.inputResult.outcome,
      corpusVersion: params.corpusVersion,
      environment: params.environment,
    })
  }

  const preflight = preflightAiRequest({
    requestId: params.requestId,
    feature: 'rag',
    queryText: params.queryText,
    governance: params.governance,
    orgId: params.orgId,
  })

  if (classification === 'personal_data') {
    return {
      kind: 'personal_data_redirect',
      answerText: REFUSAL_MESSAGES.personalData,
      citations: [],
      classification,
      corpusVersion: params.corpusVersion,
      environment: params.environment,
      requestId: params.requestId,
      ctxSessionId: preflight.auditEntry.ctxSessionId,
      auditOutcome: 'success',
    }
  }

  if (classification === 'out_of_scope') {
    return {
      kind: 'out_of_scope',
      answerText: REFUSAL_MESSAGES.outOfScope,
      citations: [],
      classification,
      corpusVersion: params.corpusVersion,
      environment: params.environment,
      requestId: params.requestId,
      ctxSessionId: preflight.auditEntry.ctxSessionId,
      auditOutcome: 'success',
    }
  }

  const scopedChunks = filterChunksByClassification(
    params.chunks,
    classification === 'app_help' ? 'app_help' : 'education'
  )
  const retrieved = retrieveCorpusChunks({
    queryText: params.queryText,
    chunks: scopedChunks,
  })

  const composed = composeGroundedAnswer({
    queryText: params.queryText,
    chunks: retrieved,
    corpusVersion: params.corpusVersion,
  })

  if (!composed.hasEvidence) {
    return {
      kind: 'insufficient_evidence',
      answerText: REFUSAL_MESSAGES.insufficientEvidence,
      citations: [],
      classification,
      corpusVersion: params.corpusVersion,
      environment: params.environment,
      requestId: params.requestId,
      ctxSessionId: preflight.auditEntry.ctxSessionId,
      auditOutcome: 'success',
    }
  }

  const aiDisabled = !preflight.allowed
  const answerPrefix = aiDisabled ? `${REFUSAL_MESSAGES.aiDisabled}\n\n` : ''
  const answerText = `${answerPrefix}${composed.answerText}`

  const postprocess = postprocessAiOutput({
    requestId: params.requestId,
    ctxSessionId: preflight.auditEntry.ctxSessionId,
    feature: 'rag',
    queryText: params.queryText,
    outputText: answerText,
    requireCitations: true,
  })

  if (!postprocess.allowed) {
    return buildGuardrailRefusal({
      requestId: params.requestId,
      ctxSessionId: preflight.auditEntry.ctxSessionId,
      classification,
      message: postprocess.message ?? REFUSAL_MESSAGES.insufficientEvidence,
      outcome: postprocess.outcome,
      corpusVersion: params.corpusVersion,
      environment: params.environment,
    })
  }

  const kind =
    classification === 'app_help'
      ? 'app_help'
      : aiDisabled
        ? 'ai_disabled_fallback'
        : 'grounded_answer'

  return {
    kind,
    answerText,
    citations: composed.citations,
    classification,
    corpusVersion: params.corpusVersion,
    environment: params.environment,
    requestId: params.requestId,
    ctxSessionId: preflight.auditEntry.ctxSessionId,
    auditOutcome: aiDisabled ? 'blocked_kill_switch' : 'success',
  }
}

export { EDUCATION_CORPUS_VERSION }
