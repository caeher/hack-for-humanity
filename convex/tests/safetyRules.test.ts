import { describe, expect, it } from 'vitest'
import {
  RULE_REGISTRY_VERSION,
  SAFETY_OUTPUT_CODES,
  SAFETY_RULES,
} from '../lib/safetyRules'

describe('Safety Rules Registry & Evidence Governance', () => {
  it('has a valid semantic registry version', () => {
    expect(RULE_REGISTRY_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(RULE_REGISTRY_VERSION).toBe('1.0.0')
  })

  it('contains registered clinical rules covering all 4 tiers and data integrity', () => {
    const rules = Object.values(SAFETY_RULES)
    expect(rules.length).toBeGreaterThanOrEqual(15)

    const categories = new Set(rules.map(r => r.category))
    expect(categories).toContain('emergency_danger_sign')
    expect(categories).toContain('clinical_triage')
    expect(categories).toContain('ai_query_guardrail')
    expect(categories).toContain('pacing_guidance')
    expect(categories).toContain('onboarding_baseline')
    expect(categories).toContain('free_text_alert')
    expect(categories).toContain('data_integrity')
  })

  it('verifies every rule is traceable to an approved authority, citation, section, and reviewer', () => {
    for (const [ruleId, rule] of Object.entries(SAFETY_RULES)) {
      expect(rule.ruleId).toBe(ruleId)
      expect(rule.version).toBe(RULE_REGISTRY_VERSION)
      expect(rule.name.length).toBeGreaterThan(3)

      // Evidence traceability verification
      expect(rule.evidenceSource).toBeDefined()
      expect(rule.evidenceSource.authority.length).toBeGreaterThan(0)
      expect(rule.evidenceSource.citation.length).toBeGreaterThan(10)
      expect(rule.evidenceSource.guidelineSection.length).toBeGreaterThan(5)
      expect(rule.evidenceSource.approvedBy).toMatch(/Clinical Safety Governance Board|Dr\. Sarah Lin/)
      expect(rule.evidenceSource.reviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // Machine-readable output code verification
      expect(rule.outputCode).toBeDefined()
      expect(Object.values(SAFETY_OUTPUT_CODES)).toContain(
        rule.outputCode as (typeof SAFETY_OUTPUT_CODES)[keyof typeof SAFETY_OUTPUT_CODES]
      )

      // Fallback user guidance verification
      expect(rule.userGuidance).toBeDefined()
      expect(rule.userGuidance.guidanceCode).toMatch(/^GUIDANCE-/)
      expect(rule.userGuidance.guidanceKey.length).toBeGreaterThan(0)
      expect(rule.userGuidance.defaultSafeText.length).toBeGreaterThan(20)

      // Required inputs array verification
      expect(Array.isArray(rule.requiredInputs)).toBe(true)
      expect(rule.requiredInputs.length).toBeGreaterThan(0)
    }
  })

  it('guarantees user guidance copy strictly avoids diagnostic claims or promises of cure', () => {
    for (const rule of Object.values(SAFETY_RULES)) {
      const text = rule.userGuidance.defaultSafeText.toLowerCase()

      // Diagnostic claim red lines
      expect(text).not.toContain('you are diagnosed')
      expect(text).not.toContain('you have a concussion')
      expect(text).not.toContain('you are cured')
      expect(text).not.toContain('recovery score')
      expect(text).not.toContain('healing index')

      // Prescription red lines
      expect(text).not.toContain('take 400mg')
      expect(text).not.toContain('take 800mg')
      expect(text).not.toContain('prescribed dosage')

      // Activity clearance red lines
      expect(text).not.toContain('you are cleared to play')
      expect(text).not.toContain('cleared for full contact')
    }
  })

  it('properly maps Tier 1 danger signs to emergency severity and emergency escalation path', () => {
    const dangerRules = Object.values(SAFETY_RULES).filter(
      r => r.category === 'emergency_danger_sign'
    )
    expect(dangerRules.length).toBeGreaterThanOrEqual(8)

    for (const rule of dangerRules) {
      expect(rule.severity).toBe('emergency')
      expect(rule.escalationPath).toBe('emergency_911_ed')
      expect(rule.outputCode).toBe(SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED)
    }
  })

  it('properly maps Tier 3 AI guardrails to refusal redirect escalation path', () => {
    const aiGuardrails = Object.values(SAFETY_RULES).filter(
      r => r.category === 'ai_query_guardrail'
    )
    expect(aiGuardrails.length).toBe(4)

    for (const rule of aiGuardrails) {
      expect(rule.severity).toBe('high')
      expect(rule.escalationPath).toBe('ai_refusal_redirect')
    }
  })
})
