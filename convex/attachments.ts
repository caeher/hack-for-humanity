import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalMutation, mutation, query } from './_generated/server'
import {
  attachmentContextTypeValidator,
  attachmentDownloadUrlResultValidator,
  attachmentPolicyValidator,
  attachmentUploadUrlResultValidator,
} from './lib/validators'
import { requirePatientAccess, requireRole } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import {
  ATTACHMENT_POLICY,
  isAttachmentDownloadable,
  resolveRequiredConsentScope,
  runHeuristicMalwareScan,
  validateAttachmentFile,
} from './lib/attachmentLogic'
import { isEncounterEditable } from './lib/encounterLogic'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

async function writeAttachmentAudit(
  ctx: MutationCtx,
  args: {
    actorUserId: Id<'users'>
    actorRole: string
    orgId: Id<'organizations'>
    patientId: Id<'patients'>
    event: string
    action: 'read' | 'create' | 'update' | 'delete'
    resourceId: string
  }
): Promise<void> {
  await ctx.db.insert('auditLogs', {
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    orgId: args.orgId,
    patientId: args.patientId,
    event: args.event,
    targetResource: 'encounterAttachmentMetadata',
    resourceId: args.resourceId,
    action: args.action,
    createdAt: Date.now(),
  })
}

async function countActiveEncounterAttachments(
  ctx: QueryCtx | MutationCtx,
  encounterId: Id<'clinicalEncounters'>
): Promise<number> {
  const attachments = await ctx.db
    .query('encounterAttachmentMetadata')
    .withIndex('by_encounterId', q => q.eq('encounterId', encounterId))
    .collect()
  return attachments.filter(
    att => att.lifecycleStatus === 'active' || att.lifecycleStatus === 'pending_upload'
  ).length
}

async function countActiveMessageAttachments(
  ctx: QueryCtx | MutationCtx,
  messageId: Id<'messages'>
): Promise<number> {
  const attachments = await ctx.db
    .query('encounterAttachmentMetadata')
    .withIndex('by_messageId', q => q.eq('messageId', messageId))
    .collect()
  return attachments.filter(
    att => att.lifecycleStatus === 'active' || att.lifecycleStatus === 'pending_upload'
  ).length
}

async function assertEncounterUploadAllowed(
  ctx: MutationCtx,
  encounterId: Id<'clinicalEncounters'>,
  patientId: Id<'patients'>
): Promise<Doc<'clinicalEncounters'>> {
  const encounter = await ctx.db.get(encounterId)
  if (!encounter || encounter.patientId !== patientId) {
    throw new Error('Encounter not found for this patient.')
  }
  if (!isEncounterEditable(encounter)) {
    throw new Error('Attachments can only be added to draft encounters.')
  }
  const count = await countActiveEncounterAttachments(ctx, encounterId)
  if (count >= ATTACHMENT_POLICY.maxFilesPerEncounter) {
    throw new Error(
      `Maximum of ${ATTACHMENT_POLICY.maxFilesPerEncounter} attachments per encounter.`
    )
  }
  return encounter
}

async function assertMessageUploadAllowed(
  ctx: MutationCtx,
  messageId: Id<'messages'>,
  patientId: Id<'patients'>
): Promise<Doc<'messages'>> {
  const message = await ctx.db.get(messageId)
  if (!message || message.patientId !== patientId) {
    throw new Error('Message not found for this patient.')
  }
  const count = await countActiveMessageAttachments(ctx, messageId)
  if (count >= ATTACHMENT_POLICY.maxFilesPerMessage) {
    throw new Error(`Maximum of ${ATTACHMENT_POLICY.maxFilesPerMessage} attachments per message.`)
  }
  return message
}

/**
 * Returns secure attachment policy metadata (no public URLs).
 */
export const getPolicy = query({
  args: {},
  returns: attachmentPolicyValidator,
  handler: async () => {
    return {
      allowedMimeTypes: [...ATTACHMENT_POLICY.allowedMimeTypes],
      allowedExtensions: [...ATTACHMENT_POLICY.allowedExtensions],
      maxSizeBytes: ATTACHMENT_POLICY.maxSizeBytes,
      maxFilesPerEncounter: ATTACHMENT_POLICY.maxFilesPerEncounter,
      maxFilesPerMessage: ATTACHMENT_POLICY.maxFilesPerMessage,
      downloadUrlTtlSeconds: ATTACHMENT_POLICY.downloadUrlTtlSeconds,
      malwareScanPlan: ATTACHMENT_POLICY.malwareScanPlan,
      storageStatus: ATTACHMENT_POLICY.storageStatus,
      storageBackend: ATTACHMENT_POLICY.storageBackend,
      authorizationRequired: ATTACHMENT_POLICY.authorizationRequired,
    }
  },
})

/**
 * Stage attachment metadata and return a short-lived Convex upload URL.
 */
export const generateUploadUrl = mutation({
  args: {
    patientId: v.id('patients'),
    contextType: attachmentContextTypeValidator,
    encounterId: v.optional(v.id('clinicalEncounters')),
    messageId: v.optional(v.id('messages')),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  returns: attachmentUploadUrlResultValidator,
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin', 'clinician', 'patient', 'caregiver'])
    const { patient } = await requirePatientAccess(
      ctx,
      args.patientId,
      resolveRequiredConsentScope(args.contextType)
    )

    const validFileName = validateStringLength(args.fileName, 'File name', 1, 255)
    validateAttachmentFile({
      fileName: validFileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
    })

    if (args.contextType === 'encounter') {
      if (!args.encounterId) {
        throw new Error('encounterId is required for encounter attachments.')
      }
      await assertEncounterUploadAllowed(ctx, args.encounterId, patient._id)
    } else {
      if (!args.messageId) {
        throw new Error('messageId is required for message attachments.')
      }
      await assertMessageUploadAllowed(ctx, args.messageId, patient._id)
    }

    const now = Date.now()
    const uploadExpiresAt = now + ATTACHMENT_POLICY.uploadTtlMs
    const uploadUrl = await ctx.storage.generateUploadUrl()

    const attachmentId = await ctx.db.insert('encounterAttachmentMetadata', {
      contextType: args.contextType,
      encounterId: args.encounterId,
      messageId: args.messageId,
      patientId: patient._id,
      orgId: patient.orgId,
      uploadedByUserId: user._id,
      fileName: validFileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      lifecycleStatus: 'pending_upload',
      scanStatus: 'pending',
      authorizationScope:
        args.contextType === 'encounter' ? 'clinical_encounter' : 'secure_message',
      uploadExpiresAt,
      createdAt: now,
      updatedAt: now,
    })

    await writeAttachmentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Staged ${args.contextType} attachment upload`,
      action: 'create',
      resourceId: attachmentId,
    })

    return { attachmentId, uploadUrl, uploadExpiresAt }
  },
})

/**
 * Finalize an upload after the client stores the blob in Convex storage.
 */
export const finalizeUpload = mutation({
  args: {
    attachmentId: v.id('encounterAttachmentMetadata'),
    storageId: v.id('_storage'),
  },
  returns: v.id('encounterAttachmentMetadata'),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)
    if (!attachment) {
      throw new Error('Attachment not found.')
    }

    const consentScope = resolveRequiredConsentScope(attachment.contextType)
    const { user } = await requirePatientAccess(ctx, attachment.patientId, consentScope)

    if (attachment.uploadedByUserId !== user._id && user.role !== 'admin') {
      throw new Error('Only the uploader can finalize this attachment.')
    }

    if (attachment.lifecycleStatus !== 'pending_upload') {
      throw new Error('Attachment upload is not pending.')
    }

    if (attachment.uploadExpiresAt !== undefined && attachment.uploadExpiresAt < Date.now()) {
      throw new Error('Upload window has expired. Please retry the upload.')
    }

    const scan = runHeuristicMalwareScan({
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    })

    const now = Date.now()
    await ctx.db.patch(args.attachmentId, {
      storageId: args.storageId,
      lifecycleStatus: 'active',
      scanStatus: scan.scanStatus,
      quarantineReason: scan.quarantineReason,
      scannedAt: now,
      uploadExpiresAt: undefined,
      updatedAt: now,
    })

    await writeAttachmentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: attachment.orgId,
      patientId: attachment.patientId,
      event:
        scan.scanStatus === 'clean'
          ? `Finalized ${attachment.contextType} attachment upload`
          : `Quarantined ${attachment.contextType} attachment after heuristic scan`,
      action: scan.scanStatus === 'clean' ? 'update' : 'update',
      resourceId: args.attachmentId,
    })

    return args.attachmentId
  },
})

/**
 * Issue a short-lived authorized download URL after access checks.
 */
export const getDownloadUrl = mutation({
  args: {
    attachmentId: v.id('encounterAttachmentMetadata'),
  },
  returns: attachmentDownloadUrlResultValidator,
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)
    if (!attachment) {
      throw new Error('Attachment not found.')
    }

    const consentScope = resolveRequiredConsentScope(attachment.contextType)
    const { user } = await requirePatientAccess(ctx, attachment.patientId, consentScope)

    if (!isAttachmentDownloadable(attachment)) {
      if (attachment.scanStatus === 'quarantined') {
        throw new Error('This attachment is quarantined and cannot be opened.')
      }
      throw new Error('Attachment is not available for download.')
    }

    if (!attachment.storageId) {
      throw new Error('Attachment storage record is missing.')
    }

    const downloadUrl = await ctx.storage.getUrl(attachment.storageId)
    if (!downloadUrl) {
      throw new Error('Unable to generate download URL.')
    }

    await writeAttachmentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: attachment.orgId,
      patientId: attachment.patientId,
      event: `Authorized download for ${attachment.contextType} attachment`,
      action: 'read',
      resourceId: args.attachmentId,
    })

    return {
      downloadUrl,
      expiresInSeconds: ATTACHMENT_POLICY.downloadUrlTtlSeconds,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    }
  },
})

/**
 * Delete an attachment and remove stored bytes.
 */
export const deleteAttachment = mutation({
  args: {
    attachmentId: v.id('encounterAttachmentMetadata'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)
    if (!attachment) {
      throw new Error('Attachment not found.')
    }

    const consentScope = resolveRequiredConsentScope(attachment.contextType)
    const { user } = await requirePatientAccess(ctx, attachment.patientId, consentScope)

    const canDelete =
      user.role === 'admin' ||
      attachment.uploadedByUserId === user._id ||
      (attachment.contextType === 'encounter' && user.role === 'clinician')

    if (!canDelete) {
      throw new Error('Forbidden: Cannot delete this attachment.')
    }

    if (attachment.encounterId) {
      const encounter = await ctx.db.get(attachment.encounterId)
      if (encounter && !isEncounterEditable(encounter) && user.role !== 'admin') {
        throw new Error('Attachments on finalized encounters cannot be deleted.')
      }
    }

    const now = Date.now()
    if (attachment.storageId) {
      await ctx.storage.delete(attachment.storageId)
    }

    await ctx.db.patch(args.attachmentId, {
      lifecycleStatus: 'deleted',
      deletedAt: now,
      storageId: undefined,
      updatedAt: now,
    })

    await writeAttachmentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: attachment.orgId,
      patientId: attachment.patientId,
      event: `Deleted ${attachment.contextType} attachment`,
      action: 'delete',
      resourceId: args.attachmentId,
    })

    return null
  },
})

/**
 * Mark a failed client upload so cleanup can reclaim storage promptly.
 */
export const markUploadFailed = mutation({
  args: {
    attachmentId: v.id('encounterAttachmentMetadata'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attachment = await ctx.db.get(args.attachmentId)
    if (!attachment) {
      throw new Error('Attachment not found.')
    }

    const { user } = await requirePatientAccess(
      ctx,
      attachment.patientId,
      resolveRequiredConsentScope(attachment.contextType)
    )

    if (attachment.uploadedByUserId !== user._id && user.role !== 'admin') {
      throw new Error('Forbidden.')
    }

    if (attachment.lifecycleStatus !== 'pending_upload') {
      return null
    }

    const now = Date.now()
    await ctx.db.patch(args.attachmentId, {
      lifecycleStatus: 'failed_upload',
      scanStatus: 'failed',
      updatedAt: now,
    })

    await writeAttachmentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: attachment.orgId,
      patientId: attachment.patientId,
      event: `Marked ${attachment.contextType} attachment upload as failed`,
      action: 'update',
      resourceId: args.attachmentId,
    })

    return null
  },
})

/**
 * Idempotent orphan and retention cleanup (scheduled via cron).
 */
export const cleanupOrphanedUploads = internalMutation({
  args: {
    now: v.number(),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({
    expiredMetadataRemoved: v.number(),
    orphanedStorageRemoved: v.number(),
    retentionDeleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const batchSize = Math.min(Math.max(args.batchSize ?? 50, 1), 200)
    const now = args.now

    let expiredMetadataRemoved = 0
    let orphanedStorageRemoved = 0
    let retentionDeleted = 0

    const expiredPending = await ctx.db
      .query('encounterAttachmentMetadata')
      .withIndex('by_lifecycleStatus_and_uploadExpiresAt', q =>
        q.eq('lifecycleStatus', 'pending_upload')
      )
      .take(batchSize)

    for (const attachment of expiredPending) {
      if (attachment.uploadExpiresAt === undefined || attachment.uploadExpiresAt >= now) {
        continue
      }

      if (attachment.storageId) {
        await ctx.storage.delete(attachment.storageId)
        orphanedStorageRemoved += 1
      }

      await ctx.db.patch(attachment._id, {
        lifecycleStatus: 'failed_upload',
        scanStatus: 'failed',
        storageId: undefined,
        updatedAt: now,
      })

      expiredMetadataRemoved += 1
    }

    const failedUploads = await ctx.db
      .query('encounterAttachmentMetadata')
      .withIndex('by_lifecycleStatus_and_uploadExpiresAt', q =>
        q.eq('lifecycleStatus', 'failed_upload')
      )
      .take(batchSize)

    for (const attachment of failedUploads) {
      if (!attachment.storageId) continue
      await ctx.storage.delete(attachment.storageId)
      await ctx.db.patch(attachment._id, {
        storageId: undefined,
        updatedAt: now,
      })
      orphanedStorageRemoved += 1
    }

    const orgs = await ctx.db.query('organizations').take(20)
    for (const org of orgs) {
      const cutoff = now - org.retentionPolicyDays * 24 * 60 * 60 * 1000
      const orgAttachments = await ctx.db
        .query('encounterAttachmentMetadata')
        .withIndex('by_orgId', q => q.eq('orgId', org._id))
        .take(batchSize)

      for (const attachment of orgAttachments) {
        if (attachment.lifecycleStatus === 'deleted') continue
        if (attachment.createdAt >= cutoff) continue

        if (attachment.storageId) {
          await ctx.storage.delete(attachment.storageId)
        }

        await ctx.db.patch(attachment._id, {
          lifecycleStatus: 'deleted',
          deletedAt: now,
          storageId: undefined,
          updatedAt: now,
        })
        retentionDeleted += 1
      }
    }

    return { expiredMetadataRemoved, orphanedStorageRemoved, retentionDeleted }
  },
})

export const runScheduledCleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runMutation(internal.attachments.cleanupOrphanedUploads, {
      now: Date.now(),
    })
    return null
  },
})
