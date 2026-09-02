import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import { requirePatientAccess } from './lib/auth'
import {
  computeDailyRollup,
  validateExposureDate,
  validateExposureEntryInput,
  type ExposureValidationWarning,
} from './lib/exposureLogic'
import {
  exposureEntryDocValidator,
  exposureEntryInputValidator,
  exposureLogResultValidator,
  exposureValidationWarningValidator,
} from './lib/validators'

async function syncDailyRollup(
  ctx: MutationCtx,
  patientId: Id<'patients'>,
  date: string,
  episodeId?: Id<'recoveryEpisodes'>,
  checkInId?: Id<'checkIns'>
): Promise<void> {
  const entries = await ctx.db
    .query('exposureEntries')
    .withIndex('by_patientId_and_date', q => q.eq('patientId', patientId).eq('date', date))
    .collect()

  const rollup = computeDailyRollup(entries)

  const existing = await ctx.db
    .query('activityExposures')
    .withIndex('by_patientId_and_date', q => q.eq('patientId', patientId).eq('date', date))
    .first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      episodeId: episodeId ?? existing.episodeId,
      checkInId: checkInId ?? existing.checkInId,
      cognitiveMinutes: rollup.cognitiveMinutes,
      screenMinutes: rollup.screenMinutes,
      physicalExertionScore: rollup.physicalExertionScore,
      sleepHours: rollup.sleepHours,
      sleepQuality: rollup.sleepQuality,
    })
    return
  }

  if (
    rollup.cognitiveMinutes === 0 &&
    rollup.screenMinutes === 0 &&
    rollup.physicalExertionScore === 0 &&
    rollup.sleepHours === 0 &&
    rollup.sleepQuality === 0
  ) {
    return
  }

  await ctx.db.insert('activityExposures', {
    patientId,
    episodeId,
    checkInId,
    date,
    cognitiveMinutes: rollup.cognitiveMinutes,
    screenMinutes: rollup.screenMinutes,
    physicalExertionScore: rollup.physicalExertionScore,
    sleepHours: rollup.sleepHours,
    sleepQuality: rollup.sleepQuality,
    createdAt: Date.now(),
  })
}

/**
 * List exposure entries for a patient, optionally filtered by date or domain.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    date: v.optional(v.string()),
    domain: v.optional(
      v.union(
        v.literal('physical'),
        v.literal('cognitive'),
        v.literal('work_school'),
        v.literal('screen'),
        v.literal('sleep')
      )
    ),
    limit: v.optional(v.number()),
  },
  returns: v.array(exposureEntryDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)

    if (args.date) {
      const validDate = validateExposureDate(args.date)
      const entries = await ctx.db
        .query('exposureEntries')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', args.patientId).eq('date', validDate)
        )
        .order('desc')
        .take(limit)

      if (args.domain) {
        return entries.filter(e => e.domain === args.domain)
      }
      return entries
    }

    const entries = await ctx.db
      .query('exposureEntries')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(limit)

    if (args.domain) {
      return entries.filter(e => e.domain === args.domain)
    }
    return entries
  },
})

/**
 * List exposure entries linked to a specific check-in.
 */
export const listByCheckIn = query({
  args: {
    patientId: v.id('patients'),
    checkInId: v.id('checkIns'),
  },
  returns: v.array(exposureEntryDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    return await ctx.db
      .query('exposureEntries')
      .withIndex('by_checkInId', q => q.eq('checkInId', args.checkInId))
      .collect()
  },
})

/**
 * Log a single exposure entry with validation and daily rollup sync.
 */
export const logEntry = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    checkInId: v.optional(v.id('checkIns')),
    date: v.string(),
    entry: exposureEntryInputValidator,
  },
  returns: exposureLogResultValidator,
  handler: async (ctx, args) => {
    const { user } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const validDate = validateExposureDate(args.date)

    const existingForDate = await ctx.db
      .query('exposureEntries')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', args.patientId).eq('date', validDate)
      )
      .collect()

    const validated = validateExposureEntryInput(args.entry, existingForDate)

    let episodeId = args.episodeId
    if (!episodeId) {
      const activeEpisode = await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_patientId_and_status', q =>
          q.eq('patientId', args.patientId).eq('status', 'active')
        )
        .first()
      episodeId = activeEpisode?._id
    }

    const now = Date.now()
    const entryId = await ctx.db.insert('exposureEntries', {
      patientId: args.patientId,
      episodeId,
      checkInId: args.checkInId,
      date: validDate,
      domain: validated.domain,
      activityType: validated.activityType,
      durationMinutes: validated.durationMinutes,
      intensity: validated.intensity,
      startTime: validated.startTime,
      endTime: validated.endTime,
      symptomsWorsened: validated.symptomsWorsened,
      symptomOnsetMinutes: validated.symptomOnsetMinutes,
      symptomMagnitude: validated.symptomMagnitude,
      symptomRecoveryMinutes: validated.symptomRecoveryMinutes,
      sleepHours: validated.sleepHours,
      sleepQuality: validated.sleepQuality,
      contextNote: validated.contextNote,
      submittedByUserId: user._id,
      createdAt: now,
    })

    await syncDailyRollup(ctx, args.patientId, validDate, episodeId, args.checkInId)

    return {
      entryId,
      warnings: validated.warnings,
    }
  },
})

/**
 * Log multiple exposure entries in one call (e.g. from daily check-in quick log).
 */
export const logBatch = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    checkInId: v.optional(v.id('checkIns')),
    date: v.string(),
    entries: v.array(exposureEntryInputValidator),
  },
  returns: v.object({
    entryIds: v.array(v.id('exposureEntries')),
    warnings: v.array(exposureValidationWarningValidator),
  }),
  handler: async (ctx, args) => {
    const { user } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const validDate = validateExposureDate(args.date)
    const entryIds: Id<'exposureEntries'>[] = []
    const allWarnings: ExposureValidationWarning[] = []

    let episodeId = args.episodeId
    if (!episodeId) {
      const activeEpisode = await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_patientId_and_status', q =>
          q.eq('patientId', args.patientId).eq('status', 'active')
        )
        .first()
      episodeId = activeEpisode?._id
    }

    const existingForDate = await ctx.db
      .query('exposureEntries')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', args.patientId).eq('date', validDate)
      )
      .collect()

    const now = Date.now()
    const pendingForOverlap: Array<{ startTime?: string; endTime?: string }> = [
      ...existingForDate.map(e => ({ startTime: e.startTime, endTime: e.endTime })),
    ]

    for (const rawEntry of args.entries) {
      const validated = validateExposureEntryInput(rawEntry, pendingForOverlap)

      const entryId = await ctx.db.insert('exposureEntries', {
        patientId: args.patientId,
        episodeId,
        checkInId: args.checkInId,
        date: validDate,
        domain: validated.domain,
        activityType: validated.activityType,
        durationMinutes: validated.durationMinutes,
        intensity: validated.intensity,
        startTime: validated.startTime,
        endTime: validated.endTime,
        symptomsWorsened: validated.symptomsWorsened,
        symptomOnsetMinutes: validated.symptomOnsetMinutes,
        symptomMagnitude: validated.symptomMagnitude,
        symptomRecoveryMinutes: validated.symptomRecoveryMinutes,
        sleepHours: validated.sleepHours,
        sleepQuality: validated.sleepQuality,
        contextNote: validated.contextNote,
        submittedByUserId: user._id,
        createdAt: now,
      })

      entryIds.push(entryId)
      allWarnings.push(...validated.warnings)

      pendingForOverlap.push({
        startTime: validated.startTime,
        endTime: validated.endTime,
      })
    }

    if (entryIds.length > 0) {
      await syncDailyRollup(ctx, args.patientId, validDate, episodeId, args.checkInId)
    }

    return { entryIds, warnings: allWarnings }
  },
})

/**
 * Update an existing exposure entry.
 */
export const updateEntry = mutation({
  args: {
    patientId: v.id('patients'),
    entryId: v.id('exposureEntries'),
    entry: exposureEntryInputValidator,
  },
  returns: exposureLogResultValidator,
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const existing = await ctx.db.get('exposureEntries', args.entryId)
    if (!existing || existing.patientId !== args.patientId) {
      throw new Error('Exposure entry not found.')
    }

    const siblings = await ctx.db
      .query('exposureEntries')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', args.patientId).eq('date', existing.date)
      )
      .collect()

    const others = siblings.filter(e => e._id !== args.entryId)
    const validated = validateExposureEntryInput(args.entry, others)

    const now = Date.now()
    await ctx.db.patch(args.entryId, {
      domain: validated.domain,
      activityType: validated.activityType,
      durationMinutes: validated.durationMinutes,
      intensity: validated.intensity,
      startTime: validated.startTime,
      endTime: validated.endTime,
      symptomsWorsened: validated.symptomsWorsened,
      symptomOnsetMinutes: validated.symptomOnsetMinutes,
      symptomMagnitude: validated.symptomMagnitude,
      symptomRecoveryMinutes: validated.symptomRecoveryMinutes,
      sleepHours: validated.sleepHours,
      sleepQuality: validated.sleepQuality,
      contextNote: validated.contextNote,
      updatedAt: now,
    })

    await syncDailyRollup(
      ctx,
      args.patientId,
      existing.date,
      existing.episodeId,
      existing.checkInId
    )

    return {
      entryId: args.entryId,
      warnings: validated.warnings,
    }
  },
})

/**
 * Delete an exposure entry and refresh the daily rollup.
 */
export const deleteEntry = mutation({
  args: {
    patientId: v.id('patients'),
    entryId: v.id('exposureEntries'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const existing = await ctx.db.get('exposureEntries', args.entryId)
    if (!existing || existing.patientId !== args.patientId) {
      throw new Error('Exposure entry not found.')
    }

    const { date, episodeId, checkInId } = existing
    await ctx.db.delete('exposureEntries', args.entryId)
    await syncDailyRollup(ctx, args.patientId, date, episodeId, checkInId)

    return null
  },
})
