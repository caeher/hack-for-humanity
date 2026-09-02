import { describe, expect, it } from 'vitest'
import {
  computeAnsweredSymptomTotal,
  countAnsweredSymptoms,
  isCompleteSymptomInventory,
  SYMPTOM_DIMENSION_COUNT,
  SYMPTOM_TOTAL_MAX,
} from './symptomTotals'

const ALL_SYMPTOM_IDS = [
  'headache',
  'dizziness',
  'nausea',
  'lightSensitivity',
  'noiseSensitivity',
  'fatigue',
  'concentration',
  'sleepDifficulty',
] as const

describe('symptomTotals', () => {
  it('sums only explicitly answered ratings — missing dimensions are not treated as zero', () => {
    const partial = { headache: 3, dizziness: 2 }
    expect(computeAnsweredSymptomTotal(partial)).toBe(5)
    expect(countAnsweredSymptoms(partial)).toBe(2)
    expect(isCompleteSymptomInventory(partial, ALL_SYMPTOM_IDS)).toBe(false)
  })

  it('treats explicit zero ratings as valid answers', () => {
    const withZeros = { headache: 0, dizziness: 0, nausea: 0 }
    expect(computeAnsweredSymptomTotal(withZeros)).toBe(0)
    expect(countAnsweredSymptoms(withZeros)).toBe(3)
  })

  it('recognizes a complete eight-symptom inventory', () => {
    const complete = Object.fromEntries(ALL_SYMPTOM_IDS.map(id => [id, 2]))
    expect(countAnsweredSymptoms(complete)).toBe(SYMPTOM_DIMENSION_COUNT)
    expect(computeAnsweredSymptomTotal(complete)).toBe(16)
    expect(isCompleteSymptomInventory(complete, ALL_SYMPTOM_IDS)).toBe(true)
  })

  it('caps maximum possible total at 48 across eight dimensions', () => {
    const maxed = Object.fromEntries(ALL_SYMPTOM_IDS.map(id => [id, 6]))
    expect(computeAnsweredSymptomTotal(maxed)).toBe(SYMPTOM_TOTAL_MAX)
  })
})
