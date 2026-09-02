import { describe, expect, it } from 'vitest'
import {
  ESCALATION_PRESENTATION,
  MANDATORY_MEDICAL_DISCLAIMER,
  OUTPUT_CODE_PRESENTATION,
  SAFETY_STATUS_PRESENTATION,
} from './presentation'
import { SAFETY_OUTPUT_CODES } from '@/convex/lib/safetyRules'

describe('safety presentation layer', () => {
  it('maps every safety status to accessible badge configuration', () => {
    expect(SAFETY_STATUS_PRESENTATION.safe.label).toBe('Stable')
    expect(SAFETY_STATUS_PRESENTATION.emergency.label).toBe('Emergency Red Flag')
    expect(SAFETY_STATUS_PRESENTATION.emergency.className).toContain('animate-pulse')
  })

  it('provides emergency escalation with 911 call action', () => {
    const emergency = ESCALATION_PRESENTATION.emergency_911_ed
    expect(emergency.isEmergency).toBe(true)
    expect(emergency.callPhoneNumber).toBe('911')
  })

  it('covers all safety output codes with non-diagnostic user summaries', () => {
    for (const code of Object.values(SAFETY_OUTPUT_CODES)) {
      const info = OUTPUT_CODE_PRESENTATION[code]
      expect(info, `missing presentation for ${code}`).toBeDefined()
      expect(info.title.length).toBeGreaterThan(0)
      expect(info.userSummary.toLowerCase()).not.toMatch(/\byou are diagnosed\b/)
    }
  })

  it('includes mandatory medical disclaimer required on all portals', () => {
    expect(MANDATORY_MEDICAL_DISCLAIMER).toContain('does not provide medical advice')
    expect(MANDATORY_MEDICAL_DISCLAIMER).toContain('call 911')
  })
})
