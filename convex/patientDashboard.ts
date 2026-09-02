import { v } from 'convex/values'
import { query } from './_generated/server'
import { requirePatientAccess } from './lib/auth'
import { resolveEpisodeEndDate } from './lib/checkInHistoryLogic'
import { dashboardSummaryValidator } from './lib/validators'
import {
  buildSymptomTotalProvenanceFromSymptoms,
  buildTrendProvenance,
} from './lib/provenance'
import {
  buildChartPoints,
  computeCheckInConsistency,
  computeEpisodeDayNumber,
  deriveSleepHeadacheInsight,
  findNextEncounter,
  resolveSafetyEscalation,
} from './lib/patientDashboardLogic'
import { computeDescriptiveTrend, TREND_REQUIREMENTS } from './lib/symptomMethodology'
import { validateDateString } from './lib/businessLogic'
import type { Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'

async function getLatestAmendmentForCheckIn(ctx: QueryCtx, checkInId: Id<'checkIns'>) {
  const amendments = await ctx.db
    .query('checkInAmendments')
    .withIndex('by_checkInId', q => q.eq('checkInId', checkInId))
    .order('desc')
    .take(1)
  return amendments[0] ?? null
}

async function getActiveEpisodeForPatient(ctx: QueryCtx, patientId: Id<'patients'>) {
  return await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId_and_status', q => q.eq('patientId', patientId).eq('status', 'active'))
    .first()
}

/**
 * Aggregates live recovery-episode data for the authenticated patient dashboard.
 * Client supplies `today` to keep the query deterministic for caching/reactivity.
 */
export const getSummary = query({
  args: {
    patientId: v.id('patients'),
    today: v.string(),
  },
  returns: dashboardSummaryValidator,
  handler: async (ctx, args) => {
    const { patient, user } = await requirePatientAccess(ctx, args.patientId, 'view_trends')
    const validToday = validateDateString(args.today, 'Today')

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)
    const checkIns = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(90)

    const latestCheckIn = checkIns[0] ?? null
    const todayCheckIn =
      checkIns.find(checkIn => checkIn.date === validToday) ?? null

    const trendPoints = checkIns
      .map(checkIn => ({ date: checkIn.date, symptomTotal: checkIn.symptomTotal }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const trendSummaryBase = computeDescriptiveTrend(trendPoints, TREND_REQUIREMENTS.defaultWindowDays)
    const trendSummary = {
      ...trendSummaryBase,
      provenance: buildTrendProvenance({
        trend: trendSummaryBase,
        sourceCheckInDates: trendPoints.map(point => point.date),
      }),
    }
    const chartPoints = buildChartPoints(checkIns, validToday)

    const episodeStart = episode?.startDate ?? episode?.incidentDate ?? validToday
    const episodeEnd = episode ? resolveEpisodeEndDate(episode, validToday) : validToday
    const checkInDatesInEpisode = checkIns
      .filter(
        checkIn =>
          checkIn.date >= episodeStart &&
          checkIn.date <= episodeEnd
      )
      .map(checkIn => checkIn.date)

    const checkInConsistency = computeCheckInConsistency(
      episodeStart,
      episodeEnd,
      checkInDatesInEpisode
    )

    const todayExposure = await ctx.db
      .query('activityExposures')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', patient._id).eq('date', validToday)
      )
      .first()

    const exposures = await ctx.db
      .query('activityExposures')
      .withIndex('by_patientId', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(30)

    const carePlanTasks = await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', patient._id))
      .take(50)

    const dayNumber = episode
      ? computeEpisodeDayNumber(episode.incidentDate, validToday)
      : null

    const filteredCarePlan =
      dayNumber === null
        ? carePlanTasks
        : carePlanTasks.filter(task => task.dayNumber === undefined || task.dayNumber === dayNumber)

    const encounters = await ctx.db
      .query('clinicalEncounters')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(20)

    const nextEncounter = findNextEncounter(encounters, validToday)
    let nextEncounterClinicianName: string | null = null
    if (nextEncounter) {
      const clinician = await ctx.db.get(nextEncounter.clinicianUserId)
      nextEncounterClinicianName = clinician?.name ?? null
    }

    const latestSafety = await ctx.db
      .query('safetyEvaluations')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
      .order('desc')
      .first()

    const insight = deriveSleepHeadacheInsight(checkIns, exposures, validToday)
    const safetyEscalation = resolveSafetyEscalation(latestSafety)

    let latestSymptomProvenance = null
    if (todayCheckIn) {
      const latestAmendment = await getLatestAmendmentForCheckIn(ctx, todayCheckIn._id)
      const effectiveSymptoms = latestAmendment?.symptoms ?? todayCheckIn.symptoms
      latestSymptomProvenance = buildSymptomTotalProvenanceFromSymptoms({
        symptoms: effectiveSymptoms,
        checkInDate: todayCheckIn.date,
        checkInId: todayCheckIn._id,
        recomputedFromAmendment: latestAmendment !== null,
        amendmentNote: latestAmendment?.reason,
        hidePrivateNotes: user.role === 'caregiver',
      })
    }

    const displayName = patient.preferredName ?? 'there'

    return {
      dataSource: 'live' as const,
      patientName: displayName,
      preferredName: patient.preferredName,
      episodeId: episode?._id ?? null,
      incidentDate: episode?.incidentDate ?? null,
      injuryContext: episode?.injuryContext ?? null,
      dayNumber,
      today: validToday,
      hasCheckInToday: todayCheckIn !== null,
      latestCheckInDate: latestCheckIn?.date ?? null,
      latestSymptomTotal: todayCheckIn?.symptomTotal ?? null,
      latestHeadacheRating: todayCheckIn?.symptoms.headache ?? latestCheckIn?.symptoms.headache ?? null,
      latestCheckInUpdatedAt: todayCheckIn?.createdAt ?? latestCheckIn?.createdAt ?? null,
      latestSymptomProvenance,
      trendSummary,
      chartPoints,
      checkInConsistency,
      sleepHours: todayExposure?.sleepHours ?? null,
      sleepQuality: todayExposure?.sleepQuality ?? null,
      carePlanTasks: filteredCarePlan,
      nextEncounter,
      nextEncounterClinicianName,
      insight,
      safetyEscalation,
    }
  },
})
