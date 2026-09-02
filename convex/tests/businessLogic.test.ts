import { describe, expect, it } from 'vitest'
import {
  sanitizeInput,
  validateAdherence,
  validateCheckInScores,
  validateDateString,
  validateEmail,
  validateScore,
  validateStringLength,
} from '../lib/businessLogic'

describe('Business Logic Validators', () => {
  describe('validateCheckInScores', () => {
    it('accepts valid score values between 0 and 10', () => {
      expect(() =>
        validateCheckInScores({
          painScore: 2,
          sleepScore: 4,
          mobilityScore: 0,
          emotionalScore: 1,
        })
      ).not.toThrow()
    })

    it('rejects scores exceeding maximum bounds', () => {
      expect(() =>
        validateCheckInScores({
          painScore: 15,
          sleepScore: 4,
          mobilityScore: 0,
          emotionalScore: 1,
        })
      ).toThrow(/out of bounds/)
    })

    it('rejects negative scores', () => {
      expect(() =>
        validateCheckInScores({
          painScore: -1,
          sleepScore: 4,
          mobilityScore: 0,
          emotionalScore: 1,
        })
      ).toThrow(/out of bounds/)
    })
  })

  describe('validateScore and validateAdherence', () => {
    it('validates percentage ranges', () => {
      expect(() => validateAdherence(85)).not.toThrow()
      expect(() => validateAdherence(-5)).toThrow(/between 0 and 100/)
      expect(() => validateAdherence(105)).toThrow(/between 0 and 100/)
    })

    it('validates score ranges', () => {
      expect(() => validateScore(42, 0, 100)).not.toThrow()
      expect(() => validateScore(-1, 0, 100)).toThrow()
      expect(() => validateScore(101, 0, 100)).toThrow()
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
