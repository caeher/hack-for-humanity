import { describe, expect, it } from 'vitest'
import {
  BASELINE_COMPLETION_TARGET_MS,
  BASELINE_SYMPTOM_SCALE_MAX,
  BASELINE_SYMPTOM_SCALE_MIN,
  getPostBaselineRoute,
  isLikertInRange,
} from '@/lib/baseline'

describe('baseline shared helpers', () => {
  it('defines a five-minute completion target', () => {
    expect(BASELINE_COMPLETION_TARGET_MS).toBe(5 * 60 * 1000)
  })

  it('routes to daily check-in after baseline completion', () => {
    expect(getPostBaselineRoute()).toBe('/patient/check-in')
  })

  it('validates likert ratings on the 0-6 scale', () => {
    expect(isLikertInRange(0)).toBe(true)
    expect(isLikertInRange(6)).toBe(true)
    expect(isLikertInRange(BASELINE_SYMPTOM_SCALE_MIN, BASELINE_SYMPTOM_SCALE_MIN, BASELINE_SYMPTOM_SCALE_MAX)).toBe(true)
    expect(isLikertInRange(7)).toBe(false)
    expect(isLikertInRange(-1)).toBe(false)
    expect(isLikertInRange(2.5)).toBe(false)
  })
})
