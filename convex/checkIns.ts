import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  activityImpactValidator,
  checkInDocValidator,
  symptomsObjectValidator,
} from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import {
  sanitizeInput,
  validateConcussionSymptoms,
  validateDateString,
} from './lib/businessLogic'

/**
 * List historical check-ins for a patient in reverse-chronological order.
 * Enforces ownership / patient access authorization and caregiver consent scopes.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(checkInDocValidator), v.array(checkInDocValidator)),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const q = ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }
    return await q.take(50)
  },
})

/**
 * Get the most recent check-in for a patient.
 */
export const getLatest = query({
  args: { patientId: v.id('patients') },
  returns: v.union(checkInDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .first()
  },
})

/**
 * Submit a daily concussion check-in.
 * Validates 8-symptom ratings (0-6), computes total (0-48), checks danger signs,
 * records submitter identity, and triggers safety triage alerts if needed.
 */
export const submitCheckIn = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    date: v.string(),
    symptoms: symptomsObjectValidator,
    activityImpact: activityImpactValidator,
    dangerSigns: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
  },
  returns: v.id('checkIns'),
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const validDate = validateDateString(args.date, 'Check-in date')
    const symptomTotal = validateConcussionSymptoms(args.symptoms)

    const sanitizedNote = args.note ? sanitizeInput(args.note) : undefined
    if (sanitizedNote && sanitizedNote.length > 2000) {
      throw new Error('Check-in note cannot exceed 2000 characters.')
    }

    const dangerSignsList = args.dangerSigns ?? []
    const dangerSignsPresent = dangerSignsList.length > 0
    const now = Date.now()

    const checkInId = await ctx.db.insert('checkIns', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      submittedByUserId: user._id,
      date: validDate,
      symptoms: args.symptoms,
      symptomTotal,
      activityImpact: args.activityImpact,
      dangerSignsPresent,
      dangerSigns: dangerSignsList,
      note: sanitizedNote,
      createdAt: now,
    })

    // Automatic Safety Escalation: If danger signs are checked, generate immediate high alert
    if (dangerSignsPresent) {
      await ctx.db.insert('alerts', {
        patientId: args.patientId,
        episodeId: args.episodeId,
        orgId: patient.orgId,
        detail: `Tier 1 danger sign(s) reported: ${dangerSignsList.join(', ')}`,
        severity: 'High',
        status: 'active',
        dangerSigns: dangerSignsList,
        createdAt: now,
      })
    }

    // Record audit trail
    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Submitted daily check-in (Symptom Total: ${symptomTotal}/48, Danger Signs: ${dangerSignsPresent ? 'YES' : 'NO'})`,
      targetResource: 'checkIns',
      resourceId: checkInId,
      action: 'create',
      createdAt: now,
    })

    return checkInId
  },
})

