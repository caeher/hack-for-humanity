import { describe, expect, it } from 'vitest'
import {
  computeDailyRollup,
  validateExposureEntryInput,
} from '../lib/exposureLogic'

describe('validateExposureEntryInput', () => {
  it('accepts a valid screen exposure entry', () => {
    const result = validateExposureEntryInput({
      domain: 'screen',
      activityType: 'phone',
      durationMinutes: 45,
      intensity: 4,
      symptomsWorsened: 'no',
    })

    expect(result.domain).toBe('screen')
    expect(result.durationMinutes).toBe(45)
    expect(result.warnings).toHaveLength(0)
  })

  it('accepts sleep entry with hours and quality', () => {
    const result = validateExposureEntryInput({
      domain: 'sleep',
      activityType: 'night_sleep',
      sleepHours: 7.5,
      sleepQuality: 6,
      symptomsWorsened: 'not_applicable',
    })

    expect(result.sleepHours).toBe(7.5)
    expect(result.sleepQuality).toBe(6)
    expect(result.durationMinutes).toBeUndefined()
  })

  it('rejects impossible duration', () => {
    expect(() =>
      validateExposureEntryInput({
        domain: 'cognitive',
        activityType: 'reading',
        durationMinutes: 2000,
        symptomsWorsened: 'not_sure',
      })
    ).toThrow(/duration/i)
  })

  it('captures symptom worsening details', () => {
    const result = validateExposureEntryInput({
      domain: 'physical',
      activityType: 'light_walking',
      durationMinutes: 20,
      symptomsWorsened: 'yes',
      symptomOnsetMinutes: 15,
      symptomMagnitude: 2,
      symptomRecoveryMinutes: 45,
    })

    expect(result.symptomOnsetMinutes).toBe(15)
    expect(result.symptomMagnitude).toBe(2)
    expect(result.symptomRecoveryMinutes).toBe(45)
  })

  it('warns on overlapping time ranges', () => {
    const result = validateExposureEntryInput(
      {
        domain: 'screen',
        activityType: 'computer',
        durationMinutes: 60,
        startTime: '09:00',
        endTime: '10:00',
        symptomsWorsened: 'no',
      },
      [{ startTime: '09:30', endTime: '10:30' }]
    )

    expect(result.warnings.some((w: { code: string }) => w.code === 'overlapping_time')).toBe(true)
  })

  it('warns when duration mismatches start/end span', () => {
    const result = validateExposureEntryInput({
      domain: 'cognitive',
      activityType: 'meeting',
      durationMinutes: 120,
      startTime: '09:00',
      endTime: '09:30',
      symptomsWorsened: 'not_sure',
    })

    expect(result.warnings.some((w: { code: string }) => w.code === 'duration_mismatch')).toBe(true)
  })

  it('truncates and sanitizes context notes', () => {
    expect(() =>
      validateExposureEntryInput({
        domain: 'screen',
        activityType: 'phone',
        durationMinutes: 30,
        symptomsWorsened: 'no',
        contextNote: 'a'.repeat(300),
      })
    ).toThrow(/250/)
  })
})

describe('computeDailyRollup', () => {
  it('aggregates screen, cognitive, physical, and sleep separately', () => {
    const rollup = computeDailyRollup([
      { domain: 'screen', durationMinutes: 90 },
      { domain: 'cognitive', durationMinutes: 60 },
      { domain: 'work_school', durationMinutes: 120 },
      { domain: 'physical', durationMinutes: 30, intensity: 7 },
      { domain: 'sleep', sleepHours: 7, sleepQuality: 8 },
    ])

    expect(rollup.screenMinutes).toBe(90)
    expect(rollup.cognitiveMinutes).toBe(180)
    expect(rollup.physicalExertionScore).toBe(7)
    expect(rollup.sleepHours).toBe(7)
    expect(rollup.sleepQuality).toBe(8)
  })

  it('returns zeros when no entries exist', () => {
    const rollup = computeDailyRollup([])
    expect(rollup).toEqual({
      cognitiveMinutes: 0,
      screenMinutes: 0,
      physicalExertionScore: 0,
      sleepHours: 0,
      sleepQuality: 0,
    })
  })
})
