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
    patientId: v.id('patients'),
    limit: v.optional(v.number()),
  },
  returns: v.array(recoveryTrendDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    const limit = Math.min(Math.max(args.limit ?? 30, 1), 90)

    return await ctx.db
      .query('recoveryTrends')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(limit)
  },
})

/**
 * Add a longitudinal trend data point.
 */
export const addTrendPoint = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    date: v.string(),
    dayLabel: v.string(),
    symptomTotal: v.number(),
    headacheRating: v.number(),
    sleepQuality: v.number(),
  },
  returns: v.id('recoveryTrends'),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId)

    const validDay = validateStringLength(args.dayLabel, 'Day label', 1, 30)
    const validDate = validateDateString(args.date, 'Trend date')
    validateScore(args.symptomTotal, 0, 48)
    validateScore(args.headacheRating, 0, 6)
    validateScore(args.sleepQuality, 0, 10)

    return await ctx.db.insert('recoveryTrends', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      date: validDate,
      dayLabel: validDay,
      symptomTotal: args.symptomTotal,
      headacheRating: args.headacheRating,
      sleepQuality: args.sleepQuality,
      createdAt: Date.now(),
    })
  },
})

