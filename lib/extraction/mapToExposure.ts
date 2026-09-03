/**
 * Maps confirmed extraction candidates to exposure entry inputs.
 */

import type { ExposureEntryInput } from '@/lib/exposureTracking'
import type { RecoveryEventCandidate } from './types'

export function mapCandidateToExposureEntry(
  candidate: RecoveryEventCandidate
): ExposureEntryInput | null {
  if (candidate.status !== 'confirmed' || !candidate.activity) return null

  const entry: ExposureEntryInput = {
    domain: candidate.activity.domain,
    activityType: candidate.activity.activityType,
    symptomsWorsened: candidate.symptom ? 'yes' : 'not_sure',
    durationMinutes: candidate.duration?.minutes,
    symptomMagnitude: candidate.symptom?.severity,
    symptomOnsetMinutes: candidate.timing?.relative === 'after_activity' ? 0 : undefined,
  }

  if (candidate.activity.domain === 'sleep' && candidate.duration?.minutes) {
    entry.sleepHours = Math.round((candidate.duration.minutes / 60) * 10) / 10
    entry.symptomsWorsened = 'not_applicable'
  }

  return entry
}

export function mapConfirmedCandidatesToExposureEntries(
  candidates: RecoveryEventCandidate[]
): ExposureEntryInput[] {
  return candidates
    .filter(c => c.status === 'confirmed')
    .map(mapCandidateToExposureEntry)
    .filter((entry): entry is ExposureEntryInput => entry !== null)
}
