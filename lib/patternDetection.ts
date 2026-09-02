/**
 * Client copy of pattern detection constants — keep in sync with convex/lib/patternDetection.ts.
 */

export const PATTERN_DETECTION_VERSION = '1.0.0' as const

export const NON_CAUSAL_DISCLAIMER =
  'Observed patterns reflect temporal associations in patient-reported entries and do not establish medical causation.'

export type ConfidenceLevel = 'low' | 'moderate' | 'high'

export type EffectDirection = 'positive' | 'negative' | 'mixed'

export function formatConfidenceLabel(confidence: ConfidenceLevel | null | undefined): string {
  if (!confidence) return 'Pending more data'
  return `${confidence.charAt(0).toUpperCase()}${confidence.slice(1)} confidence`
}

export function formatEffectDirection(direction: EffectDirection | null | undefined): string {
  if (!direction) return ''
  if (direction === 'positive') return 'Co-occurring increase'
  if (direction === 'negative') return 'Inverse association'
  return 'Mixed association'
}
