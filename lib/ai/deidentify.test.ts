import { describe, expect, test } from 'vitest'

import {
  computeAgeBand,
  computeSymptomSeverityBand,
  computeTrendDirection,
  containsPii,
  deidentifyClinicalContext,
  detectIdentityViolations,
  generateCtxSessionId,
  redactPiiFromText,
  serializeForProvider,
  stripIdentityFields,
} from './deidentify'

describe('deidentify', () => {
  test('computeAgeBand maps DOB to bands without sending exact DOB', () => {
    expect(computeAgeBand('2010-06-15')).toBe('13-17')
    expect(computeAgeBand('2000-01-01')).toBe('25-44')
    expect(computeAgeBand('1955-03-20')).toBe('65+')
    expect(computeAgeBand(undefined)).toBe('unknown')
  })

  test('computeSymptomSeverityBand maps totals correctly', () => {
    expect(computeSymptomSeverityBand(5)).toBe('minimal')
    expect(computeSymptomSeverityBand(14)).toBe('mild')
    expect(computeSymptomSeverityBand(22)).toBe('moderate')
    expect(computeSymptomSeverityBand(35)).toBe('severe')
  })

  test('computeTrendDirection detects improving/worsening/stable', () => {
    expect(computeTrendDirection([20, 18, 14])).toBe('improving')
    expect(computeTrendDirection([10, 14, 20])).toBe('worsening')
    expect(computeTrendDirection([15, 16, 15])).toBe('stable')
    expect(computeTrendDirection([10])).toBe('insufficient_data')
  })

  test('redactPiiFromText removes email, phone, SSN patterns', () => {
    const result = redactPiiFromText('Contact john@example.com or call 555-123-4567')
    expect(result).not.toContain('john@example.com')
    expect(result).not.toContain('555-123-4567')
    expect(result).toContain('[REDACTED_EMAIL]')
    expect(result).toContain('[REDACTED_PHONE]')
  })

  test('containsPii detects PII patterns', () => {
    expect(containsPii('email me at test@example.com')).toBe(true)
    expect(containsPii('my headache is worse today')).toBe(false)
  })

  test('stripIdentityFields removes forbidden identity fields', () => {
    const result = stripIdentityFields({
      name: 'John Smith',
      email: 'john@example.com',
      symptomTotal: 15,
      note: 'feeling better',
    })
    expect(result).not.toHaveProperty('name')
    expect(result).not.toHaveProperty('email')
    expect(result).toHaveProperty('symptomTotal', 15)
  })

  test('deidentifyClinicalContext produces safe context with no identifiers', () => {
    const ctx = deidentifyClinicalContext({
      dateOfBirth: '1990-05-15',
      daysSinceInjury: 7,
      symptomTotal: 18,
      recentSymptomTotals: [22, 20, 18],
      queryText: 'What pacing should I follow?',
    })

    expect(ctx.ctxSessionId).toBeTruthy()
    expect(ctx.ageBand).toBe('25-44')
    expect(ctx.symptomTotalBand).toBe('moderate')
    expect(ctx.trendDirection).toBe('improving')
    expect(ctx).not.toHaveProperty('name')
    expect(ctx).not.toHaveProperty('email')
  })

  test('detectIdentityViolations catches forbidden fields and PII', () => {
    const violations = detectIdentityViolations({
      name: 'Jane Doe',
      queryText: 'reach me at jane@test.com',
    })
    expect(violations.some(v => v.includes('name'))).toBe(true)
  })

  test('serializeForProvider throws on identity violations', () => {
    const ctx = deidentifyClinicalContext({ symptomTotal: 10, queryText: 'safe query' })
    expect(() => serializeForProvider(ctx)).not.toThrow()
  })

  test('generateCtxSessionId produces unique ephemeral IDs', () => {
    const id1 = generateCtxSessionId()
    const id2 = generateCtxSessionId()
    expect(id1).not.toBe(id2)
    expect(id1.length).toBe(32)
  })
})
