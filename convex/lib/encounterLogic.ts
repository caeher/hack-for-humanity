import type { Doc } from '../_generated/dataModel'

export const ATTACHMENT_POLICY = {
  allowedMimeTypes: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ],
  allowedExtensions: ['.pdf', '.png', '.jpg', '.jpeg'],
  maxSizeBytes: 10 * 1024 * 1024,
  maxFilesPerEncounter: 5,
  malwareScanPlan:
    'Attachments are queued for server-side malware scanning before clinical release. ' +
    'Until secure storage (#37) is live, metadata is recorded with scanStatus=pending and ' +
    'files are not exposed via public URLs.',
  storageStatus: 'metadata_only',
  authorizationRequired: true,
} as const

export type EncounterStatus = 'draft' | 'finalized'

export function resolveEncounterStatus(
  encounter: Doc<'clinicalEncounters'>
): EncounterStatus {
  return encounter.status ?? 'finalized'
}

export function isEncounterEditable(encounter: Doc<'clinicalEncounters'>): boolean {
  return resolveEncounterStatus(encounter) === 'draft'
}

export function validateAttachmentFile(args: {
  fileName: string
  mimeType: string
  sizeBytes: number
}): void {
  if (args.sizeBytes <= 0) {
    throw new Error('Attachment must have a positive file size.')
  }
  if (args.sizeBytes > ATTACHMENT_POLICY.maxSizeBytes) {
    throw new Error(
      `Attachment exceeds maximum size of ${ATTACHMENT_POLICY.maxSizeBytes / (1024 * 1024)} MB.`
    )
  }

  const lowerName = args.fileName.toLowerCase()
  const hasAllowedExtension = ATTACHMENT_POLICY.allowedExtensions.some(ext =>
    lowerName.endsWith(ext)
  )
  if (!hasAllowedExtension) {
    throw new Error(
      `File type not allowed. Permitted extensions: ${ATTACHMENT_POLICY.allowedExtensions.join(', ')}.`
    )
  }

  if (!(ATTACHMENT_POLICY.allowedMimeTypes as readonly string[]).includes(args.mimeType)) {
    throw new Error(`MIME type "${args.mimeType}" is not permitted for clinical attachments.`)
  }
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
