import { describe, expect, it } from 'vitest'
import {
  getTranslations,
  getRatingDescriptor,
  getScoreBand,
  EN_US_TRANSLATIONS,
} from './translations'

describe('i18n translations', () => {
  it('contains all 8 required CDC/Amsterdam concussion symptoms', () => {
    const symptoms = EN_US_TRANSLATIONS.symptoms
    expect(symptoms).toHaveProperty('headache')
    expect(symptoms).toHaveProperty('dizziness')
    expect(symptoms).toHaveProperty('nausea')
    expect(symptoms).toHaveProperty('lightSensitivity')
    expect(symptoms).toHaveProperty('noiseSensitivity')
    expect(symptoms).toHaveProperty('fatigue')
    expect(symptoms).toHaveProperty('concentration')
    expect(symptoms).toHaveProperty('sleepDifficulty')
  })

  it('contains all required ratings from 0 to 6', () => {
    const ratings = EN_US_TRANSLATIONS.ratings
    for (let i = 0; i <= 6; i++) {
      expect(ratings[i]).toBeDefined()
    }
  })

  it('contains critical danger signs and non-diagnostic disclaimers', () => {
    expect(EN_US_TRANSLATIONS.dangerSigns).toHaveProperty('repeated_vomiting')
    expect(EN_US_TRANSLATIONS.dangerSigns).toHaveProperty('seizure_convulsion')
    expect(EN_US_TRANSLATIONS.disclaimers.symptomTotal).toContain('Not a clinical diagnosis')
    expect(EN_US_TRANSLATIONS.disclaimers.wearableSync).toContain('disabled')
  })

  it('generates descriptive rating descriptors', () => {
    expect(getRatingDescriptor(0)).toBe('0 — None')
    expect(getRatingDescriptor(3)).toBe('3 — Moderate')
    expect(getRatingDescriptor(6)).toBe('6 — Very severe')
  })

  it('computes score bands properly', () => {
    expect(getScoreBand(0)).toBe('None')
    expect(getScoreBand(10, 48)).toBe('Mild')
    expect(getScoreBand(25, 48)).toBe('Moderate')
    expect(getScoreBand(40, 48)).toBe('Severe')
  })

  it('falls back safely for unsupported locales', () => {
    const t = getTranslations('xyz-ABC')
    expect(t.common.skipToContent).toBe('Skip to main content')
  })
})
