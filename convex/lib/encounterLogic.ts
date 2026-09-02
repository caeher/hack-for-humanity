import type { Doc } from '../_generated/dataModel'
import { ATTACHMENT_POLICY, validateAttachmentFile } from './attachmentLogic'

export { ATTACHMENT_POLICY, validateAttachmentFile }

export type EncounterStatus = 'draft' | 'finalized'

export function resolveEncounterStatus(
  encounter: Doc<'clinicalEncounters'>
): EncounterStatus {
  return encounter.status ?? 'finalized'
}

export function isEncounterEditable(encounter: Doc<'clinicalEncounters'>): boolean {
  return resolveEncounterStatus(encounter) === 'draft'
}

export function getEffectiveEncounterContent(
  encounter: Doc<'clinicalEncounters'>,
  latestAmendment: Doc<'encounterAmendments'> | null
): { clinicalSummary: string; notes: string; isAmended: boolean } {
  if (latestAmendment) {
    return {
      clinicalSummary: latestAmendment.clinicalSummary,
      notes: latestAmendment.notes,
      isAmended: true,
    }
  }
  return {
    clinicalSummary: encounter.clinicalSummary,
    notes: encounter.notes,
    isAmended: false,
  }
}
