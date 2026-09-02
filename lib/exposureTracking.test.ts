import { describe, expect, it } from 'vitest'
import {
  formatDurationMinutes,
  formatSleepHours,
  validateExposureEntry,
} from './exposureTracking'

describe('validateExposureEntry (client)', () => {
  it('validates screen exposure with duration', () => {
    const result = validateExposureEntry({
      domain: 'screen',
      activityType: 'phone',
      durationMinutes: 30,
      symptomsWorsened: 'no',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('requires sleep hours for sleep domain', () => {
    const result = validateExposureEntry({
      domain: 'sleep',
      activityType: 'night_sleep',
      symptomsWorsened: 'not_applicable',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('sleep'))).toBe(true)
  })

  it('rejects invalid activity type for domain', () => {
    const result = validateExposureEntry({
      domain: 'screen',
      activityType: 'night_sleep',
      durationMinutes: 30,
      symptomsWorsened: 'no',
    })
    expect(result.valid).toBe(false)
  })
})

describe('formatting helpers', () => {
  it('formats duration minutes', () => {
    expect(formatDurationMinutes(45)).toBe('45 min')
    expect(formatDurationMinutes(90)).toBe('1h 30m')
    expect(formatDurationMinutes(120)).toBe('2h')
  })

  it('formats sleep hours', () => {
    expect(formatSleepHours(7)).toBe('7h')
    expect(formatSleepHours(6.5)).toBe('6h 30m')
  })
})
