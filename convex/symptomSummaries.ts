import { v } from 'convex/values'
import { query } from './_generated/server'
import { requirePatientAccess } from './lib/auth'
import { trendSummaryValidator } from './lib/validators'
import { buildTrendProvenance } from './lib/provenance'
import {
  computeDescriptiveTrend,
  METHODOLOGY_COPY,
  SYMPTOM_METHODOLOGY_VERSION,
  TREND_REQUIREMENTS,
  type CheckInDataPoint,
} from './lib/symptomMethodology'

/**
 * Returns a versioned, descriptive within-person trend summary for a patient.
 * Uses stored check-in symptom totals only — no interpolation of missing days.
 */
export const getTrendSummary = query({
  args: {
    patientId: v.id('patients'),
    windowDays: v.optional(v.number()),
  },
  returns: trendSummaryValidator,
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    const windowDays = Math.min(
      Math.max(args.windowDays ?? TREND_REQUIREMENTS.defaultWindowDays, 2),
      30
    )

    const checkIns = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(90)

    const points: CheckInDataPoint[] = checkIns
      .map(checkIn => ({
        date: checkIn.date,
        symptomTotal: checkIn.symptomTotal,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const trendBase = computeDescriptiveTrend(points, windowDays)
    return {
      ...trendBase,
      provenance: buildTrendProvenance({
        trend: trendBase,
        sourceCheckInDates: points.map(point => point.date),
      }),
    }
  },
})

/**
 * Exposes the active symptom-total methodology version and inspection rules metadata.
 */
export const getMethodologyInfo = query({
  args: {},
  returns: v.object({
    version: v.string(),
    metricName: v.string(),
    metricRange: v.string(),
    calculationRule: v.string(),
    notRecoveryScore: v.string(),
    trendDisclaimer: v.string(),
    minimumTotalEntries: v.number(),
    minimumConsecutiveDays: v.number(),
    defaultWindowDays: v.number(),
  }),
  handler: async () => {
    return {
      version: SYMPTOM_METHODOLOGY_VERSION,
      metricName: METHODOLOGY_COPY.metricName,
      metricRange: METHODOLOGY_COPY.metricRange,
      calculationRule: METHODOLOGY_COPY.calculationRule,
      notRecoveryScore: METHODOLOGY_COPY.notRecoveryScore,
      trendDisclaimer: METHODOLOGY_COPY.trendDisclaimer,
      minimumTotalEntries: TREND_REQUIREMENTS.minimumTotalEntries,
      minimumConsecutiveDays: TREND_REQUIREMENTS.minimumConsecutiveDays,
      defaultWindowDays: TREND_REQUIREMENTS.defaultWindowDays,
    }
  },
})
