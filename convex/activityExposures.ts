import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { activityExposureDocValidator } from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import {
  validateDateString,
  validateScore,
} from './lib/businessLogic'

/**
 * List historical activity and exertion exposures for a patient.
 * Enforces ownership / patient access authorization and caregiver consent scopes.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityExposureDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    const limit = Math.min(Math.max(args.limit ?? 30, 1), 90)

    return await ctx.db
      .query('activityExposures')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Get activity exposure for a specific date.
 */
export const getByDate = query({
  args: {
    patientId: v.id('patients'),
    date: v.string(),
  },
  returns: v.union(activityExposureDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    const validDate = validateDateString(args.date, 'Exposure date')

    return await ctx.db
      .query('activityExposures')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', args.patientId).eq('date', validDate)
      )
      .first()
  },
})

/**
 * Log daily cognitive, screen, physical exertion, and sleep context.
 */
export const logExposure = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    checkInId: v.optional(v.id('checkIns')),
    date: v.string(),
    cognitiveMinutes: v.number(),
    screenMinutes: v.number(),
    physicalExertionScore: v.number(),
    sleepHours: v.number(),
    sleepQuality: v.number(),
  },
  returns: v.id('activityExposures'),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const validDate = validateDateString(args.date, 'Exposure date')
    validateScore(args.cognitiveMinutes, 0, 1440)
    validateScore(args.screenMinutes, 0, 1440)
    validateScore(args.physicalExertionScore, 0, 10)
    validateScore(args.sleepHours, 0, 24)
    validateScore(args.sleepQuality, 0, 10)

    // Check if an entry already exists for this date to update it instead of duplicate
    const existing = await ctx.db
      .query('activityExposures')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', args.patientId).eq('date', validDate)
      )
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        episodeId: args.episodeId,
        checkInId: args.checkInId,
        cognitiveMinutes: args.cognitiveMinutes,
        screenMinutes: args.screenMinutes,
        physicalExertionScore: args.physicalExertionScore,
        sleepHours: args.sleepHours,
        sleepQuality: args.sleepQuality,
      })
      return existing._id
    }

    return await ctx.db.insert('activityExposures', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      checkInId: args.checkInId,
      date: validDate,
      cognitiveMinutes: args.cognitiveMinutes,
      screenMinutes: args.screenMinutes,
      physicalExertionScore: args.physicalExertionScore,
      sleepHours: args.sleepHours,
      sleepQuality: args.sleepQuality,
      createdAt: now,
    })
  },
})
