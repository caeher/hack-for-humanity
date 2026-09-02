/**
 * Classifies education assistant requests before retrieval.
 */

import { evaluateAiQuery } from '@/convex/lib/safetyEngine'
import type { EducationRequestClassification } from './types'

const APP_HELP_PATTERNS: RegExp[] = [
  /\bhow (?:do|can) i (?:use|find|open|access|log|complete)\b/i,
  /\bwhere (?:is|do i find)\b/i,
  /\bhow does (?:cri|this app|the app)\b/i,
  /\bnavigate\b/i,
  /\bcheck-in\b/i,
  /\bcare plan\b/i,
  /\bmessages\b/i,
]

const PERSONAL_DATA_PATTERNS: RegExp[] = [
  /\bmy (?:symptoms?|headache|recovery|trend|data|check-ins?|scores?)\b/i,
  /\bwhat does my\b/i,
  /\bsummarize my\b/i,
  /\bhow am i doing\b/i,
  /\bmy latest\b/i,
]

const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\bweather\b/i,
  /\brecipe\b/i,
  /\bstock\b/i,
  /\bpolitics\b/i,
  /\bwrite (?:me )?(?:a )?(?:poem|story|essay)\b/i,
  /\btranslate\b/i,
]

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text))
}

/**
 * Classifies a user query into education assistant routing categories.
 * Unsafe/diagnostic intents are flagged when Safety Engine guardrails match.
 */
export function classifyEducationRequest(queryText: string): EducationRequestClassification {
  const trimmed = queryText.trim()
  if (!trimmed) return 'out_of_scope'

  const safetyResult = evaluateAiQuery(trimmed)
  const blockedBySafety =
    safetyResult.blockedActions.includes('invoke_llm') ||
    safetyResult.status === 'emergency' ||
    safetyResult.matchedRules.some(rule => rule.category === 'ai_query_guardrail')

  if (blockedBySafety) {
    return 'unsafe_diagnostic'
  }

  if (matchesAny(trimmed, APP_HELP_PATTERNS)) {
    return 'app_help'
  }

  if (matchesAny(trimmed, PERSONAL_DATA_PATTERNS)) {
    return 'personal_data'
  }

  if (matchesAny(trimmed, OUT_OF_SCOPE_PATTERNS)) {
    return 'out_of_scope'
  }

  return 'education'
}
