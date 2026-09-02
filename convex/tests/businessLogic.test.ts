import { describe, expect, it } from 'vitest'
import {
  CDC_DANGER_SIGNS,
  sanitizeInput,
  validateAdherence,
  validateConcussionSymptoms,
  validateDateString,
  validateEmail,
  validateScore,
  validateStringLength,
} from '../lib/businessLogic'

describe('Business Logic Validators', () => {
  describe('validateConcussionSymptoms (8-Symptom Likert 0-6 Inventory)', () => {
    it('accepts valid 8-symptom ratings between 0 and 6 and computes total', () => {
      const validSymptoms = {
        headache: 3,
        dizziness: 2,
        nausea: 1,
        lightSensitivity: 4,
        noiseSensitivity: 2,
        fatigue: 3,
        concentration: 2,
        sleepDifficulty: 1,
      }
      const total = validateConcussionSymptoms(validSymptoms)
      expect(total).toBe(18)
    })

    it('accepts all zeros (total 0)', () => {
      const zeroSymptoms = {
        headache: 0,
        dizziness: 0,
        nausea: 0,
        lightSensitivity: 0,
        noiseSensitivity: 0,
        fatigue: 0,
        concentration: 0,
        sleepDifficulty: 0,
      }
      expect(validateConcussionSymptoms(zeroSymptoms)).toBe(0)
    })

    it('accepts maximum ratings of 6 across all dimensions (total 48)', () => {
      const maxSymptoms = {
        headache: 6,
        dizziness: 6,
        nausea: 6,
        lightSensitivity: 6,
        noiseSensitivity: 6,
        fatigue: 6,
        concentration: 6,
        sleepDifficulty: 6,
      }
      expect(validateConcussionSymptoms(maxSymptoms)).toBe(48)
    })

    it('rejects symptoms exceeding maximum rating of 6', () => {
      const invalid = {
        headache: 7,
        dizziness: 2,
        nausea: 1,
        lightSensitivity: 4,
        noiseSensitivity: 2,
        fatigue: 3,
        concentration: 2,
        sleepDifficulty: 1,
      }
      expect(() => validateConcussionSymptoms(invalid)).toThrow(/out of bounds/)
    })

    it('rejects negative symptom ratings', () => {
      const invalid = {
        headache: -1,
        dizziness: 2,
        nausea: 1,
        lightSensitivity: 4,
        noiseSensitivity: 2,
        fatigue: 3,
        concentration: 2,
        sleepDifficulty: 1,
      }
      expect(() => validateConcussionSymptoms(invalid)).toThrow(/out of bounds/)
    })

    it('rejects missing symptom dimensions instead of treating them as zero', () => {
      const incomplete = {
        headache: 3,
        dizziness: 2,
        nausea: 1,
        lightSensitivity: 4,
        noiseSensitivity: 2,
        fatigue: 3,
        concentration: 2,
      } as {
        headache: number
        dizziness: number
        nausea: number
        lightSensitivity: number
        noiseSensitivity: number
        fatigue: number
        concentration: number
        sleepDifficulty?: number
      }

      expect(() => validateConcussionSymptoms(incomplete as never)).toThrow(/sleepDifficulty/)
    })

    it('rejects non-integer ratings', () => {
      const invalid = {
        headache: 2.5,
        dizziness: 2,
        nausea: 1,
        lightSensitivity: 4,
        noiseSensitivity: 2,
        fatigue: 3,
        concentration: 2,
        sleepDifficulty: 1,
      }
      expect(() => validateConcussionSymptoms(invalid)).toThrow(/must be an integer/)
    })
  })

  describe('CDC Danger Signs list', () => {
    it('contains Tier 1 neurological emergency signs', () => {
      expect(CDC_DANGER_SIGNS.length).toBeGreaterThanOrEqual(8)
      expect(CDC_DANGER_SIGNS).toContain('One pupil larger than the other')
      expect(CDC_DANGER_SIGNS).toContain('Repeated vomiting or nausea')
    })
  })

  describe('validateScore and validateAdherence', () => {
    it('validates percentage ranges', () => {
      expect(() => validateAdherence(85)).not.toThrow()
      expect(() => validateAdherence(-5)).toThrow(/between 0 and 100/)
      expect(() => validateAdherence(105)).toThrow(/between 0 and 100/)
    })

    it('validates score ranges (0 to 48)', () => {
      expect(() => validateScore(24, 0, 48)).not.toThrow()
      expect(() => validateScore(-1, 0, 48)).toThrow()
      expect(() => validateScore(49, 0, 48)).toThrow()
    })
  })

  describe('validateStringLength and validateEmail', () => {
    it('enforces min and max string length', () => {
      expect(validateStringLength('Valid Text', 'Field', 2, 50)).toBe('Valid Text')
      expect(() => validateStringLength('', 'Field', 1, 50)).toThrow(/cannot be empty/)
      expect(() => validateStringLength('a'.repeat(51), 'Field', 1, 50)).toThrow(/exceeds maximum/)
    })

    it('validates email addresses properly', () => {
      expect(validateEmail('user@example.com')).toBe('user@example.com')
      expect(() => validateEmail('invalid-email')).toThrow(/Invalid email/)
    })

    it('validates date strings properly', () => {
      expect(validateDateString('2026-08-25', 'Date')).toBe('2026-08-25')
      expect(() => validateDateString('', 'Date')).toThrow(/must not be empty/)
    })
  })

  describe('sanitizeInput', () => {
    it('strips control characters and trims', () => {
      expect(sanitizeInput('  Hello \u0000 World  ')).toBe('Hello  World')
    })
  })
})

