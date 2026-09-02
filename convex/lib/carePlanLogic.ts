import type { Doc } from '../_generated/dataModel'

export type CarePlanCompletionStatus =
  | 'pending'
  | 'completed'
  | 'skipped'
  | 'unable_to_complete'

export const CLINICIAN_ONLY_CATEGORIES = new Set([
  'medication',
  'appointment',
  'education',
  'accommodations',
  'cognitive_pacing',
  'physical_activity',
  'sleep_hygiene',
])

export function isCompletionStatus(value: string): value is CarePlanCompletionStatus {
  return (
    value === 'pending' ||
    value === 'completed' ||
    value === 'skipped' ||
    value === 'unable_to_complete'
  )
}

export function completionStatusToCompleted(status: CarePlanCompletionStatus): boolean {
  return status === 'completed'
}

export function completionStatusToEventType(
  status: CarePlanCompletionStatus
): 'completed' | 'skipped' | 'unable_to_complete' | 'reopened' {
  switch (status) {
    case 'completed':
      return 'completed'
    case 'skipped':
      return 'skipped'
    case 'unable_to_complete':
      return 'unable_to_complete'
    case 'pending':
      return 'reopened'
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

export function buildAdherenceSummary(items: Doc<'carePlans'>[]): {
  totalItems: number
  completedCount: number
  skippedCount: number
  unableCount: number
  pendingCount: number
  neutralSummary: string
} {
  const completedCount = items.filter(item => item.completionStatus === 'completed').length
  const skippedCount = items.filter(item => item.completionStatus === 'skipped').length
  const unableCount = items.filter(item => item.completionStatus === 'unable_to_complete').length
  const pendingCount = items.filter(item => item.completionStatus === 'pending').length
  const totalItems = items.length

  let neutralSummary = 'No plan items recorded yet.'
  if (totalItems > 0) {
    neutralSummary = `${completedCount} of ${totalItems} clinician-directed items completed. Missed or skipped items are not emergencies — contact your care team if symptoms change.`
  }

  return {
    totalItems,
    completedCount,
    skippedCount,
    unableCount,
    pendingCount,
    neutralSummary,
  }
}

export function validateMedicationInstruction(
  category: Doc<'carePlans'>['category'],
  medicationInstruction: string | undefined
): void {
  if (category === 'medication' && !medicationInstruction?.trim()) {
    throw new Error(
      'Medication plan items require a clinician-recorded instruction. CRI does not generate prescriptions.'
    )
  }
}

export function canPatientUpdateCompletion(task: Doc<'carePlans'>): boolean {
  return task.allowPatientCompletion
}
