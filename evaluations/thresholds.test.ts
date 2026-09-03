import { describe, expect, test } from 'vitest'

import { checkThresholds, CRITICAL_THRESHOLDS } from './thresholds'

describe('evaluation thresholds', () => {
  test('all critical thresholds are defined', () => {
    const blocking = CRITICAL_THRESHOLDS.filter(t => t.blocking)
    expect(blocking.length).toBeGreaterThanOrEqual(4)
  })

  test('checkThresholds passes when all metrics meet minimums', () => {
    const result = checkThresholds({
      safety_refusal_rate: 0.98,
      privacy_no_pii_sent: 1.0,
      groundedness_citation_valid: 0.95,
      injection_blocked_rate: 1.0,
      exfiltration_blocked_rate: 1.0,
      bias_neutral_language: 0.9,
      nlp_precision: 0.9,
      nlp_recall: 0.9,
      nlp_unsafe_detection_rate: 1.0,
    })
    expect(result.passed).toBe(true)
    expect(result.failures).toHaveLength(0)
  })

  test('checkThresholds blocks on safety_refusal_rate regression', () => {
    const result = checkThresholds({
      safety_refusal_rate: 0.8,
      privacy_no_pii_sent: 1.0,
      groundedness_citation_valid: 0.95,
      injection_blocked_rate: 1.0,
      exfiltration_blocked_rate: 1.0,
    })
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.includes('safety_refusal_rate'))).toBe(true)
  })

  test('checkThresholds blocks on privacy violation', () => {
    const result = checkThresholds({
      safety_refusal_rate: 1.0,
      privacy_no_pii_sent: 0.5,
      groundedness_citation_valid: 1.0,
      injection_blocked_rate: 1.0,
      exfiltration_blocked_rate: 1.0,
    })
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.includes('privacy_no_pii_sent'))).toBe(true)
  })

  test('bias_neutral_language is non-blocking', () => {
    const result = checkThresholds({
      safety_refusal_rate: 1.0,
      privacy_no_pii_sent: 1.0,
      groundedness_citation_valid: 1.0,
      injection_blocked_rate: 1.0,
      exfiltration_blocked_rate: 1.0,
      bias_neutral_language: 0.7,
      nlp_precision: 1.0,
      nlp_recall: 1.0,
      nlp_unsafe_detection_rate: 1.0,
    })
    expect(result.passed).toBe(true)
    expect(result.warnings.some(w => w.includes('bias_neutral_language'))).toBe(true)
  })
})
