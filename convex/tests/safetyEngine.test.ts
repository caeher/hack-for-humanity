import { describe, expect, it } from 'vitest'
import {
  evaluateAiQuery,
  evaluateCheckIn,
  evaluateFreeText,
  evaluateOnboarding,
  evaluateSafety,
  LongitudinalRecord,
} from '../lib/safetyEngine'
import { RULE_REGISTRY_VERSION, SAFETY_OUTPUT_CODES } from '../lib/safetyRules'
import { ConcussionSymptoms } from '../lib/businessLogic'

describe('Deterministic Safety Engine Core Pipeline', () => {
  const healthySymptoms: ConcussionSymptoms = {
    headache: 1,
    dizziness: 0,
    nausea: 0,
    lightSensitivity: 1,
    noiseSensitivity: 0,
    fatigue: 1,
    concentration: 1,
    sleepDifficulty: 0,
  }

  // --- 1. POSITIVE CASES ---
  describe('Positive / Routine Cases', () => {
    it('evaluates clean low-symptom check-in as safe with no blocked actions', () => {
      const result = evaluateCheckIn(healthySymptoms, [])

      expect(result.status).toBe('safe')
      expect(result.isSafe).toBe(true)
      expect(result.highestSeverity).toBe('none')
      expect(result.primaryEscalation).toBe('none')
      expect(result.blockedActions).toHaveLength(0)
      expect(result.failSafeApplied).toBe(false)
      expect(result.ruleEngineVersion).toBe(RULE_REGISTRY_VERSION)
      expect(result.evaluationId).toBeDefined()
    })

    it('evaluates benign informational AI query without blocking', () => {
      const result = evaluateAiQuery('What is the recommended sleep hygiene protocol during recovery?')

      expect(result.status).toBe('safe')
      expect(result.isSafe).toBe(true)
      expect(result.blockedActions).not.toContain('invoke_llm')
      expect(result.matchedRules).toHaveLength(0)
    })
  })

  // --- 2. BOUNDARY CASES ---
  describe('Boundary Value Cases (Symptom Totals & Trajectories)', () => {
    const makeSymptomsWithTotal = (targetTotal: number): ConcussionSymptoms => {
      const sym: ConcussionSymptoms = {
        headache: 0,
        dizziness: 0,
        nausea: 0,
        lightSensitivity: 0,
        noiseSensitivity: 0,
        fatigue: 0,
        concentration: 0,
        sleepDifficulty: 0,
      }
      let remaining = targetTotal
      const keys: (keyof ConcussionSymptoms)[] = [
        'headache',
        'dizziness',
        'nausea',
        'lightSensitivity',
        'noiseSensitivity',
        'fatigue',
        'concentration',
        'sleepDifficulty',
      ]
      for (const k of keys) {
        const val = Math.min(6, remaining)
        sym[k] = val
        remaining -= val
      }
      return sym
    }

    it('classifies total = 0 as safe', () => {
      const result = evaluateCheckIn(makeSymptomsWithTotal(0))
      expect(result.status).toBe('safe')
    })

    it('classifies total = 14 (upper bound of stable) as safe', () => {
      const result = evaluateCheckIn(makeSymptomsWithTotal(14))
      expect(result.status).toBe('safe')
    })

    it('classifies total = 15 (lower bound of review) as review status', () => {
      const result = evaluateCheckIn(makeSymptomsWithTotal(15))
      expect(result.status).toBe('review')
      expect(result.highestSeverity).toBe('medium')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.TRIAGE_REVIEW_BURDEN)).toBe(true)
    })

    it('classifies total = 29 (upper bound of review) as review status', () => {
      const result = evaluateCheckIn(makeSymptomsWithTotal(29))
      expect(result.status).toBe('review')
      expect(result.highestSeverity).toBe('medium')
    })

    it('classifies total = 30 (lower bound of elevated) as elevated risk', () => {
      const result = evaluateCheckIn(makeSymptomsWithTotal(30))
      expect(result.status).toBe('elevated')
      expect(result.highestSeverity).toBe('high')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.TRIAGE_ELEVATED_BURDEN)).toBe(true)
    })

    it('classifies total = 48 (maximum possible score) as elevated risk', () => {
      const result = evaluateCheckIn(makeSymptomsWithTotal(48))
      expect(result.status).toBe('elevated')
      expect(result.highestSeverity).toBe('high')
    })

    it('does not trigger trajectory spike when 3-day delta is +5 points', () => {
      const history: LongitudinalRecord[] = [
        { date: '2026-08-28', symptomTotal: 10 },
        { date: '2026-08-29', symptomTotal: 12 },
        { date: '2026-08-30', symptomTotal: 13 },
      ]
      // Today total = 15 (delta = 15 - 10 = +5)
      const result = evaluateCheckIn(makeSymptomsWithTotal(15), [], undefined, history)
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.TRIAGE_TRAJECTORY_SPIKE)).toBe(false)
    })

    it('triggers trajectory spike when 3-day delta is +6 points (boundary)', () => {
      const history: LongitudinalRecord[] = [
        { date: '2026-08-28', symptomTotal: 10 },
        { date: '2026-08-29', symptomTotal: 12 },
        { date: '2026-08-30', symptomTotal: 14 },
      ]
      // Today total = 16 (delta = 16 - 10 = +6)
      const result = evaluateCheckIn(makeSymptomsWithTotal(16), [], undefined, history)
      expect(result.status).toBe('elevated')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.TRIAGE_TRAJECTORY_SPIKE)).toBe(true)
      expect(result.primaryEscalation).toBe('urgent_clinician_triage')
    })

    it('triggers plateau rule when symptoms remain unvaried for 14+ days', () => {
      const history: LongitudinalRecord[] = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, '0')}`,
        symptomTotal: 18,
      }))
      const result = evaluateCheckIn(makeSymptomsWithTotal(18), [], undefined, history)
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.TRIAGE_PERSISTENT_PLATEAU)).toBe(true)
    })
  })

  // --- 3. NEGATIVE CASES (EMERGENCY & GUARDRAILS) ---
  describe('Tier 1 Emergency Danger Signs Intercept', () => {
    it('intercepts check-in with single CDC danger sign (e.g. repeated vomiting)', () => {
      const result = evaluateCheckIn(healthySymptoms, ['Repeated vomiting or nausea'])

      expect(result.status).toBe('emergency')
      expect(result.isSafe).toBe(false)
      expect(result.highestSeverity).toBe('emergency')
      expect(result.primaryEscalation).toBe('emergency_911_ed')
      expect(result.blockedActions).toContain('allow_routine_completion')
      expect(result.blockedActions).toContain('invoke_llm')
      expect(result.blockedActions).toContain('generate_ai_insight')
      expect(result.matchedRules[0].outputCode).toBe(SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED)
    })

    it('handles multiple danger signs and prioritizes highest emergency severity', () => {
      const result = evaluateCheckIn(healthySymptoms, [
        'One pupil larger than the other',
        'Seizures or convulsions',
        'Slurred speech, weakness, numbness, or decreased coordination',
      ])

      expect(result.status).toBe('emergency')
      expect(result.highestSeverity).toBe('emergency')
      expect(result.matchedRules.length).toBeGreaterThanOrEqual(3)
      expect(result.primaryEscalation).toBe('emergency_911_ed')
    })

    it('detects emergency red-flag keywords in free-text notes', () => {
      const result = evaluateCheckIn(
        healthySymptoms,
        [],
        'I felt dizzy and then I passed out for about 30 seconds.'
      )

      expect(result.status).toBe('emergency')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.EMERGENCY_RED_FLAG_KEYWORD_DETECTED)).toBe(true)
      expect(result.primaryEscalation).toBe('emergency_911_ed')
    })
  })

  describe('Tier 3 Prohibited AI Query Guardrails', () => {
    it('intercepts diagnosis inquiry and blocks LLM invocation', () => {
      const result = evaluateAiQuery('Do I have a concussion after my bike crash yesterday?')

      expect(result.status).toBe('elevated')
      expect(result.isSafe).toBe(false)
      expect(result.blockedActions).toContain('invoke_llm')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.GUARDRAIL_DIAGNOSTIC_ATTEMPT)).toBe(true)
      expect(result.primaryEscalation).toBe('ai_refusal_redirect')
      expect(result.matchedRules[0].userGuidance.defaultSafeText).toContain('cannot provide medical diagnoses')
    })

    it('intercepts medication / dosage prescription inquiry', () => {
      const result = evaluateAiQuery('How much ibuprofen can I take every 4 hours for my headache?')

      expect(result.status).toBe('elevated')
      expect(result.blockedActions).toContain('invoke_llm')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.GUARDRAIL_PRESCRIPTION_ATTEMPT)).toBe(true)
      expect(result.matchedRules[0].userGuidance.defaultSafeText).toContain('does not recommend or prescribe medications')
    })

    it('intercepts return-to-sport clearance inquiry', () => {
      const result = evaluateAiQuery('Can I play in the soccer tournament tomorrow if I feel fine?')

      expect(result.status).toBe('elevated')
      expect(result.blockedActions).toContain('invoke_llm')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.GUARDRAIL_CLEARANCE_ATTEMPT)).toBe(true)
      expect(result.matchedRules[0].userGuidance.defaultSafeText).toContain('cannot clear anyone to return to sports')
    })

    it('intercepts danger sign dismissal / reassurance override inquiry', () => {
      const result = evaluateAiQuery('Is it safe to ignore my repeated vomiting since I hit my head?')

      expect(result.status).toBe('elevated')
      expect(result.blockedActions).toContain('invoke_llm')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.GUARDRAIL_OVERRIDE_ATTEMPT)).toBe(true)
      expect(result.matchedRules[0].userGuidance.defaultSafeText).toContain('must never be ignored or dismissed')
    })
  })

  // --- 4. FAIL-SAFE & CONFLICT HANDLING ---
  describe('Incomplete & Conflicting Data (Fail-Safe Defaults)', () => {
    it('applies fail-safe when symptom fields are missing in check-in', () => {
      const incompleteSymptoms: Partial<ConcussionSymptoms> = {
        headache: 2,
        dizziness: 1,
      }

      const result = evaluateSafety({
        contextType: 'check_in',
        symptoms: incompleteSymptoms,
        symptomTotal: 3,
      })

      expect(result.failSafeApplied).toBe(true)
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.DATA_INCOMPLETE_FAILSAFE)).toBe(true)
      expect(result.primaryEscalation).toBe('data_verification_prompt')
    })

    it('applies fail-safe when zero symptom ratings conflict with red-flag note text', () => {
      const zeroSymptoms = {
        headache: 0,
        dizziness: 0,
        nausea: 0,
        lightSensitivity: 0,
        noiseSensitivity: 0,
        fatigue: 0,
        concentration: 0,
        sleepDifficulty: 0,
      }

      const result = evaluateSafety({
        contextType: 'check_in',
        symptoms: zeroSymptoms,
        symptomTotal: 0,
        dangerSigns: [],
        note: 'I threw up 3 times and had a seizure this morning.',
      })

      expect(result.failSafeApplied).toBe(true)
      expect(result.status).toBe('emergency') // Red flag takes precedence over zero score
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.DATA_CONFLICT_FAILSAFE)).toBe(true)
    })
  })

  // --- 5. ONBOARDING & FREE TEXT SCREENING ---
  describe('Onboarding and Free Text Screening', () => {
    it('identifies acute red flags during initial onboarding evaluation', () => {
      const result = evaluateOnboarding(
        { headache: 4, dizziness: 3 },
        ['Unequal pupil size'],
        1
      )

      expect(result.status).toBe('emergency')
      expect(result.highestSeverity).toBe('emergency')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.ONBOARDING_ACUTE_RED_FLAG)).toBe(true)
    })

    it('identifies high baseline burden (>= 35) during onboarding', () => {
      const highBaseline = {
        headache: 5,
        dizziness: 5,
        nausea: 4,
        lightSensitivity: 5,
        noiseSensitivity: 5,
        fatigue: 5,
        concentration: 4,
        sleepDifficulty: 4,
      }
      const result = evaluateOnboarding(highBaseline, [], 3)

      expect(result.status).toBe('elevated')
      expect(result.matchedRules.some(r => r.outputCode === SAFETY_OUTPUT_CODES.ONBOARDING_HIGH_INITIAL_BURDEN)).toBe(true)
    })

    it('scans free text notes independently', () => {
      const cleanResult = evaluateFreeText('Took a short 15 minute walk in the morning.')
      expect(cleanResult.status).toBe('safe')

      const redFlagResult = evaluateFreeText('Experienced severe numbness in left arm after impact.')
      expect(redFlagResult.status).toBe('emergency')
    })
  })

  // --- 6. PRIVACY & SENSITIVE PAYLOAD MINIMIZATION ---
  describe('Sensitive Payload Minimization', () => {
    it('produces privacy-minimized matchedEvidenceSummary without full user text or raw PII', () => {
      const result = evaluateCheckIn(
        healthySymptoms,
        ['Repeated vomiting or nausea'],
        'My confidential personal medical details here.'
      )

      for (const match of result.matchedRules) {
        expect(match.matchedEvidenceSummary).not.toContain('confidential')
        expect(match.matchedEvidenceSummary).not.toContain('personal medical details')
      }
    })
  })
})
