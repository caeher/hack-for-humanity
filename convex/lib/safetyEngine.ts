/**
 * Deterministic Safety Engine for Concussion Recovery Intelligence (CRI).
 *
 * Evaluates structured clinical inputs, daily check-ins, onboarding questionnaires,
 * unconfirmed free-text extractions, and AI queries against versioned clinical rules.
 *
 * Guarantees:
 * - Deterministic & idempotent evaluation.
 * - Non-diagnostic structured outcomes.
 * - Sensitive payload minimization.
 * - Fail-safe defaults on incomplete or conflicting data.
 */

import { ConcussionSymptoms, validateConcussionSymptoms } from './businessLogic'
import {
  EscalationPath,
  EvidenceSource,
  RULE_REGISTRY_VERSION,
  SAFETY_RULES,
  SafetyCategory,
  SafetyRule,
  SafetySeverity,
  UserGuidance,
} from './safetyRules'

export type SafetyEvaluationStatus = 'safe' | 'warning' | 'review' | 'elevated' | 'emergency'

export interface MatchedRuleDetail {
  ruleId: string
  version: string
  name: string
  category: SafetyCategory
  severity: SafetySeverity
  outputCode: string
  evidenceSource: EvidenceSource
  escalationPath: EscalationPath
  userGuidance: UserGuidance
  matchedEvidenceSummary: string
}

export interface SafetyEvaluationResult {
  evaluationId: string
  status: SafetyEvaluationStatus
  isSafe: boolean
  highestSeverity: SafetySeverity | 'none'
  primaryEscalation: EscalationPath | 'none'
  matchedRules: MatchedRuleDetail[]
  blockedActions: string[]
  failSafeApplied: boolean
  ruleEngineVersion: string
  evaluatedAt: number
}

export interface LongitudinalRecord {
  date: string
  symptomTotal: number
  symptoms?: Partial<ConcussionSymptoms>
}

export interface SafetyEvaluationContext {
  contextType:
    | 'check_in'
    | 'onboarding'
    | 'baseline'
    | 'free_text'
    | 'structured_extraction'
    | 'ai_query'
    | 'longitudinal'
  symptoms?: Partial<ConcussionSymptoms>
  symptomTotal?: number
  dangerSigns?: string[]
  activityImpact?: string
  note?: string
  text?: string
  queryText?: string
  daysSinceInjury?: number
  screenMinutes?: number
  cognitiveMinutes?: number
  longitudinalHistory?: LongitudinalRecord[]
}

// Danger sign red-flag keywords in free text
const RED_FLAG_TEXT_PATTERNS = [
  /\b(seizure|seizures|convulsion|convulsions)\b/i,
  /\b(passed\s+out|blacked\s+out|blackout|loss\s+of\s+consciousness|unconscious|fainted)\b/i,
  /\b(threw\s+up|vomit|vomited|vomiting|throwing\s+up)\b/i,
  /\b(slurred\s+speech|can'?t\s+speak|unable\s+to\s+speak)\b/i,
  /\b(weakness|numbness|paralysis)\b.*\b(arm|leg|face|hand|limb|extremit|body)\b/i,
  /\b(unequal\s+pupil|one\s+pupil\s+(larger|bigger)|pupils\s+different)\b/i,
  /\b(cannot\s+wake\s+up|unable\s+to\s+wake|can'?t\s+wake\s+up|extreme\s+drowsiness)\b/i,
  /\b(worst\s+headache|headache\s+rapidly\s+worsening|headache\s+getting\s+worse|unbearable\s+headache)\b/i,
  /\b(fluid\s+from\s+(ear|nose)|blood\s+from\s+(ear|nose))\b/i,
  /\b(severe\s+neck\s+pain|neck\s+stiffness\s+after\s+hit|neck\s+tenderness)\b/i,
]

// Diagnostic intent patterns for AI guardrail
const AI_DIAGNOSTIC_PATTERNS = [
  /\bdiagnos\w*\b/i,
  /\b(do\s+i\s+have\s+(a\s+)?(concussion|tbi|brain\s+damage|bleed)|does\s+(my\s+)?(child|son|daughter|kid)\s+have\s+(a\s+)?concussion|is\s+this\s+(a\s+)?concussion|what\s+(stage|grade)\s+is\s+(my\s+)?concussion|what\s+stage\s+of\s+concussion|post[- ]?concussion\s+syndrome|skull\s+fracture|how\s+bad\s+is\s+my\s+(concussion|brain)|give\s+me\s+a\s+diagnosis)\b/i,
]

// Prescription & medication intent patterns for AI guardrail
const AI_PRESCRIPTION_PATTERNS = [
  /\bprescrib\w*\b/i,
  /\b(how\s+much\s+(ibuprofen|advil|tylenol|acetaminophen|motrin|aspirin|aleve|naproxen|medication|painkiller)|what\s+dosage\s+of|how\s+many\s+mg\s+of|what\s+medicine\s+should\s+i\s+take|can\s+i\s+take\s+\d+\s*mg|can\s+i\s+give\s+.{0,30}(tylenol|ibuprofen|advil|acetaminophen|medication)|what\s+drugs?\s+(cure|treat)|sleeping\s+pills?\s+for\s+concussion)\b/i,
]

// Clearance & return to play/work/drive intent patterns for AI guardrail
const AI_CLEARANCE_PATTERNS = [
  /\b(can\s+i\s+play|can\s+i\s+return\s+to|can\s+.+\s+return\s+to|how\s+long\s+before\s+.+\s+can\s+return|am\s+i\s+cleared|cleared\s+to\s+(play|drive|work|sport|contact)|clearance\s+certificate|clear\s+me\s+for|can\s+i\s+drive\s+tomorrow|can\s+i\s+spar|can\s+i\s+box|can\s+i\s+practice)\b/i,
]

// Danger sign dismissal / override patterns for AI guardrail
const AI_OVERRIDE_PATTERNS = [
  /\b(is\s+it\s+safe\s+to\s+ignore|can\s+i\s+ignore|can\s+i\s+dismiss|safe\s+to\s+dismiss|don'?t\s+need\s+(a\s+doctor|to\s+go\s+to\s+the\s+er)|tell\s+me\s+my\s+.*is\s+nothing\s+to\s+worry\s+about)\b/i,
]


const SEVERITY_ORDER: Record<SafetySeverity, number> = {
  emergency: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
}

/**
 * Evaluates danger signs against versioned Tier 1 clinical rules.
 */
function evaluateDangerSigns(dangerSigns: string[]): MatchedRuleDetail[] {
  const matches: MatchedRuleDetail[] = []
  if (!dangerSigns || dangerSigns.length === 0) return matches

  for (const sign of dangerSigns) {
    const s = sign.toLowerCase()
    let matchedRule: SafetyRule | undefined

    if (s.includes('pupil')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-PUPIL']
    } else if (s.includes('drowsiness') || s.includes('wake up') || s.includes('sleepy')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-DROWSINESS']
    } else if (s.includes('worsening headache') || s.includes('headache that gets worse')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-HEADACHE-WORSENING']
    } else if (s.includes('speech') || s.includes('weakness') || s.includes('numbness') || s.includes('coordination')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-WEAKNESS']
    } else if (s.includes('vomiting') || s.includes('nausea')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-VOMITING']
    } else if (s.includes('seizure') || s.includes('convulsion')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-SEIZURE']
    } else if (s.includes('confusion') || s.includes('agitation') || s.includes('behavior')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-CONFUSION']
    } else if (s.includes('loss of consciousness') || s.includes('passed out') || s.includes('blackout')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-LOSS-CONSCIOUSNESS']
    } else if (s.includes('neck')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-NECK-PAIN']
    } else if (s.includes('fluid') || s.includes('bleeding')) {
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-FLUID']
    } else {
      // General red flag fallback
      matchedRule = SAFETY_RULES['RULE-RED-FLAG-HEADACHE-WORSENING']
    }

    if (matchedRule) {
      matches.push({
        ...matchedRule,
        matchedEvidenceSummary: `dangerSign: "${sign}"`,
      })
    }
  }

  return matches
}

/**
 * Scans free text for red flag keywords.
 */
function evaluateTextForRedFlags(text?: string): MatchedRuleDetail[] {
  if (!text) return []
  const matches: MatchedRuleDetail[] = []

  for (const pattern of RED_FLAG_TEXT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const rule = SAFETY_RULES['RULE-TEXT-RED-FLAG']
      matches.push({
        ...rule,
        matchedEvidenceSummary: `keywordTrigger: "${match[0]}"`,
      })
      break // Single red flag text trigger is sufficient
    }
  }

  return matches
}

/**
 * Evaluates AI queries against prohibited intent guardrails.
 */
function evaluateAiQueryGuardrails(queryText?: string): MatchedRuleDetail[] {
  if (!queryText) return []
  const matches: MatchedRuleDetail[] = []
  const q = queryText.trim()

  for (const pattern of AI_DIAGNOSTIC_PATTERNS) {
    if (pattern.test(q)) {
      matches.push({
        ...SAFETY_RULES['RULE-AI-GUARD-DIAGNOSIS'],
        matchedEvidenceSummary: 'prohibitedIntent: "medical_diagnosis_inquiry"',
      })
      break
    }
  }

  for (const pattern of AI_PRESCRIPTION_PATTERNS) {
    if (pattern.test(q)) {
      matches.push({
        ...SAFETY_RULES['RULE-AI-GUARD-PRESCRIPTION'],
        matchedEvidenceSummary: 'prohibitedIntent: "medication_prescription_inquiry"',
      })
      break
    }
  }

  for (const pattern of AI_CLEARANCE_PATTERNS) {
    if (pattern.test(q)) {
      matches.push({
        ...SAFETY_RULES['RULE-AI-GUARD-CLEARANCE'],
        matchedEvidenceSummary: 'prohibitedIntent: "activity_clearance_inquiry"',
      })
      break
    }
  }

  for (const pattern of AI_OVERRIDE_PATTERNS) {
    if (pattern.test(q)) {
      matches.push({
        ...SAFETY_RULES['RULE-AI-GUARD-OVERRIDE'],
        matchedEvidenceSummary: 'prohibitedIntent: "danger_sign_dismissal_attempt"',
      })
      break
    }
  }

  return matches
}

/**
 * Evaluates symptom totals and trajectory slopes against clinical triage rules.
 */
function evaluateSymptomTriage(
  symptomTotal: number,
  history?: LongitudinalRecord[],
  currentSymptoms?: Partial<ConcussionSymptoms>
): MatchedRuleDetail[] {
  const matches: MatchedRuleDetail[] = []

  // High total symptom burden (>= 30/48)
  if (symptomTotal >= 30) {
    matches.push({
      ...SAFETY_RULES['RULE-TRIAGE-ELEVATED-SCORE'],
      matchedEvidenceSummary: `symptomTotal: ${symptomTotal} (threshold: >= 30)`,
    })
  } else if (symptomTotal >= 15) {
    // Moderate symptom burden (15-29/48)
    matches.push({
      ...SAFETY_RULES['RULE-TRIAGE-REVIEW-SCORE'],
      matchedEvidenceSummary: `symptomTotal: ${symptomTotal} (threshold: 15-29)`,
    })
  }

  // Trajectory evaluation (spike over last 3 days)
  if (history && history.length >= 2) {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date))
    const threeDaysPrior = sorted[Math.max(0, sorted.length - 3)]
    const delta = symptomTotal - threeDaysPrior.symptomTotal

    if (delta >= 6) {
      matches.push({
        ...SAFETY_RULES['RULE-TRIAGE-TRAJECTORY-SPIKE'],
        matchedEvidenceSummary: `trajectoryDelta: +${delta} points over 3-day window (threshold: >= 6)`,
      })
    }

    // Plateau evaluation (> 14 days without improvement)
    if (sorted.length >= 14) {
      const recent14 = sorted.slice(-14)
      const maxInWindow = Math.max(...recent14.map(r => r.symptomTotal))
      const minInWindow = Math.min(...recent14.map(r => r.symptomTotal))
      if (maxInWindow - minInWindow <= 2 && symptomTotal >= 15) {
        matches.push({
          ...SAFETY_RULES['RULE-TRIAGE-PLATEAU'],
          matchedEvidenceSummary: `plateauDuration: 14+ days with minimal variation (${minInWindow}-${maxInWindow})`,
        })
      }
    }
  }

  // Single severe symptom evaluation (rating >= 5 for >= 7 days)
  if (currentSymptoms && history && history.length >= 6) {
    const symptomKeys: (keyof ConcussionSymptoms)[] = [
      'headache',
      'dizziness',
      'nausea',
      'lightSensitivity',
      'noiseSensitivity',
      'fatigue',
      'concentration',
      'sleepDifficulty',
    ]

    for (const key of symptomKeys) {
      const currentVal = currentSymptoms[key]
      if (typeof currentVal === 'number' && currentVal >= 5) {
        const recent = history.slice(-6)
        const consistentlySevere = recent.every(
          r => r.symptoms && typeof r.symptoms[key] === 'number' && (r.symptoms[key] ?? 0) >= 5
        )
        if (consistentlySevere) {
          matches.push({
            ...SAFETY_RULES['RULE-TRIAGE-SINGLE-SEVERE'],
            matchedEvidenceSummary: `severeSymptom: "${key}" rated >= 5 for 7 consecutive entries`,
          })
          break
        }
      }
    }
  }

  return matches
}

/**
 * Validates 8-symptom inventory completeness.
 */
function checkSymptomCompleteness(symptoms?: Partial<ConcussionSymptoms>): boolean {
  if (!symptoms) return false
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
  return fields.every(
    f => typeof symptoms[f] === 'number' && !isNaN(symptoms[f]!) && symptoms[f]! >= 0 && symptoms[f]! <= 6
  )
}

/**
 * Main Deterministic Safety Engine Evaluator.
 *
 * Evaluates any input context idempotently, checks clinical boundaries,
 * applies fail-safe defaults when data is incomplete or contradictory,
 * and produces a non-diagnostic, privacy-minimized SafetyEvaluationResult.
 */
export function evaluateSafety(context: SafetyEvaluationContext): SafetyEvaluationResult {
  const matchedRules: MatchedRuleDetail[] = []
  let failSafeApplied = false
  const blockedActions: string[] = []

  // 1. Data Integrity & Completeness Check (Fail-Safe Defaults)
  if (context.contextType === 'check_in' || context.contextType === 'baseline') {
    const isComplete = checkSymptomCompleteness(context.symptoms)
    if (!isComplete) {
      matchedRules.push({
        ...SAFETY_RULES['RULE-DATA-INCOMPLETE'],
        matchedEvidenceSummary: 'dataIntegrity: missing or invalid symptom rating fields',
      })
      failSafeApplied = true
    }
  }

  // 2. Data Conflict Check (e.g. Zero symptoms reported but free text contains red flags)
  const freeTextMatches = evaluateTextForRedFlags(context.note || context.text)
  if (freeTextMatches.length > 0) {
    matchedRules.push(...freeTextMatches)

    // Detect internal contradiction if symptom total is 0 or low while severe red flags exist in notes
    const computedTotal = context.symptomTotal ?? 0
    if (computedTotal === 0 && (!context.dangerSigns || context.dangerSigns.length === 0)) {
      matchedRules.push({
        ...SAFETY_RULES['RULE-DATA-CONFLICT'],
        matchedEvidenceSummary: 'conflictDetected: zero symptom rating with acute red flag text mention',
      })
      failSafeApplied = true
    }
  }

  // 3. Tier 1: Emergency Danger Signs Evaluation
  if (context.dangerSigns && context.dangerSigns.length > 0) {
    const dangerMatches = evaluateDangerSigns(context.dangerSigns)
    matchedRules.push(...dangerMatches)

    if (context.contextType === 'onboarding' || context.contextType === 'baseline') {
      matchedRules.push({
        ...SAFETY_RULES['RULE-ONBOARDING-ACUTE-RED-FLAG'],
        matchedEvidenceSummary: `${context.contextType}DangerSigns: ${context.dangerSigns.length} selected`,
      })
    }
  }

  // 4. Tier 2: Symptom Burden & Trajectory Triage Evaluation
  if (context.symptomTotal !== undefined) {
    const triageMatches = evaluateSymptomTriage(
      context.symptomTotal,
      context.longitudinalHistory,
      context.symptoms
    )
    matchedRules.push(...triageMatches)

    if (
      (context.contextType === 'onboarding' || context.contextType === 'baseline') &&
      context.symptomTotal >= 35
    ) {
      matchedRules.push({
        ...SAFETY_RULES['RULE-ONBOARDING-HIGH-INITIAL-BURDEN'],
        matchedEvidenceSummary: `${context.contextType}SymptomTotal: ${context.symptomTotal} (threshold: >= 35)`,
      })
    }
  }

  // 5. Tier 3: AI Query Guardrails Evaluation
  if (context.contextType === 'ai_query' || context.queryText) {
    const guardrailMatches = evaluateAiQueryGuardrails(context.queryText)
    matchedRules.push(...guardrailMatches)
  }

  // 6. Tier 4: Pacing & Active Recovery Evaluation
  if (context.daysSinceInjury !== undefined && context.daysSinceInjury <= 2) {
    matchedRules.push({
      ...SAFETY_RULES['RULE-PACING-ACUTE-REST'],
      matchedEvidenceSummary: `daysSinceInjury: ${context.daysSinceInjury} <= 2 days`,
    })
  }

  if (
    context.symptoms?.headache &&
    context.symptoms.headache >= 3 &&
    ((context.screenMinutes && context.screenMinutes >= 180) ||
      (context.cognitiveMinutes && context.cognitiveMinutes >= 180))
  ) {
    matchedRules.push({
      ...SAFETY_RULES['RULE-PACING-EXERTION-HEADACHE'],
      matchedEvidenceSummary: `exertionHeadacheCoincidence: headache=${context.symptoms.headache}, screenMin=${context.screenMinutes ?? 0}, cognitiveMin=${context.cognitiveMinutes ?? 0}`,
    })
  }

  // Deduplicate matched rules by ruleId, keeping unique matches
  const uniqueRulesMap = new Map<string, MatchedRuleDetail>()
  for (const r of matchedRules) {
    if (!uniqueRulesMap.has(r.ruleId)) {
      uniqueRulesMap.set(r.ruleId, r)
    }
  }
  const uniqueMatches = Array.from(uniqueRulesMap.values())

  // Sort matched rules by severity descending
  uniqueMatches.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])

  // Determine overall status, highest severity, primary escalation, and blocked actions
  let status: SafetyEvaluationStatus = 'safe'
  let highestSeverity: SafetySeverity | 'none' = 'none'
  let primaryEscalation: EscalationPath | 'none' = 'none'

  if (uniqueMatches.length > 0) {
    highestSeverity = uniqueMatches[0].severity
    primaryEscalation = uniqueMatches[0].escalationPath

    if (highestSeverity === 'emergency') {
      status = 'emergency'
      blockedActions.push('allow_routine_completion', 'invoke_llm', 'generate_ai_insight', 'clear_activity')
    } else if (highestSeverity === 'high') {
      status = 'elevated'
      // If AI guardrail triggered, block LLM invocation
      if (uniqueMatches.some(m => m.category === 'ai_query_guardrail')) {
        blockedActions.push('invoke_llm')
      }
      if (uniqueMatches.some(m => m.category === 'clinical_triage' || m.category === 'data_integrity')) {
        blockedActions.push('clear_activity')
      }
    } else if (highestSeverity === 'medium') {
      status = 'review'
    } else if (highestSeverity === 'low' || highestSeverity === 'info') {
      status = 'warning'
    }
  }

  const isSafe = status === 'safe' || status === 'warning'

  return {
    evaluationId: `eval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    status,
    isSafe,
    highestSeverity,
    primaryEscalation,
    matchedRules: uniqueMatches,
    blockedActions,
    failSafeApplied,
    ruleEngineVersion: RULE_REGISTRY_VERSION,
    evaluatedAt: Date.now(),
  }
}

/**
 * Convenience helper for check-in evaluation.
 */
export function evaluateCheckIn(
  symptoms: ConcussionSymptoms,
  dangerSigns: string[] = [],
  note?: string,
  history?: LongitudinalRecord[],
  activityExposures?: { screenMinutes?: number; cognitiveMinutes?: number }
): SafetyEvaluationResult {
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
  for (const f of fields) {
    total += symptoms[f] ?? 0
  }

  return evaluateSafety({
    contextType: 'check_in',
    symptoms,
    symptomTotal: total,
    dangerSigns,
    note,
    longitudinalHistory: history,
    screenMinutes: activityExposures?.screenMinutes,
    cognitiveMinutes: activityExposures?.cognitiveMinutes,
  })
}

/**
 * Convenience helper for AI Query guardrail screening.
 */
export function evaluateAiQuery(queryText: string): SafetyEvaluationResult {
  return evaluateSafety({
    contextType: 'ai_query',
    queryText,
  })
}

/**
 * Convenience helper for unstructured free-text screening.
 */
export function evaluateFreeText(text: string): SafetyEvaluationResult {
  return evaluateSafety({
    contextType: 'free_text',
    text,
  })
}

/**
 * Convenience helper for initial recovery onboarding screening.
 */
export function evaluateOnboarding(
  baselineSymptoms: Partial<ConcussionSymptoms>,
  dangerSigns: string[] = [],
  daysSinceInjury?: number
): SafetyEvaluationResult {
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
  for (const f of fields) {
    if (typeof baselineSymptoms[f] === 'number') {
      total += baselineSymptoms[f]!
    }
  }

  return evaluateSafety({
    contextType: 'onboarding',
    symptoms: baselineSymptoms,
    symptomTotal: total,
    dangerSigns,
    daysSinceInjury,
  })
}

/**
 * Convenience helper for initial recovery baseline assessment screening.
 */
export function evaluateBaseline(
  symptoms: ConcussionSymptoms,
  dangerSigns: string[] = [],
  daysSinceInjury?: number,
  incidentContext?: string
): SafetyEvaluationResult {
  const symptomTotal = validateConcussionSymptoms(symptoms)

  return evaluateSafety({
    contextType: 'baseline',
    symptoms,
    symptomTotal,
    dangerSigns,
    daysSinceInjury,
    note: incidentContext,
  })
}

export interface StructuredExtractionCandidate {
  status?: 'pending' | 'confirmed' | 'discarded'
  symptom?: { field: string; severity?: number }
  activity?: { domain: string; activityType: string }
  duration?: { minutes?: number }
}

/**
 * Evaluates user-confirmed structured extraction candidates before storage.
 * Aggregates symptom and activity exposure signals for pacing rules.
 */
export function evaluateStructuredExtraction(
  candidates: StructuredExtractionCandidate[]
): SafetyEvaluationResult {
  const confirmed = candidates.filter(c => c.status === 'confirmed')

  const symptoms: Partial<ConcussionSymptoms> = {}
  let screenMinutes = 0
  let cognitiveMinutes = 0

  for (const candidate of confirmed) {
    if (candidate.symptom?.field) {
      const field = candidate.symptom.field as keyof ConcussionSymptoms
      const severity = candidate.symptom.severity ?? 0
      symptoms[field] = Math.max(symptoms[field] ?? 0, severity)
    }

    const minutes = candidate.duration?.minutes ?? 0
    if (candidate.activity?.domain === 'screen') {
      screenMinutes += minutes
    }
    if (
      candidate.activity?.domain === 'cognitive' ||
      candidate.activity?.domain === 'work_school'
    ) {
      cognitiveMinutes += minutes
    }
  }

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
  let symptomTotal = 0
  for (const field of fields) {
    if (typeof symptoms[field] === 'number') {
      symptomTotal += symptoms[field]!
    }
  }

  return evaluateSafety({
    contextType: 'structured_extraction',
    symptoms,
    symptomTotal,
    screenMinutes: screenMinutes > 0 ? screenMinutes : undefined,
    cognitiveMinutes: cognitiveMinutes > 0 ? cognitiveMinutes : undefined,
  })
}
