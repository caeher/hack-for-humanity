import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  attachmentPolicyValidator,
  encounterDocValidator,
  encounterTypeValidator,
  encounterWithAmendmentsValidator,
} from './lib/validators'
import { requirePatientAccess, requireRole } from './lib/auth'
import { validateDateString, validateStringLength } from './lib/businessLogic'
import {
  ATTACHMENT_POLICY,
  getEffectiveEncounterContent,
  isEncounterEditable,
  resolveEncounterStatus,
  validateAttachmentFile,
} from './lib/encounterLogic'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

async function getLatestAmendment(
  ctx: QueryCtx | MutationCtx,
  encounterId: Id<'clinicalEncounters'>
) {
  const amendments = await ctx.db
    .query('encounterAmendments')
    .withIndex('by_encounterId', q => q.eq('encounterId', encounterId))
    .order('desc')
    .take(1)
  return amendments[0] ?? null
}

async function getEncounterAttachments(
  ctx: QueryCtx | MutationCtx,
  encounterId: Id<'clinicalEncounters'>
) {
  return await ctx.db
    .query('encounterAttachmentMetadata')
    .withIndex('by_encounterId', q => q.eq('encounterId', encounterId))
    .collect()
}

async function requireEditableEncounter(
  ctx: MutationCtx,
  encounterId: Id<'clinicalEncounters'>
): Promise<{ encounter: Doc<'clinicalEncounters'>; patient: Doc<'patients'> }> {
  const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])
  const encounter = await ctx.db.get(encounterId)
  if (!encounter) {
    throw new Error('Encounter not found.')
  }

  const { patient } = await requirePatientAccess(ctx, encounter.patientId)

  if (!isEncounterEditable(encounter)) {
    throw new Error('Finalized encounters cannot be edited. Submit an amendment instead.')
  }

  if (clinicianUser.role === 'clinician' && encounter.clinicianUserId !== clinicianUser._id) {
    throw new Error('Only the authoring clinician can edit this draft encounter.')
  }

  return { encounter, patient }
}

/**
 * List clinical encounters for a patient.
 * Reverse-chronological order with cursor pagination.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    paginationOpts: v.optional(paginationOptsValidator),
    includeDrafts: v.optional(v.boolean()),
  },
  returns: v.union(
    paginationResultValidator(encounterDocValidator),
    v.array(encounterDocValidator)
  ),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_plan')

    const q = ctx.db
      .query('clinicalEncounters')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')

    const filterDrafts = (encounters: Doc<'clinicalEncounters'>[]) => {
      if (args.includeDrafts) return encounters
      return encounters.filter(enc => resolveEncounterStatus(enc) === 'finalized')
    }

    if (args.paginationOpts) {
      const page = await q.paginate(args.paginationOpts)
      return { ...page, page: filterDrafts(page.page) }
    }
    return filterDrafts(await q.take(50))
  },
})

/**
 * Retrieve a single encounter with amendments and attachment metadata.
 */
export const getById = query({
  args: { encounterId: v.id('clinicalEncounters') },
  returns: v.union(encounterWithAmendmentsValidator, v.null()),
  handler: async (ctx, args) => {
    const encounter = await ctx.db.get(args.encounterId)
    if (!encounter) return null

    await requirePatientAccess(ctx, encounter.patientId, 'view_plan')

    const amendments = await ctx.db
      .query('encounterAmendments')
      .withIndex('by_encounterId', q => q.eq('encounterId', args.encounterId))
      .order('desc')
      .collect()

    const attachments = await getEncounterAttachments(ctx, args.encounterId)
    const clinician = await ctx.db.get(encounter.clinicianUserId)

    return {
      encounter,
      amendments,
      attachments,
      clinicianName: clinician?.name ?? null,
    }
  },
})

/**
 * Returns secure attachment policy metadata (no public URLs).
 */
export const getAttachmentPolicy = query({
  args: {},
  returns: attachmentPolicyValidator,
  handler: async () => {
    return {
      allowedMimeTypes: [...ATTACHMENT_POLICY.allowedMimeTypes],
      allowedExtensions: [...ATTACHMENT_POLICY.allowedExtensions],
      maxSizeBytes: ATTACHMENT_POLICY.maxSizeBytes,
      maxFilesPerEncounter: ATTACHMENT_POLICY.maxFilesPerEncounter,
      malwareScanPlan: ATTACHMENT_POLICY.malwareScanPlan,
      storageStatus: ATTACHMENT_POLICY.storageStatus,
      authorizationRequired: ATTACHMENT_POLICY.authorizationRequired,
    }
  },
})

/**
 * Autosave an encounter draft. Creates a new draft or updates an existing one.
 */
export const saveDraft = mutation({
  args: {
    patientId: v.id('patients'),
    encounterId: v.optional(v.id('clinicalEncounters')),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    encounterType: encounterTypeValidator,
    diagnosis: v.string(),
    datetime: v.string(),
    clinicalSummary: v.string(),
    notes: v.string(),
  },
  returns: v.id('clinicalEncounters'),
  handler: async (ctx, args) => {
    const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    const validDiagnosis = validateStringLength(args.diagnosis, 'Diagnosis', 1, 200)
    const validDatetime = validateDateString(args.datetime, 'Datetime')
    const validSummary = validateStringLength(args.clinicalSummary, 'Clinical summary', 0, 500)
    const validNotes = validateStringLength(args.notes, 'Clinical notes', 0, 5000)

    const now = Date.now()

    if (args.encounterId) {
      const { encounter } = await requireEditableEncounter(ctx, args.encounterId)
      if (encounter.patientId !== args.patientId) {
        throw new Error('Encounter does not belong to this patient.')
      }

      await ctx.db.patch(args.encounterId, {
        encounterType: args.encounterType,
        diagnosis: validDiagnosis,
        datetime: validDatetime,
        clinicalSummary: validSummary,
        notes: validNotes,
        updatedAt: now,
      })
      return args.encounterId
    }

    return await ctx.db.insert('clinicalEncounters', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      orgId: patient.orgId,
      clinicianUserId: clinicianUser._id,
      encounterType: args.encounterType,
      status: 'draft',
      diagnosis: validDiagnosis,
      datetime: validDatetime,
      clinicalSummary: validSummary,
      notes: validNotes,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Finalize a draft encounter after clinician confirmation.
 */
export const finalizeEncounter = mutation({
  args: {
    encounterId: v.id('clinicalEncounters'),
    confirmFinalization: v.literal(true),
  },
  returns: v.id('clinicalEncounters'),
  handler: async (ctx, args) => {
    if (!args.confirmFinalization) {
      throw new Error('Finalization requires explicit confirmation.')
    }

    const { encounter, patient } = await requireEditableEncounter(ctx, args.encounterId)

    if (!encounter.clinicalSummary.trim() || encounter.clinicalSummary.trim().length < 2) {
      throw new Error('Clinical summary must be at least 2 characters before finalization.')
    }
    if (!encounter.notes.trim() || encounter.notes.trim().length < 2) {
      throw new Error('Clinical notes must be at least 2 characters before finalization.')
    }

    const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])
    const now = Date.now()

    await ctx.db.patch(args.encounterId, {
      status: 'finalized',
      finalizedAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: clinicianUser._id,
      actorRole: clinicianUser.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Finalized ${encounter.encounterType} clinical encounter`,
      targetResource: 'clinicalEncounters',
      resourceId: args.encounterId,
      action: 'update',
      createdAt: now,
    })

    return args.encounterId
  },
})

/**
 * Submit an audited amendment to a finalized encounter.
 */
export const amendEncounter = mutation({
  args: {
    encounterId: v.id('clinicalEncounters'),
    reason: v.string(),
    clinicalSummary: v.string(),
    notes: v.string(),
  },
  returns: v.id('encounterAmendments'),
  handler: async (ctx, args) => {
    const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])
    const encounter = await ctx.db.get(args.encounterId)
    if (!encounter) {
      throw new Error('Encounter not found.')
    }

    const { patient } = await requirePatientAccess(ctx, encounter.patientId)

    if (resolveEncounterStatus(encounter) !== 'finalized') {
      throw new Error('Only finalized encounters can be amended.')
    }

    const validReason = validateStringLength(args.reason, 'Amendment reason', 5, 500)
    const validSummary = validateStringLength(args.clinicalSummary, 'Clinical summary', 2, 500)
    const validNotes = validateStringLength(args.notes, 'Clinical notes', 2, 5000)

    const latestAmendment = await getLatestAmendment(ctx, args.encounterId)
    const effective = getEffectiveEncounterContent(encounter, latestAmendment)
    const now = Date.now()

    const amendmentId = await ctx.db.insert('encounterAmendments', {
      encounterId: args.encounterId,
      patientId: patient._id,
      orgId: patient.orgId,
      amendedByUserId: clinicianUser._id,
      reason: validReason,
      clinicalSummary: validSummary,
      notes: validNotes,
      originalClinicalSummary: effective.clinicalSummary,
      originalNotes: effective.notes,
      createdAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: clinicianUser._id,
      actorRole: clinicianUser.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Amended finalized ${encounter.encounterType} clinical encounter`,
      targetResource: 'encounterAmendments',
      resourceId: amendmentId,
      action: 'update',
      createdAt: now,
    })

    return amendmentId
  },
})

/**
 * Register attachment metadata for an encounter (policy enforcement; no public URL).
 */
export const registerAttachmentMetadata = mutation({
  args: {
    patientId: v.id('patients'),
    encounterId: v.optional(v.id('clinicalEncounters')),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  returns: v.id('encounterAttachmentMetadata'),
  handler: async (ctx, args) => {
    const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    const validFileName = validateStringLength(args.fileName, 'File name', 1, 255)

    if (args.encounterId) {
      const encounter = await ctx.db.get(args.encounterId)
      if (!encounter || encounter.patientId !== args.patientId) {
        throw new Error('Encounter not found for this patient.')
      }
      if (!isEncounterEditable(encounter)) {
        throw new Error('Attachments can only be added to draft encounters.')
      }

      const existing = await getEncounterAttachments(ctx, args.encounterId)
      if (existing.length >= ATTACHMENT_POLICY.maxFilesPerEncounter) {
        throw new Error(
          `Maximum of ${ATTACHMENT_POLICY.maxFilesPerEncounter} attachments per encounter.`
        )
      }
    }

    validateAttachmentFile({
      fileName: validFileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
    })

    const now = Date.now()
    return await ctx.db.insert('encounterAttachmentMetadata', {
      encounterId: args.encounterId,
      patientId: patient._id,
      orgId: patient.orgId,
      uploadedByUserId: clinicianUser._id,
      fileName: validFileName,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      scanStatus: 'pending',
      authorizationScope: 'clinical_encounter',
      createdAt: now,
    })
  },
})

/**
 * Document a new clinical encounter (finalized immediately).
 * Restricted to clinicians and administrators.
 */
export const createEncounter = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    encounterType: encounterTypeValidator,
    diagnosis: v.string(),
    datetime: v.string(),
    clinicalSummary: v.string(),
    notes: v.string(),
    attachmentStorageId: v.optional(v.id('_storage')),
  },
  returns: v.id('clinicalEncounters'),
  handler: async (ctx, args) => {
    const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    const validDiagnosis = validateStringLength(args.diagnosis, 'Diagnosis', 2, 200)
    const validDatetime = validateDateString(args.datetime, 'Datetime')
    const validSummary = validateStringLength(args.clinicalSummary, 'Clinical summary', 2, 500)
    const validNotes = validateStringLength(args.notes, 'Clinical Notes', 2, 5000)

    const now = Date.now()
    const encounterId = await ctx.db.insert('clinicalEncounters', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      orgId: patient.orgId,
      clinicianUserId: clinicianUser._id,
      encounterType: args.encounterType,
      status: 'finalized',
      diagnosis: validDiagnosis,
      datetime: validDatetime,
      clinicalSummary: validSummary,
      notes: validNotes,
      attachmentStorageId: args.attachmentStorageId,
      finalizedAt: now,
      createdAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: clinicianUser._id,
      actorRole: clinicianUser.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Documented ${args.encounterType} clinical encounter`,
      targetResource: 'clinicalEncounters',
      resourceId: encounterId,
      action: 'create',
      createdAt: now,
    })

    return encounterId
  },
})
