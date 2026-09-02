/**
 * Client-side symptom total helpers for the eight-symptom check-in flow.
 * Missing ratings are excluded from the total — they are never treated as zero.
 */

export const SYMPTOM_DIMENSION_COUNT = 8
export const SYMPTOM_TOTAL_MAX = 48

/**
 * Sums only explicitly answered symptom ratings.
 * Unanswered dimensions are omitted rather than coerced to zero.
 */
export function computeAnsweredSymptomTotal(answers: Record<string, number>): number {
  return Object.values(answers).reduce((sum, rating) => sum + rating, 0)
}

/**
 * Returns how many of the eight symptom dimensions have been rated.
 */
export function countAnsweredSymptoms(answers: Record<string, number>): number {
  return Object.keys(answers).length
}

/**
 * True when every dimension has an explicit integer rating between 0 and 6.
 */
export function isCompleteSymptomInventory(
  answers: Record<string, number>,
  requiredIds: readonly string[]
): boolean {
  return requiredIds.every(id => {
    const value = answers[id]
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
  })
}
