/**
 * AI input/output guardrails: prompt injection, exfiltration, unsafe advice, citation spoofing.
 */

import { evaluateAiQuery } from '@/convex/lib/safetyEngine'
import type { AiGuardrailResult, AiRequestOutcome } from './types'

// --- Prompt Injection Patterns ---

const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, label: 'ignore_instructions' },
  { pattern: /disregard\s+(your|the)\s+(rules|guidelines|instructions)/i, label: 'disregard_rules' },
  { pattern: /you\s+are\s+now\s+(a|an)\s+/i, label: 'role_override' },
  { pattern: /pretend\s+(you\s+are|to\s+be)\s+/i, label: 'role_play' },
  { pattern: /system\s*prompt/i, label: 'system_prompt_reference' },
  { pattern: /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/i, label: 'template_injection' },
  { pattern: /jailbreak/i, label: 'jailbreak_keyword' },
  { pattern: /do\s+anything\s+now/i, label: 'dan_jailbreak' },
  { pattern: /\bDAN\b.*\bmode\b/i, label: 'dan_mode' },
  { pattern: /override\s+(safety|guardrails|restrictions)/i, label: 'override_safety' },
  { pattern: /reveal\s+(your|the)\s+(system|hidden)\s+(prompt|instructions)/i, label: 'prompt_extraction' },
]

// --- Data Exfiltration Patterns ---

const EXFILTRATION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /dump\s+(the\s+)?(database|records|data)/i, label: 'dump_database' },
  { pattern: /list\s+all\s+(patients|users|records)/i, label: 'list_all_patients' },
  { pattern: /export\s+(all\s+)?(phi|patient|health)\s*(data|records)?/i, label: 'export_phi' },
  { pattern: /show\s+me\s+(everyone'?s?|all)\s+(patient|user)/i, label: 'show_all_patients' },
  { pattern: /give\s+me\s+(access\s+to|the)\s+(raw\s+)?data/i, label: 'raw_data_request' },
  { pattern: /what\s+is\s+(the\s+)?(patient|user)\s*(name|email|phone|address)/i, label: 'identity_request' },
  { pattern: /repeat\s+(the\s+)?(above|previous|all)\s+(context|data|information|patient)/i, label: 'context_repeat' },
  { pattern: /patient\s+data\s+you\s+have\s+access/i, label: 'patient_data_access' },
  { pattern: /print\s+(your\s+)?(context|memory|training)/i, label: 'print_context' },
]

// --- Unsafe Output Patterns ---

const OUTPUT_DIAGNOSTIC_PATTERNS = [
  /\byou\s+have\s+(a\s+)?concussion\b/i,
  /\byou\s+are\s+diagnosed\s+with\b/i,
  /\bthis\s+confirms\s+(a\s+)?concussion\b/i,
  /\byour\s+diagnosis\s+is\b/i,
]

const OUTPUT_PRESCRIPTION_PATTERNS = [
  /\btake\s+\d+\s*mg\b/i,
  /\bi\s+prescribe\b/i,
  /\brecommended\s+dosage\b/i,
  /\byou\s+should\s+take\s+\d+/i,
]

const OUTPUT_CLEARANCE_PATTERNS = [
  /\byou\s+are\s+cleared\s+(to|for)\b/i,
  /\bsafe\s+to\s+return\s+to\s+(play|sport|work|driving)\b/i,
  /\bcleared\s+for\s+full\s+(activity|contact)\b/i,
]

// --- Approved Citation Sources ---

export const APPROVED_CITATION_SOURCES = [
  'CDC HEADS UP',
  'Amsterdam 2022',
  'ONF Living Guidelines',
  'PedsConcussion',
  'CRI Clinical Scope',
] as const

export type ApprovedCitationSource = (typeof APPROVED_CITATION_SOURCES)[number]

const CITATION_PATTERN = /\[([^\]]+)\]/g

function matchPatterns(
  text: string,
  patterns: Array<{ pattern: RegExp; label: string }>
): string[] {
  const matched: string[] = []
  for (const { pattern, label } of patterns) {
    if (pattern.test(text)) {
      matched.push(label)
    }
  }
  return matched
}

/**
 * Screens user input for prompt injection and data exfiltration attempts.
 */
export function screenInputGuardrails(queryText: string): AiGuardrailResult {
  const injectionMatches = matchPatterns(queryText, INJECTION_PATTERNS)
  if (injectionMatches.length > 0) {
    return {
      allowed: false,
      outcome: 'blocked_injection',
      reason: 'Prompt injection pattern detected',
      matchedPatterns: injectionMatches,
    }
  }

  const exfiltrationMatches = matchPatterns(queryText, EXFILTRATION_PATTERNS)
  if (exfiltrationMatches.length > 0) {
    return {
      allowed: false,
      outcome: 'blocked_exfiltration',
      reason: 'Data exfiltration attempt detected',
      matchedPatterns: exfiltrationMatches,
    }
  }

  // Delegate clinical red-line screening to Safety Engine
  const safetyResult = evaluateAiQuery(queryText)
  if (safetyResult.blockedActions.length > 0 || safetyResult.status === 'elevated') {
    return {
      allowed: false,
      outcome: 'blocked_safety_engine',
      reason: safetyResult.matchedRules[0]?.userGuidance
        ? String(safetyResult.matchedRules[0].userGuidance)
        : 'Query blocked by Safety Engine',
      matchedPatterns: safetyResult.matchedRules.map(r => r.outputCode),
    }
  }

  return { allowed: true, outcome: 'success' }
}

/**
 * Validates AI output for unsafe advice, PII leakage, and citation spoofing.
 */
export function screenOutputGuardrails(
  outputText: string,
  options?: { requireCitations?: boolean }
): AiGuardrailResult {
  for (const pattern of OUTPUT_DIAGNOSTIC_PATTERNS) {
    if (pattern.test(outputText)) {
      return {
        allowed: false,
        outcome: 'blocked_unsafe_output',
        reason: 'Output contains diagnostic language',
        matchedPatterns: ['diagnostic_language'],
      }
    }
  }

  for (const pattern of OUTPUT_PRESCRIPTION_PATTERNS) {
    if (pattern.test(outputText)) {
      return {
        allowed: false,
        outcome: 'blocked_unsafe_output',
        reason: 'Output contains prescription language',
        matchedPatterns: ['prescription_language'],
      }
    }
  }

  for (const pattern of OUTPUT_CLEARANCE_PATTERNS) {
    if (pattern.test(outputText)) {
      return {
        allowed: false,
        outcome: 'blocked_unsafe_output',
        reason: 'Output contains clearance language',
        matchedPatterns: ['clearance_language'],
      }
    }
  }

  if (options?.requireCitations) {
    const citationResult = verifyCitations(outputText)
    if (!citationResult.valid) {
      return {
        allowed: false,
        outcome: 'blocked_citation_spoof',
        reason: citationResult.reason,
        matchedPatterns: citationResult.invalidCitations,
      }
    }
  }

  return { allowed: true, outcome: 'success' }
}

/**
 * Verifies that all citations in output reference approved sources.
 */
export function verifyCitations(text: string): {
  valid: boolean
  reason?: string
  invalidCitations: string[]
  validCitations: string[]
} {
  const matches = [...text.matchAll(CITATION_PATTERN)]
  if (matches.length === 0) {
    return { valid: true, invalidCitations: [], validCitations: [] }
  }

  const validCitations: string[] = []
  const invalidCitations: string[] = []

  for (const match of matches) {
    const citation = match[1]!.trim()
    const isApproved = APPROVED_CITATION_SOURCES.some(
      source => citation.toLowerCase().includes(source.toLowerCase())
    )
    if (isApproved) {
      validCitations.push(citation)
    } else {
      invalidCitations.push(citation)
    }
  }

  if (invalidCitations.length > 0) {
    return {
      valid: false,
      reason: `Unapproved citation sources: ${invalidCitations.join(', ')}`,
      invalidCitations,
      validCitations,
    }
  }

  return { valid: true, invalidCitations: [], validCitations }
}

/**
 * Full pipeline guardrail check for an AI request.
 */
export function evaluateGuardrails(input: {
  queryText: string
  outputText?: string
  requireCitations?: boolean
}): { inputResult: AiGuardrailResult; outputResult?: AiGuardrailResult; allowed: boolean } {
  const inputResult = screenInputGuardrails(input.queryText)

  if (!inputResult.allowed) {
    return { inputResult, allowed: false }
  }

  if (input.outputText) {
    const outputResult = screenOutputGuardrails(input.outputText, {
      requireCitations: input.requireCitations,
    })
    return { inputResult, outputResult, allowed: outputResult.allowed }
  }

  return { inputResult, allowed: true }
}

/**
 * Maps guardrail outcome to human-readable refusal message.
 */
export function getRefusalMessage(outcome: AiRequestOutcome): string {
  switch (outcome) {
    case 'blocked_injection':
      return 'Your request could not be processed. Please ask a recovery-related question using your own words.'
    case 'blocked_exfiltration':
      return 'Patient records cannot be accessed through this feature. Contact your care team for record requests.'
    case 'blocked_safety_engine':
      return 'CRI cannot provide medical diagnoses, prescriptions, activity clearance, or advice to ignore danger signs. Please consult your healthcare provider.'
    case 'blocked_unsafe_output':
      return 'This response was blocked because it may contain medical advice outside CRI\'s scope. Please consult your healthcare provider.'
    case 'blocked_citation_spoof':
      return 'This response could not be verified against approved clinical sources. Please review official guidelines or ask your care team.'
    case 'blocked_kill_switch':
      return 'AI-assisted features are temporarily unavailable. Your check-ins, dashboard, and care plan remain fully functional.'
    case 'blocked_model_not_allowed':
      return 'AI features are temporarily unavailable due to a configuration issue.'
    case 'blocked_cost_limit':
      return 'AI usage limit reached for today. Core tracking features remain available.'
    case 'blocked_timeout':
      return 'The request timed out. Please try again or consult your care team.'
    default:
      return 'This request could not be completed. Please try again or contact your care team.'
  }
}
