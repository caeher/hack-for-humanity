import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requirePatientAccess } from './lib/auth'
import { validateDateString } from './lib/businessLogic'
import {
  detectLongitudinalPatterns,
  PATTERN_DETECTION_VERSION,
  PATTERN_EVIDENCE_THRESHOLDS,
  NON_CAUSAL_DISCLAIMER,
  type CheckInObservation,
  type ExposureObservation,
  type PatternEvidence,
} from './lib/patternDetection'
import {
  patternDetectionResultValidator,
  patternInsightDocValidator,
} from './lib/validators'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

async function loadPatternInput(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<'patients'>,
  today: string,
  windowDays?: number
) {
  const checkIns = await ctx.db
    .query('checkIns')
    .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patientId))
    .order('desc')
    .take(90)

  const exposures = await ctx.db
    .query('activityExposures')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .order('desc')
    .take(90)

  const checkInObservations: CheckInObservation[] = checkIns.map(checkIn => ({
    date: checkIn.date,
    symptomTotal: checkIn.symptomTotal,
    symptoms: {
      headache: checkIn.symptoms.headache,
      dizziness: checkIn.symptoms.dizziness,
      concentration: checkIn.symptoms.concentration,
    },
  }))

  const exposureObservations: ExposureObservation[] = exposures.map(exposure => ({
    date: exposure.date,
    sleepHours: exposure.sleepHours,
    screenMinutes: exposure.screenMinutes,
    physicalExertionScore: exposure.physicalExertionScore,
    cognitiveMinutes: exposure.cognitiveMinutes,
  }))

  return detectLongitudinalPatterns({
    checkIns: checkInObservations,
    exposures: exposureObservations,
    today,
    windowDays,
  })
}

function toStoredFields(
  patientId: Id<'patients'>,
  episodeId: Id<'recoveryEpisodes'> | undefined,
  pattern: PatternEvidence,
  computedAt: string,
  createdAt: number
) {
  return {
    patientId,
    episodeId,
    patternType: pattern.patternType,
    status: pattern.status,
    effectDirection: pattern.effectDirection ?? undefined,
    strength: pattern.strength ?? undefined,
    confidence: pattern.confidence ?? undefined,
    sampleCount: pattern.sampleCount,
    matchCount: pattern.matchCount,
    inputDateRangeStart: pattern.inputDateRangeStart ?? undefined,
    inputDateRangeEnd: pattern.inputDateRangeEnd ?? undefined,
    algorithmVersion: pattern.algorithmVersion,
    title: pattern.title,
    description: pattern.description,
    footer: pattern.footer,
    suppressedReason: pattern.suppressedReason ?? undefined,
    computedAt,
    createdAt,
  }
}

/**
 * Computes longitudinal pattern associations for a patient without persisting.
 * Client supplies `today` for deterministic caching/reactivity.
 */
export const computeForPatient = query({
  args: {
    patientId: v.id('patients'),
    today: v.string(),
    windowDays: v.optional(v.number()),
  },
  returns: patternDetectionResultValidator,
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')
    const validToday = validateDateString(args.today, 'Today')
    return await loadPatternInput(ctx, args.patientId, validToday, args.windowDays)
  },
})

/**
 * Lists stored pattern insights for a patient (available patterns only by default).
 */
export const listForPatient = query({
  args: {
    patientId: v.id('patients'),
    includeSuppressed: v.optional(v.boolean()),
  },
  returns: v.array(patternInsightDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_trends')

    const stored = await ctx.db
      .query('patternInsights')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(50)

    if (args.includeSuppressed) {
      return stored
    }

    return stored.filter(insight => insight.status === 'available')
  },
})

/**
 * Recomputes patterns from check-in and exposure data, persists available insights,
 * and returns the full detection result.
 */
export const refreshForPatient = mutation({
  args: {
    patientId: v.id('patients'),
    today: v.string(),
    windowDays: v.optional(v.number()),
  },
  returns: patternDetectionResultValidator,
  handler: async (ctx, args) => {
    const { patient } = await requirePatientAccess(ctx, args.patientId, 'view_trends')
    const validToday = validateDateString(args.today, 'Today')
    const result = await loadPatternInput(ctx, args.patientId, validToday, args.windowDays)

    const episode = await ctx.db
      .query('recoveryEpisodes')
      .withIndex('by_patientId_and_status', q =>
        q.eq('patientId', patient._id).eq('status', 'active')
      )
      .first()

    const existing = await ctx.db
      .query('patternInsights')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .collect()

    for (const row of existing) {
      if (row.algorithmVersion === PATTERN_DETECTION_VERSION && row.computedAt === validToday) {
        await ctx.db.delete('patternInsights', row._id)
      }
    }

    const createdAt = Date.now()
    for (const pattern of result.patterns) {
      if (pattern.status !== 'available') continue
      await ctx.db.insert(
        'patternInsights',
        toStoredFields(args.patientId, episode?._id, pattern, validToday, createdAt)
      )
    }

    return result
  },
})

/**
 * Exposes active pattern-detection methodology metadata for inspection.
 */
export const getMethodologyInfo = query({
  args: {},
  returns: v.object({
    version: v.string(),
    minimumCheckIns: v.number(),
    minimumPairedObservations: v.number(),
    minimumMatchCount: v.number(),
    analysisWindowDays: v.number(),
    nonCausalDisclaimer: v.string(),
  }),
  handler: async () => {
    return {
      version: PATTERN_DETECTION_VERSION,
      minimumCheckIns: PATTERN_EVIDENCE_THRESHOLDS.minimumCheckIns,
      minimumPairedObservations: PATTERN_EVIDENCE_THRESHOLDS.minimumPairedObservations,
      minimumMatchCount: PATTERN_EVIDENCE_THRESHOLDS.minimumMatchCount,
      analysisWindowDays: PATTERN_EVIDENCE_THRESHOLDS.analysisWindowDays,
      nonCausalDisclaimer: NON_CAUSAL_DISCLAIMER,
    }
  },
})
