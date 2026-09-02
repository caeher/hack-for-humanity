import { v } from 'convex/values'
import { query } from './_generated/server'
import { caregiverSupportSummaryValidator } from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import { validateDateString } from './lib/businessLogic'
import {
  buildRestrictedSections,
  getActiveCaregiverGrant,
  hasScope,
  redactCarePlanForCaregiver,
} from './lib/caregiverAccess'
import { buildChartPoints, findNextEncounter, resolveSafetyEscalation } from './lib/patientDashboardLogic'
import { buildSymptomTotalProvenanceFromSymptoms } from './lib/provenance'
import { computeDescriptiveTrend, TREND_REQUIREMENTS } from './lib/symptomMethodology'
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
 * Caregiver-facing, scope-filtered support summary for one patient.
 * Every section is omitted server-side when the active consent grant lacks permission.
 */
export const getSupportSummary = query({
  args: {
    patientId: v.id('patients'),
    today: v.string(),
  },
  returns: caregiverSupportSummaryValidator,
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId)
    if (user.role !== 'caregiver') {
      throw new Error('Forbidden: Caregiver access required.')
    }

    const validToday = validateDateString(args.today, 'Today')
    const grant = await getActiveCaregiverGrant(ctx, patient._id, user._id, Date.now())
    if (!grant) {
      throw new Error('Forbidden: Caregiver does not have active consent for this patient.')
    }

    const scopes = grant.scopes
    const restrictedSections = buildRestrictedSections(scopes)
    const displayName = patient.preferredName ?? patient.displayId

    let hasCheckInToday: boolean | null = null
    let latestSymptomTotal: number | null = null
    let latestCheckInDate: string | null = null
    let latestCheckInUpdatedAt: number | null = null
    let latestSymptomProvenance = null
    let chartPoints: ReturnType<typeof buildChartPoints> | null = null
    let trendSummaryText: string | null = null
    let carePlanTasks = null
    let reminders = null
    let safetyStatus = null
    let nextAppointmentLabel: string | null = null

    if (hasScope(scopes, 'view_symptoms') || hasScope(scopes, 'view_trends')) {
      const checkIns = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
        .order('desc')
        .take(90)

      const todayCheckIn = checkIns.find(checkIn => checkIn.date === validToday) ?? null

      if (hasScope(scopes, 'view_symptoms')) {
        if (todayCheckIn) {
          const latestAmendment = await getLatestAmendmentForCheckIn(ctx, todayCheckIn._id)
          const effectiveSymptoms = latestAmendment?.symptoms ?? todayCheckIn.symptoms
          hasCheckInToday = true
          latestSymptomTotal = todayCheckIn.symptomTotal
          latestCheckInDate = todayCheckIn.date
          latestCheckInUpdatedAt = todayCheckIn.createdAt
          latestSymptomProvenance = buildSymptomTotalProvenanceFromSymptoms({
            symptoms: effectiveSymptoms,
            checkInDate: todayCheckIn.date,
            checkInId: todayCheckIn._id,
            recomputedFromAmendment: latestAmendment !== null,
            amendmentNote: latestAmendment?.reason,
            hidePrivateNotes: true,
          })
        } else {
          hasCheckInToday = false
        }
      }

      if (hasScope(scopes, 'view_trends')) {
        chartPoints = buildChartPoints(checkIns, validToday)
        const trendPoints = checkIns
          .map(checkIn => ({ date: checkIn.date, symptomTotal: checkIn.symptomTotal }))
          .sort((a, b) => a.date.localeCompare(b.date))
        const trendSummary = computeDescriptiveTrend(trendPoints, TREND_REQUIREMENTS.defaultWindowDays)
        trendSummaryText = trendSummary.summaryText
      }
    }

    if (hasScope(scopes, 'view_plan')) {
      const episode = await getActiveEpisodeForPatient(ctx, patient._id)
      const planTasks = await ctx.db
        .query('carePlans')
        .withIndex('by_patientId', q => q.eq('patientId', patient._id))
        .take(50)

      const dayNumber = episode
        ? Math.max(
            1,
            Math.floor(
              (new Date(validToday).getTime() - new Date(episode.incidentDate).getTime()) /
                86400000
            ) + 1
          )
        : null

      const filteredTasks =
        dayNumber === null
          ? planTasks
          : planTasks.filter(task => task.dayNumber === undefined || task.dayNumber === dayNumber)

      const planReminders = await ctx.db
        .query('planReminders')
        .withIndex('by_patientId', q => q.eq('patientId', patient._id))
        .take(20)

      carePlanTasks = filteredTasks.map(task => redactCarePlanForCaregiver(task, scopes))
      reminders = planReminders.filter(reminder => reminder.status === 'active')

      const encounters = await ctx.db
        .query('clinicalEncounters')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
        .order('desc')
        .take(10)

      const nextEncounter = findNextEncounter(encounters, validToday)
      if (nextEncounter) {
        const encounterDate = new Date(nextEncounter.datetime)
        nextAppointmentLabel = encounterDate.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      }
    }

    if (hasScope(scopes, 'receive_alerts')) {
      const latestSafety = await ctx.db
        .query('safetyEvaluations')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
        .order('desc')
        .first()

      const safetyEscalation = resolveSafetyEscalation(latestSafety ?? null)
      if (safetyEscalation) {
        safetyStatus = {
          headline: safetyEscalation.headline,
          guidance: safetyEscalation.guidance,
          requiresAcknowledgement: safetyEscalation.requiresAcknowledgement,
        }
      }
    }

    return {
      dataSource: 'live' as const,
      patientId: patient._id,
      displayId: patient.displayId,
      patientName: displayName,
      relationship: grant.relationship,
      scopes,
      expiresAt: grant.expiresAt,
      restrictedSections,
      hasCheckInToday,
      latestSymptomTotal,
      latestCheckInDate,
      latestCheckInUpdatedAt,
      latestSymptomProvenance,
      chartPoints,
      trendSummaryText,
      carePlanTasks,
      reminders,
      safetyStatus,
      nextAppointmentLabel,
      canLogProxy: hasScope(scopes, 'log_proxy'),
      canSendMessages: hasScope(scopes, 'send_messages'),
      canViewMessages: hasScope(scopes, 'view_messages'),
    }
  },
})
