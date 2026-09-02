import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { recoveryTrendDocValidator } from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import {
  validateDateString,
  validateScore,
  validateStringLength,
} from './lib/businessLogic'

/**
 * List recovery trend points for a patient.
 * Returns a bounded list of recent data points.
 */
export const listByPatient = query({
  args: {
    patientId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(recoveryTrendDocValidator),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    const limit = Math.min(Math.max(args.limit ?? 30, 1), 90)

    return await ctx.db
      .query('recoveryTrends')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
      .take(limit)
  },
})

/**
 * Add a longitudinal trend data point.
 */
export const addTrendPoint = mutation({
  args: {
    patientId: v.string(),
    day: v.string(),
    score: v.number(),
    pain: v.number(),
    mobility: v.number(),
    date: v.optional(v.string()),
  },
  returns: v.id('recoveryTrends'),
  handler: async (ctx, args) => {
    const validPatientId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validPatientId)

    const validDay = validateStringLength(args.day, 'day', 1, 30)
    validateScore(args.score, 0, 100)
    validateScore(args.pain, 0, 10)
    validateScore(args.mobility, 0, 10)
    const validDate = args.date ? validateDateString(args.date, 'date') : undefined

    return await ctx.db.insert('recoveryTrends', {
      patientId: validPatientId,
      day: validDay,
      score: args.score,
      pain: args.pain,
      mobility: args.mobility,
      date: validDate,
    })
  },
})
