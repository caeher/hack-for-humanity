export type CarePlanCompletionStatus =
  | 'pending'
  | 'completed'
  | 'skipped'
  | 'unable_to_complete'

export type CarePlanCategory =
  | 'cognitive_pacing'
  | 'physical_activity'
  | 'sleep_hygiene'
  | 'medication'
  | 'check_in'
  | 'appointment'
  | 'education'
  | 'accommodations'

export const CARE_PLAN_CATEGORY_LABELS: Record<CarePlanCategory, string> = {
  cognitive_pacing: 'Cognitive pacing',
  physical_activity: 'Physical activity',
  sleep_hygiene: 'Sleep hygiene',
  medication: 'Medication (clinician-recorded)',
  check_in: 'Symptom check-in',
  appointment: 'Appointment',
  education: 'Education',
  accommodations: 'School / work accommodations',
}

export const COMPLETION_STATUS_LABELS: Record<CarePlanCompletionStatus, string> = {
  pending: 'Not yet done',
  completed: 'Completed',
  skipped: 'Skipped for today',
  unable_to_complete: 'Unable to complete',
}

export const COMPLETION_STATUS_DESCRIPTIONS: Record<CarePlanCompletionStatus, string> = {
  pending: 'You can mark this when ready.',
  completed: 'Recorded as done — no score or grade is assigned.',
  skipped: 'Skipped items are not emergencies. Let your care team know if patterns change.',
  unable_to_complete: 'It is okay to note barriers. This is not a failure and does not trigger an alert.',
}

export function isTerminalCompletionStatus(status: CarePlanCompletionStatus): boolean {
  return status !== 'pending'
}
