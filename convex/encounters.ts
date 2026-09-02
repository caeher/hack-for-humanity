import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { encounterDocValidator, encounterTypeValidator } from './lib/validators'
import { requirePatientAccess, requireRole } from './lib/auth'
import { validateDateString, validateStringLength } from './lib/businessLogic'

/**
 * List clinical encounters for a patient.
 * Reverse-chronological order with cursor pagination.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    paginationOpts: v.optional(paginationOptsValidator),
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

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }
    return await q.take(50)
  },
})

/**
 * Document a new clinical encounter.
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
      diagnosis: validDiagnosis,
      datetime: validDatetime,
      clinicalSummary: validSummary,
      notes: validNotes,
      attachmentStorageId: args.attachmentStorageId,
      createdAt: now,
    })

    // Log clinical audit trail entry
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

