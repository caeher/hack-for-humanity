/**
 * Client-side resumable draft storage for the daily concussion check-in.
 * Prevents silent loss of in-progress responses across refresh/navigation.
 */

export const CHECK_IN_DRAFT_VERSION = 1 as const

export interface CheckInDraft {
  version: typeof CHECK_IN_DRAFT_VERSION
  step: number
  answers: Record<string, number>
  activityImpact: string
  selectedDangerSigns: string[]
  note: string
  updatedAt: number
}

export function getCheckInDraftStorageKey(patientId: string): string {
  return `cri:check-in-draft:${patientId}`
}

export function readCheckInDraft(patientId: string): CheckInDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getCheckInDraftStorageKey(patientId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as CheckInDraft
    if (parsed.version !== CHECK_IN_DRAFT_VERSION) return null
    if (typeof parsed.step !== 'number') return null
    if (!parsed.answers || typeof parsed.answers !== 'object') return null

    return parsed
  } catch {
    return null
  }
}

export function writeCheckInDraft(patientId: string, draft: CheckInDraft): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getCheckInDraftStorageKey(patientId), JSON.stringify(draft))
  } catch {
    // Ignore quota or privacy-mode failures; submission can still proceed.
  }
}

export function clearCheckInDraft(patientId: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.removeItem(getCheckInDraftStorageKey(patientId))
  } catch {
    // No-op
  }
}
