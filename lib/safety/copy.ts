/**
 * Clinically reviewed safety outcome copy for CRI.
 *
 * States: urgent (emergency), prompt-professional-review (elevated/review),
 * insufficient-information (fail-safe), routine (safe/warning).
 *
 * Pediatric variant (13–17): caregiver involvement language added.
 * Full independent clinical review of pediatric copy is still required — see PR docs.
 */

import type { SafetyEvaluationStatus } from '@/convex/lib/safetyEngine'
import type { SafetySeverity } from '@/convex/lib/safetyRules'

export type SafetyOutcomeState =
  | 'urgent'
  | 'prompt_professional_review'
  | 'insufficient_information'
  | 'routine'

export type AudienceBand = 'adult' | 'pediatric'

export interface SafetyOutcomeCopy {
  state: SafetyOutcomeState
  severityLabel: string
  actionHeading: string
  actionBody: string
  rationaleHeading: string
  rationaleBody: string
  sourceHeading: string
  limitationHeading: string
  limitationBody: string
  acknowledgementLabel: string
  acknowledgementDisclaimer: string
}

export function resolveSafetyOutcomeState(
  status: SafetyEvaluationStatus,
  failSafeApplied: boolean
): SafetyOutcomeState {
  if (failSafeApplied && (status === 'review' || status === 'warning')) {
    return 'insufficient_information'
  }
  if (status === 'emergency') return 'urgent'
  if (status === 'elevated' || status === 'review') return 'prompt_professional_review'
  return 'routine'
}

export function severityToAccessibleLabel(severity: SafetySeverity | 'none'): string {
  switch (severity) {
    case 'emergency':
      return 'Emergency — immediate medical evaluation needed'
    case 'high':
      return 'High priority — contact your care team promptly'
    case 'medium':
      return 'Moderate — discuss at your next clinical visit'
    case 'low':
      return 'Low — continue symptom-guided pacing'
    case 'info':
      return 'Informational — no urgent action required'
    case 'none':
      return 'No safety rules matched'
    default: {
      const _exhaustive: never = severity
      return _exhaustive
    }
  }
}

export function getSafetyOutcomeCopy(
  state: SafetyOutcomeState,
  audience: AudienceBand = 'adult'
): SafetyOutcomeCopy {
  const isPediatric = audience === 'pediatric'
  const caregiverNote = isPediatric
    ? ' A parent or guardian should stay with you and help arrange care.'
    : ''

  switch (state) {
    case 'urgent':
      return {
        state,
        severityLabel: 'Emergency — immediate medical evaluation needed',
        actionHeading: 'Get emergency medical help now',
        actionBody: `You reported danger signs that can require immediate medical attention. Call emergency services or go to the nearest emergency department now.${caregiverNote}`,
        rationaleHeading: 'Why this matters',
        rationaleBody:
          'Certain neurological symptoms after a head injury can signal a condition that needs urgent in-person evaluation. Do not wait for a routine app response.',
        sourceHeading: 'Clinical source',
        limitationHeading: 'Important limitation',
        limitationBody:
          'CRI is a symptom tracking tool. It cannot diagnose an emergency, predict recovery, or clear you for activity. Acknowledging this screen does not mean your symptoms are resolved or that professional care is unnecessary.',
        acknowledgementLabel: 'I understand this is not a medical evaluation',
        acknowledgementDisclaimer:
          'Recording your acknowledgement helps your care team know you saw this guidance. It does not replace emergency or clinical care.',
      }

    case 'prompt_professional_review':
      return {
        state,
        severityLabel: 'Elevated — contact your care team',
        actionHeading: 'Contact your healthcare provider',
        actionBody: `Your recent entries suggest symptoms that warrant professional review. Reach out to your care team within the next 24–48 hours.${caregiverNote}`,
        rationaleHeading: 'Why we are flagging this',
        rationaleBody:
          'Your patient-reported symptom total or recent trajectory crossed a threshold used for clinician triage. This is descriptive pattern observation, not a diagnosis.',
        sourceHeading: 'Clinical source',
        limitationHeading: 'Important limitation',
        limitationBody:
          'CRI does not diagnose conditions, predict recovery timelines, or clear you for work, school, sport, or driving. Only a licensed clinician can evaluate your symptoms in person.',
        acknowledgementLabel: 'I have read this guidance',
        acknowledgementDisclaimer:
          'Acknowledgement is recorded for your care team. It does not mean symptoms are resolved or that follow-up is optional.',
      }

    case 'insufficient_information':
      return {
        state,
        severityLabel: 'Incomplete — conservative guidance applied',
        actionHeading: 'Complete your check-in when you can',
        actionBody:
          'Some symptom ratings were missing or inconsistent. Until your entry is complete, follow conservative pacing and rest as tolerated.',
        rationaleHeading: 'Why conservative guidance applies',
        rationaleBody:
          'When data is incomplete or contradictory, CRI applies a fail-safe default toward rest and symptom-guided pacing rather than routine progression.',
        sourceHeading: 'Clinical source',
        limitationHeading: 'Important limitation',
        limitationBody:
          'Incomplete entries cannot support clinical decisions. CRI does not diagnose or predict recovery. Contact your clinician if symptoms worsen.',
        acknowledgementLabel: 'I understand',
        acknowledgementDisclaimer:
          'Acknowledgement is recorded. It does not replace completing your check-in or seeking care if symptoms worsen.',
      }

    case 'routine':
      return {
        state,
        severityLabel: 'Routine — continue symptom-guided pacing',
        actionHeading: 'Continue your daily recovery routine',
        actionBody:
          'No urgent safety rules were triggered. Continue logging symptoms and following your care plan. Contact your clinician if anything changes.',
        rationaleHeading: 'What this means',
        rationaleBody:
          'Your patient-reported symptom total is within ranges that do not require immediate escalation. Recovery remains non-linear — day-to-day fluctuations are common.',
        sourceHeading: 'Clinical source',
        limitationHeading: 'Important limitation',
        limitationBody:
          'A routine result does not mean you are recovered, cleared for activity, or free from risk. Return-to-activity decisions require in-person clinical evaluation.',
        acknowledgementLabel: 'Return to overview',
        acknowledgementDisclaimer:
          'This summary is descriptive only. Contact your care team if symptoms worsen or new danger signs appear.',
      }
  }
}
