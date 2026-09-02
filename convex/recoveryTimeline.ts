import { v } from 'convex/values'
import { query } from './_generated/server'
import { requirePatientAccess } from './lib/auth'
import { validateDateString } from './lib/businessLogic'
import {
  buildTimelineDayPoints,
  buildTimelineEventMarkers,
  buildTimelineSummary,
  type ComparisonViewKey,
  type SymptomGroupKey,
  type TimelineRangeKey,
} from './lib/recoveryTimelineLogic'
import {
  comparisonViewKeyValidator,
  recoveryTimelinePayloadValidator,
  symptomGroupKeyValidator,
  timelineRangeKeyValidator,
} from './lib/validators'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

async function getActiveEpisodeForPatient(ctx: QueryCtx, patientId: Id<'patients'>) {
  return await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId_and_status', q => q.eq('patientId', patientId).eq('status', 'active'))
    .first()
}

/**
 * Longitudinal recovery timeline comparing symptoms with activity, sleep, or screen exposure.
 * Client supplies `today` for deterministic caching; dates use the patient's time zone.
 */
export const getTimeline = query({
  args: {
    patientId: v.id('patients'),
    today: v.string(),
    range: timelineRangeKeyValidator,
    symptomGroup: symptomGroupKeyValidator,
    comparisonView: comparisonViewKeyValidator,
  },
  returns: recoveryTimelinePayloadValidator,
  handler: async (ctx, args) => {
    const { patient } = await requirePatientAccess(ctx, args.patientId, 'view_trends')
    const validToday = validateDateString(args.today, 'Today')
    const timeZone = patient.timeZone ?? 'UTC'

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)

    const checkIns = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(120)

    const exposures = await ctx.db
      .query('activityExposures')
      .withIndex('by_patientId', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(120)

    const encounters = await ctx.db
      .query('clinicalEncounters')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(30)

    const carePlans = await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', patient._id))
      .take(80)

    const amendments = await ctx.db
      .query('checkInAmendments')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(40)

    const safetyEvaluations = await ctx.db
      .query('safetyEvaluations')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(40)

    const buildArgs = {
      range: args.range as TimelineRangeKey,
      symptomGroup: args.symptomGroup as SymptomGroupKey,
      comparisonView: args.comparisonView as ComparisonViewKey,
      today: validToday,
      timeZone,
      episode,
      checkIns,
      exposures,
      encounters,
      carePlans,
      amendments,
      safetyEvaluations,
    }

    const points = buildTimelineDayPoints(buildArgs)
    const events = buildTimelineEventMarkers(buildArgs)
    const summary = buildTimelineSummary(points, buildArgs.symptomGroup, buildArgs.comparisonView)

    return {
      dataSource: 'live' as const,
      timeZone,
      range: args.range,
      symptomGroup: args.symptomGroup,
      comparisonView: args.comparisonView,
      windowStart: points[0]?.date ?? validToday,
      windowEnd: points[points.length - 1]?.date ?? validToday,
      points,
      events,
      summary,
    }
  },
})
