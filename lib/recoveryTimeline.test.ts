import { describe, expect, it } from 'vitest'
import {
  COMPARISON_VIEW_DEFINITIONS,
  SYMPTOM_GROUP_DEFINITIONS,
  TIMELINE_COPY,
  computeSymptomGroupValue,
  formatExposureCellValue,
  formatSymptomValue,
} from './recoveryTimeline'

describe('recoveryTimeline client helpers', () => {
  const symptoms = {
    headache: 3,
    dizziness: 2,
    nausea: 1,
    lightSensitivity: 2,
    noiseSensitivity: 2,
    fatigue: 3,
    concentration: 2,
    sleepDifficulty: 4,
  }

  it('computes grouped symptom values from dimensions', () => {
    expect(computeSymptomGroupValue(symptoms, 'all')).toBe(19)
    expect(computeSymptomGroupValue(symptoms, 'vestibular')).toBe(3)
    expect(computeSymptomGroupValue(symptoms, 'sleep_related')).toBe(4)
  })

  it('formats null values as gaps', () => {
    expect(formatSymptomValue(null, 'all')).toBe('—')
    expect(formatExposureCellValue(null, 'symptoms_sleep')).toBe('—')
  })

  it('formats exposure values per comparison view', () => {
    expect(formatExposureCellValue(6.5, 'symptoms_sleep')).toBe('6h 30m')
    expect(formatExposureCellValue(90, 'symptoms_screen')).toBe('90 min')
    expect(formatExposureCellValue(4, 'symptoms_activity')).toBe('4/10')
  })

  it('exposes non-causal association copy', () => {
    expect(TIMELINE_COPY.associationDisclaimer).toMatch(/not diagnoses, causal findings/i)
    expect(SYMPTOM_GROUP_DEFINITIONS.all.maxValue).toBe(48)
    expect(COMPARISON_VIEW_DEFINITIONS.symptoms_activity.exposureMax).toBe(10)
  })
})
