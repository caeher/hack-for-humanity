import { describe, expect, it } from 'vitest'
import {
  getSafetyOutcomeCopy,
  resolveSafetyOutcomeState,
  severityToAccessibleLabel,
} from './copy'
import { detectEmergencyRegion, getEmergencyGuidance } from './emergency'

describe('safety copy', () => {
  it('maps emergency status to urgent state', () => {
    expect(resolveSafetyOutcomeState('emergency', false)).toBe('urgent')
    const copy = getSafetyOutcomeCopy('urgent')
    expect(copy.actionHeading).toMatch(/emergency medical help/i)
    expect(copy.acknowledgementDisclaimer).toMatch(/not clinical resolution|does not replace/i)
  })

  it('maps fail-safe to insufficient_information', () => {
    expect(resolveSafetyOutcomeState('review', true)).toBe('insufficient_information')
  })

  it('includes pediatric caregiver language', () => {
    const copy = getSafetyOutcomeCopy('urgent', 'pediatric')
    expect(copy.actionBody).toMatch(/parent or guardian/i)
  })

  it('provides accessible severity labels without relying on color', () => {
    expect(severityToAccessibleLabel('emergency')).toMatch(/emergency/i)
    expect(severityToAccessibleLabel('high')).toMatch(/high priority/i)
  })
})

describe('emergency guidance', () => {
  it('includes US and non-US wording', () => {
    const us = getEmergencyGuidance('us')
    expect(us.primaryActionHref).toBe('tel:911')
    expect(us.secondaryGuidance).toMatch(/outside the united states/i)

    const nonUs = getEmergencyGuidance('non-us')
    expect(nonUs.primaryActionLabel).toMatch(/local emergency/i)
    expect(nonUs.secondaryGuidance).toMatch(/911/)
  })

  it('detectEmergencyRegion returns a valid region', () => {
    const region = detectEmergencyRegion()
    expect(['us', 'non-us', 'unknown']).toContain(region)
  })
})
