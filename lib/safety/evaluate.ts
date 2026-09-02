/**
 * Client-side safety evaluation for offline / backend-failure defense in depth.
 * Reuses the same deterministic engine as the Convex backend.
 */

import { evaluateCheckIn, type SafetyEvaluationResult } from '@/convex/lib/safetyEngine'
import type { ConcussionSymptoms } from '@/convex/lib/businessLogic'

export function evaluateCheckInClient(
  symptoms: ConcussionSymptoms,
  dangerSigns: string[] = [],
  note?: string
): SafetyEvaluationResult {
  return evaluateCheckIn(symptoms, dangerSigns, note)
}
