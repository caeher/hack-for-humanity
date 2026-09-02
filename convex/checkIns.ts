import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { checkInDocValidator } from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import {
  sanitizeInput,
  validateCheckInScores,
  validateDateString,
  validateStringLength,
} from './lib/businessLogic'

/**
 * List historical check-ins for a patient in reverse-chronological order.
 * Enforces ownership / patient access authorization.
 */
export const listByPatient = query({
  args: {
    patientId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(checkInDocValidator), v.array(checkInDocValidator)),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    const q = ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
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
  args: { patientId: v.string() },
  returns: v.union(checkInDocValidator, v.null()),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
      .order('desc')
      .first()
  },
})

/**
 * Submit a daily concussion check-in.
 * Validates score ranges, notes, date format, and authorization.
 */
export const submitCheckIn = mutation({
  args: {
    patientId: v.string(),
    date: v.string(),
    painScore: v.number(),
    sleepScore: v.number(),
    mobilityScore: v.number(),
    emotionalScore: v.number(),
    symptomQuality: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.id('checkIns'),
  handler: async (ctx, args) => {
    const validPatientId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validPatientId)

    validateDateString(args.date, 'Check-in date')
    validateCheckInScores({
      painScore: args.painScore,
      sleepScore: args.sleepScore,
      mobilityScore: args.mobilityScore,
      emotionalScore: args.emotionalScore,
    })

    const sanitizedNote = args.note ? sanitizeInput(args.note) : undefined
    if (sanitizedNote && sanitizedNote.length > 2000) {
      throw new Error('Check-in note cannot exceed 2000 characters.')
    }

    return await ctx.db.insert('checkIns', {
      ...args,
      patientId: validPatientId,
      note: sanitizedNote,
      createdAt: Date.now(),
    })
  },
})
