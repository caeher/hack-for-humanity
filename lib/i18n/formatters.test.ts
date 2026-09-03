import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatDateRange,
  formatNumber,
  formatPercent,
  formatSymptomScore,
  formatRelativeTime,
} from './formatters'
import { normalizeLocale, resolveSafeTimeZone } from './locales'

describe('i18n formatters', () => {
  const testTimestamp = 1756598400000 // approx Aug 31, 2025 00:00:00 UTC

  it('normalizes locales correctly with fallbacks', () => {
    expect(normalizeLocale('en-US')).toBe('en-US')
    expect(normalizeLocale('EN_US')).toBe('en-US')
    expect(normalizeLocale('en-gb')).toBe('en-GB')
    expect(normalizeLocale('es')).toBe('es-US')
    expect(normalizeLocale('fr')).toBe('fr-CA')
    expect(normalizeLocale('unknown-locale')).toBe('en-US')
    expect(normalizeLocale(null)).toBe('en-US')
  })

  it('resolves safe timezones with fallback', () => {
    expect(resolveSafeTimeZone('America/New_York')).toBe('America/New_York')
    expect(resolveSafeTimeZone('UTC')).toBe('UTC')
    expect(resolveSafeTimeZone('Invalid/Timezone_XYZ')).toBe('America/New_York')
  })

  it('formats dates consistently', () => {
    const formatted = formatDate(testTimestamp, { dateStyle: 'medium' }, 'en-US', 'UTC')
    expect(formatted).toMatch(/Aug 31, 2025/)
  })

  it('formats time strings consistently', () => {
    const formatted = formatTime(testTimestamp, { timeStyle: 'short' }, 'en-US', 'UTC')
    expect(formatted).toBeDefined()
  })

  it('formats combined date and time', () => {
    const formatted = formatDateTime(testTimestamp, 'en-US', 'UTC')
    expect(formatted).toContain('2025')
  })

  it('formats date ranges correctly', () => {
    const start = '2026-08-19'
    const end = '2026-09-02'
    const range = formatDateRange(start, end, 'en-US', 'UTC')
    expect(range).toContain('Aug')
    expect(range).toContain('Sep')
  })

  it('formats numbers and percentages', () => {
    expect(formatNumber(1248, undefined, 'en-US')).toBe('1,248')
    expect(formatPercent(86.4, 'en-US')).toBe('86.4%')
    expect(formatPercent(0.864, 'en-US')).toBe('86.4%')
  })

  it('formats symptom scores consistently', () => {
    expect(formatSymptomScore(15, 48, 'en-US')).toBe('15 / 48')
  })

  it('formats relative time safely', () => {
    const relative = formatRelativeTime(-2, 'day', 'en-US')
    expect(relative.toLowerCase()).toMatch(/2 days ago|yesterday|before/)
  })
})
