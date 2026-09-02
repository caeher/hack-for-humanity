import type { Doc } from '../_generated/dataModel'

/** Convex native file storage — see docs/ATTACHMENT_STORAGE.md */
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
  maxFilesPerMessage: 3,
  uploadTtlMs: 60 * 60 * 1000,
  downloadUrlTtlSeconds: 15 * 60,
  malwareScanPlan:
    'Heuristic pre-release scan blocks disallowed types, executable MIME types, and suspicious ' +
    'filenames. scanStatus=quarantined files cannot be downloaded. Production should integrate ' +
    'server-side AV (e.g. ClamAV) via the internal scan hook.',
  storageStatus: 'convex_storage',
  storageBackend: 'convex',
  authorizationRequired: true,
} as const

export const BLOCKED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sh',
  'application/javascript',
  'text/javascript',
  'application/vnd.microsoft.portable-executable',
  'application/x-dosexec',
  'application/octet-stream',
] as const

export type AttachmentContextType = 'encounter' | 'message'
export type AttachmentLifecycleStatus = 'pending_upload' | 'active' | 'deleted' | 'failed_upload'
export type AttachmentScanStatus = 'pending' | 'clean' | 'quarantined' | 'failed'

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

  const lowerName = args.fileName.toLowerCase().trim()
  if (!lowerName || lowerName.includes('..') || lowerName.includes('/') || lowerName.includes('\\')) {
    throw new Error('Invalid file name.')
  }

  const hasAllowedExtension = ATTACHMENT_POLICY.allowedExtensions.some(ext => lowerName.endsWith(ext))
  if (!hasAllowedExtension) {
    throw new Error(
      `File type not allowed. Permitted extensions: ${ATTACHMENT_POLICY.allowedExtensions.join(', ')}.`
    )
  }

  if (hasSuspiciousDoubleExtension(lowerName)) {
    throw new Error('File name contains a disallowed double extension.')
  }

  if (!(ATTACHMENT_POLICY.allowedMimeTypes as readonly string[]).includes(args.mimeType)) {
    throw new Error(`MIME type "${args.mimeType}" is not permitted for clinical attachments.`)
  }

  if ((BLOCKED_MIME_TYPES as readonly string[]).includes(args.mimeType)) {
    throw new Error(`MIME type "${args.mimeType}" is blocked for security reasons.`)
  }
}

function hasSuspiciousDoubleExtension(fileName: string): boolean {
  const base = fileName.replace(/\.[^.]+$/, '')
  const dangerous = ['.exe', '.bat', '.cmd', '.com', '.scr', '.js', '.vbs', '.msi', '.dll', '.sh']
  return dangerous.some(ext => base.endsWith(ext))
}

export function extensionForMimeType(mimeType: string): string | null {
  switch (mimeType) {
    case 'application/pdf':
      return '.pdf'
    case 'image/png':
      return '.png'
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg'
    default:
      return null
  }
}

export interface HeuristicScanResult {
  scanStatus: AttachmentScanStatus
  quarantineReason?: string
}

/**
 * Heuristic malware gate — not a substitute for production AV integration.
 */
export function runHeuristicMalwareScan(args: {
  fileName: string
  mimeType: string
  sizeBytes: number
}): HeuristicScanResult {
  try {
    validateAttachmentFile(args)
  } catch (error) {
    return {
      scanStatus: 'quarantined',
      quarantineReason: error instanceof Error ? error.message : 'Policy validation failed.',
    }
  }

  const lowerName = args.fileName.toLowerCase()
  const expectedExt = extensionForMimeType(args.mimeType)
  if (expectedExt && !lowerName.endsWith(expectedExt) && !(expectedExt === '.jpg' && lowerName.endsWith('.jpeg'))) {
    return {
      scanStatus: 'quarantined',
      quarantineReason: 'MIME type does not match file extension.',
    }
  }

  if (args.sizeBytes < 16) {
    return {
      scanStatus: 'quarantined',
      quarantineReason: 'File is unexpectedly small and may be malformed.',
    }
  }

  return { scanStatus: 'clean' }
}

export function isAttachmentDownloadable(
  attachment: Doc<'encounterAttachmentMetadata'>
): boolean {
  if (attachment.lifecycleStatus !== 'active') return false
  if (attachment.deletedAt !== undefined) return false
  if (!attachment.storageId) return false
  return attachment.scanStatus === 'clean'
}

export function resolveRequiredConsentScope(
  contextType: AttachmentContextType
): 'view_plan' | 'view_messages' {
  return contextType === 'message' ? 'view_messages' : 'view_plan'
}
