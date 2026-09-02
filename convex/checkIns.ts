import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  activityImpactValidator,
  checkInDocValidator,
  checkInSubmitResultValidator,
  symptomsObjectValidator,
} from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import {
  sanitizeInput,
  validateConcussionSymptoms,
  validateDateString,
} from './lib/businessLogic'
import { evaluateCheckIn, LongitudinalRecord } from './lib/safetyEngine'
import { attemptCareTeamNotification } from './lib/safetyFollowUp'

/**
 * List historical check-ins for a patient in reverse-chronological order.
 * Enforces ownership / patient access authorization and caregiver consent scopes.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(checkInDocValidator), v.array(checkInDocValidator)),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const q = ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
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
  args: { patientId: v.id('patients') },
  returns: v.union(checkInDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .first()
  },
})

/**
 * Submit a daily concussion check-in.
 * Validates 8-symptom ratings (0-6), computes total (0-48), runs deterministic Safety Engine,
 * records submitter identity, creates safety evaluation audit, and triggers clinical alerts if needed.
 */
export const submitCheckIn = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    date: v.string(),
    symptoms: symptomsObjectValidator,
    activityImpact: activityImpactValidator,
    dangerSigns: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
    screenMinutes: v.optional(v.number()),
    cognitiveMinutes: v.optional(v.number()),
  },
  returns: checkInSubmitResultValidator,
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const validDate = validateDateString(args.date, 'Check-in date')

    const existingForDate = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', args.patientId).eq('date', validDate)
      )
      .first()

    if (existingForDate) {
      const recentEvaluations = await ctx.db
        .query('safetyEvaluations')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
        .order('desc')
        .take(10)

      const existingEvaluation = recentEvaluations.find(
        e => e.targetResourceId === existingForDate._id
      )

      const safetyResult = evaluateCheckIn(
        existingForDate.symptoms,
        existingForDate.dangerSigns ?? [],
        existingForDate.note,
        [],
        {
          screenMinutes: args.screenMinutes,
          cognitiveMinutes: args.cognitiveMinutes,
        }
      )

      if (!existingEvaluation) {
        throw new Error('Check-in exists but safety evaluation record is missing.')
      }

      return {
        checkInId: existingForDate._id,
        blocked: safetyResult.blockedActions.includes('allow_routine_completion'),
        safetyEvaluationId: existingEvaluation._id,
        safetyResult,
      }
    }

    const symptomTotal = validateConcussionSymptoms(args.symptoms)

    const sanitizedNote = args.note ? sanitizeInput(args.note) : undefined
    if (sanitizedNote && sanitizedNote.length > 2000) {
      throw new Error('Check-in note cannot exceed 2000 characters.')
    }

    const dangerSignsList = args.dangerSigns ?? []
    const dangerSignsPresent = dangerSignsList.length > 0
    const now = Date.now()

    const recentCheckIns = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(14)

    const history: LongitudinalRecord[] = recentCheckIns.map(c => ({
      date: c.date,
      symptomTotal: c.symptomTotal,
      symptoms: c.symptoms,
    }))

    const safetyResult = evaluateCheckIn(
      args.symptoms,
      dangerSignsList,
      sanitizedNote,
      history,
      {
        screenMinutes: args.screenMinutes,
        cognitiveMinutes: args.cognitiveMinutes,
      }
    )

    const blocked = safetyResult.blockedActions.includes('allow_routine_completion')

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

    const checkInId = await ctx.db.insert('checkIns', {
      patientId: args.patientId,
      episodeId,
      submittedByUserId: user._id,
      date: validDate,
      symptoms: args.symptoms,
      symptomTotal,
      activityImpact: args.activityImpact,
      dangerSignsPresent,
      dangerSigns: dangerSignsList,
      note: sanitizedNote,
      createdAt: now,
    })

    const notification = await attemptCareTeamNotification(ctx, {
      patient,
      episodeId,
      safetyResult,
      dangerSigns: dangerSignsList,
      actorUserId: user._id,
      actorRole: user.role,
      now,
    })

    const safetyEvaluationId = await ctx.db.insert('safetyEvaluations', {
      patientId: args.patientId,
      orgId: patient.orgId,
      evaluatedByUserId: user._id,
      contextType: 'check_in',
      status: safetyResult.status,
      highestSeverity: safetyResult.highestSeverity,
      ruleEngineVersion: safetyResult.ruleEngineVersion,
      matchedRuleCodes: safetyResult.matchedRules.map(r => r.outputCode),
      matchedRuleIds: safetyResult.matchedRules.map(r => r.ruleId),
      matchedEvidenceSummary: safetyResult.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: safetyResult.primaryEscalation,
      blockedActions: safetyResult.blockedActions,
      failSafeApplied: safetyResult.failSafeApplied,
      targetResourceId: checkInId,
      followUpState: notification.followUpState,
      notificationAttemptedAt: now,
      notificationOutcome: notification.outcome,
      createdAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Submitted daily check-in (Symptom Total: ${symptomTotal}/48, Danger Signs: ${dangerSignsPresent ? 'YES' : 'NO'}, Safety Status: ${safetyResult.status.toUpperCase()}, Notification: ${notification.outcome})`,
      targetResource: 'checkIns',
      resourceId: checkInId,
      action: 'create',
      createdAt: now,
    })

    return {
      checkInId,
      blocked,
      safetyEvaluationId,
      safetyResult,
    }
  },
})
