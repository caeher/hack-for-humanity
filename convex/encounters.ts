import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { encounterDocValidator } from './lib/validators'
import { requirePatientAccess, requireRole } from './lib/auth'
import { validateDateString, validateStringLength } from './lib/businessLogic'

/**
 * List clinical encounters for a patient.
 * Reverse-chronological order with cursor pagination.
 */
export const listByPatient = query({
  args: {
    patientId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(
    paginationResultValidator(encounterDocValidator),
    v.array(encounterDocValidator)
  ),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    const q = ctx.db
      .query('clinicalEncounters')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
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
    patientId: v.string(),
    patientName: v.string(),
    encounterType: v.string(),
    diagnosis: v.string(),
    datetime: v.string(),
    notes: v.string(),
    clinicianName: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
  },
  returns: v.id('clinicalEncounters'),
  handler: async (ctx, args) => {
    const { user: clinicianUser } = await requireRole(ctx, ['admin', 'clinician'])

    const validPatientId = validateStringLength(args.patientId, 'Patient ID', 1, 64)
    const validPatientName = validateStringLength(args.patientName, 'Patient Name', 2, 100)
    const validEncounterType = validateStringLength(args.encounterType, 'Encounter Type', 2, 50)
    const validDiagnosis = validateStringLength(args.diagnosis, 'Diagnosis', 2, 200)
    const validDatetime = validateDateString(args.datetime, 'Datetime')
    const validNotes = validateStringLength(args.notes, 'Clinical Notes', 2, 5000)

    const now = Date.now()
    const id = await ctx.db.insert('clinicalEncounters', {
      patientId: validPatientId,
      patientName: validPatientName,
      encounterType: validEncounterType,
      diagnosis: validDiagnosis,
      datetime: validDatetime,
      notes: validNotes,
      clinicianName: args.clinicianName || clinicianUser.name,
      attachmentUrl: args.attachmentUrl,
      createdAt: now,
    })

    // Log clinical audit trail entry
    await ctx.db.insert('auditLogs', {
      time: 'Just now',
      actor: clinicianUser.name || 'Clinician',
      event: `Documented ${validEncounterType} clinical encounter`,
      resource: validPatientId,
      createdAt: now,
    })

    return id
  },
})
