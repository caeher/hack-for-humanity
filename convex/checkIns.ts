import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  activityImpactValidator,
  checkInAmendResultValidator,
  checkInDocValidator,
  checkInHistoryEntryValidator,
  checkInSubmitResultValidator,
  symptomsObjectValidator,
} from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import {
  sanitizeInput,
  validateConcussionSymptoms,
  validateDateString,
} from './lib/businessLogic'
import {
  buildDescendingDatePage,
  deriveCheckInCompleteness,
  isWithinCorrectionWindow,
  resolveEpisodeEndDate,
} from './lib/checkInHistoryLogic'
import { evaluateCheckIn, LongitudinalRecord } from './lib/safetyEngine'
import { attemptCareTeamNotification } from './lib/safetyFollowUp'
import { SYMPTOM_METHODOLOGY_VERSION } from './lib/symptomMethodology'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

async function getActiveEpisodeForPatient(ctx: QueryCtx | MutationCtx, patientId: Id<'patients'>) {
  return await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId_and_status', q => q.eq('patientId', patientId).eq('status', 'active'))
    .first()
}

async function getSafetyStatusForCheckIn(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<'patients'>,
  checkInId: Id<'checkIns'>
): Promise<Doc<'safetyEvaluations'>['status']> {
  const recentEvaluations = await ctx.db
    .query('safetyEvaluations')
    .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patientId))
    .order('desc')
    .take(30)

  const evaluation = recentEvaluations.find(item => item.targetResourceId === checkInId)
  return evaluation?.status ?? 'safe'
}

async function getLatestAmendmentForCheckIn(
  ctx: QueryCtx | MutationCtx,
  checkInId: Id<'checkIns'>
) {
  const amendments = await ctx.db
    .query('checkInAmendments')
    .withIndex('by_checkInId', q => q.eq('checkInId', checkInId))
    .order('desc')
    .take(5)

  return amendments[0] ?? null
}

async function countAmendmentsForCheckIn(ctx: QueryCtx | MutationCtx, checkInId: Id<'checkIns'>) {
  const amendments = await ctx.db
    .query('checkInAmendments')
    .withIndex('by_checkInId', q => q.eq('checkInId', checkInId))
    .collect()

  return amendments.length
}

async function canUserAmendCheckIns(
  ctx: QueryCtx | MutationCtx,
  user: Doc<'users'>,
  patient: Doc<'patients'>,
  asOfMs: number
): Promise<boolean> {
  if (patient.userId === user._id) {
    return true
  }

  if (user.role === 'clinician' || user.role === 'admin') {
    return true
  }

  if (user.role === 'caregiver') {
    const grant = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId_and_granteeUserId', q =>
        q.eq('patientId', patient._id).eq('granteeUserId', user._id)
      )
      .first()

    if (!grant || grant.status !== 'active') {
      return false
    }

    if (grant.expiresAt !== undefined && grant.expiresAt < asOfMs) {
      return false
    }

    return grant.scopes.includes('log_proxy')
  }

  return false
}

/**
 * Paginated daily check-in history for a recovery episode, including explicit missed-day gaps.
 * Dates are ordered newest-first. Missing days are returned without fabricated symptom values.
 */
export const listHistoryByEpisode = query({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    today: v.string(),
    paginationOpts: paginationOptsValidator,
    asOfMs: v.optional(v.number()),
  },
  returns: paginationResultValidator(checkInHistoryEntryValidator),
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const validToday = validateDateString(args.today, 'Today')
    const episode =
      args.episodeId !== undefined
        ? await ctx.db.get(args.episodeId)
        : await getActiveEpisodeForPatient(ctx, patient._id)

    if (!episode) {
      return { page: [], isDone: true, continueCursor: '' }
    }

    if (episode.patientId !== patient._id) {
      throw new Error('Forbidden: Recovery episode does not belong to this patient.')
    }

    const endDate = resolveEpisodeEndDate(episode, validToday)
    const startDate = episode.startDate
    const asOfMs = args.asOfMs ?? episode.createdAt

    const { dates, continueCursor, isDone } = buildDescendingDatePage({
      startDate,
      endDate,
      cursor: args.paginationOpts.cursor,
      numItems: args.paginationOpts.numItems,
    })

    const canAmend = await canUserAmendCheckIns(ctx, user, patient, asOfMs)
    const showNotes = user.role !== 'caregiver'

    const page = []
    for (const date of dates) {
      const checkIn = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', patient._id).eq('date', date)
        )
        .first()

      if (!checkIn || checkIn.episodeId !== episode._id) {
        page.push({ kind: 'missed' as const, date })
        continue
      }

      const submitter = await ctx.db.get(checkIn.submittedByUserId)
      const latestAmendment = await getLatestAmendmentForCheckIn(ctx, checkIn._id)
      const amendmentCount = await countAmendmentsForCheckIn(ctx, checkIn._id)
      const safetyStatus = await getSafetyStatusForCheckIn(ctx, patient._id, checkIn._id)
      const effectiveSymptomTotal = latestAmendment?.symptomTotal ?? checkIn.symptomTotal
      const withinWindow = isWithinCorrectionWindow(checkIn.createdAt, asOfMs)

      page.push({
        kind: 'recorded' as const,
        date,
        checkInId: checkIn._id,
        submittedAt: checkIn.createdAt,
        submittedByUserId: checkIn.submittedByUserId,
        reporterRole: submitter?.role ?? 'patient',
        reporterName: submitter?.name ?? 'Unknown reporter',
        completeness: deriveCheckInCompleteness(checkIn),
        safetyStatus,
        symptomTotal: effectiveSymptomTotal,
        methodologyVersion: latestAmendment?.methodologyVersion ?? checkIn.methodologyVersion,
        dangerSignsPresent: latestAmendment?.dangerSignsPresent ?? checkIn.dangerSignsPresent,
        activityImpact: latestAmendment?.activityImpact ?? checkIn.activityImpact,
        hasAmendment: amendmentCount > 0,
        amendmentCount,
        canAmend: canAmend && withinWindow,
        originalSymptomTotal: latestAmendment ? checkIn.symptomTotal : undefined,
        amendmentReason: latestAmendment?.reason,
        showNotes,
        note: showNotes ? (latestAmendment?.note ?? checkIn.note) : undefined,
      })
    }

    return {
      page,
      continueCursor: continueCursor ?? '',
      isDone,
    }
  },
})

/**
 * Loads a check-in with effective values for the correction workflow.
 */
export const getForAmendment = query({
  args: {
    patientId: v.id('patients'),
    checkInId: v.id('checkIns'),
    asOfMs: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      checkInId: v.id('checkIns'),
      date: v.string(),
      submittedAt: v.number(),
      canAmend: v.boolean(),
      symptoms: symptomsObjectValidator,
      activityImpact: activityImpactValidator,
      dangerSigns: v.array(v.string()),
      note: v.optional(v.string()),
      originalSymptomTotal: v.number(),
      hasAmendment: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'view_symptoms')
    const asOfMs = args.asOfMs ?? patient.createdAt

    const checkIn = await ctx.db.get(args.checkInId)
    if (!checkIn || checkIn.patientId !== patient._id) {
      return null
    }

    const latestAmendment = await getLatestAmendmentForCheckIn(ctx, checkIn._id)
    const amendAllowed = await canUserAmendCheckIns(ctx, user, patient, asOfMs)
    const withinWindow = isWithinCorrectionWindow(checkIn.createdAt, asOfMs)

    return {
      checkInId: checkIn._id,
      date: checkIn.date,
      submittedAt: checkIn.createdAt,
      canAmend: amendAllowed && withinWindow,
      symptoms: latestAmendment?.symptoms ?? checkIn.symptoms,
      activityImpact: latestAmendment?.activityImpact ?? checkIn.activityImpact,
      dangerSigns: latestAmendment?.dangerSigns ?? checkIn.dangerSigns,
      note: latestAmendment?.note ?? checkIn.note,
      originalSymptomTotal: checkIn.symptomTotal,
      hasAmendment: latestAmendment !== null,
    }
  },
})

/**
 * Append-only correction for a recent check-in. Original clinical values remain stored on the check-in record.
 */
export const amendCheckIn = mutation({
  args: {
    patientId: v.id('patients'),
    checkInId: v.id('checkIns'),
    symptoms: symptomsObjectValidator,
    activityImpact: activityImpactValidator,
    dangerSigns: v.optional(v.array(v.string())),
    note: v.optional(v.string()),
    correctionReason: v.string(),
  },
  returns: checkInAmendResultValidator,
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')
    const now = Date.now()

    const checkIn = await ctx.db.get(args.checkInId)
    if (!checkIn || checkIn.patientId !== patient._id) {
      throw new Error('Check-in not found for this patient.')
    }

    if (!isWithinCorrectionWindow(checkIn.createdAt, now)) {
      throw new Error('Correction window has closed for this check-in (72 hours after submission).')
    }

    const correctionReason = args.correctionReason.trim()
    if (correctionReason.length < 10) {
      throw new Error('Please provide a brief reason for the correction (at least 10 characters).')
    }

    const symptomTotal = validateConcussionSymptoms(args.symptoms)
    const sanitizedNote = args.note ? sanitizeInput(args.note) : undefined
    if (sanitizedNote && sanitizedNote.length > 2000) {
      throw new Error('Check-in note cannot exceed 2000 characters.')
    }

    const dangerSignsList = args.dangerSigns ?? checkIn.dangerSigns
    const dangerSignsPresent = dangerSignsList.length > 0

    const recentCheckIns = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(14)

    const history: LongitudinalRecord[] = recentCheckIns
      .filter(item => item._id !== checkIn._id)
      .map(c => ({
        date: c.date,
        symptomTotal: c.symptomTotal,
        symptoms: c.symptoms,
      }))

    const safetyResult = evaluateCheckIn(
      args.symptoms,
      dangerSignsList,
      sanitizedNote ?? checkIn.note,
      history
    )

    const safetyEvaluationId = await ctx.db.insert('safetyEvaluations', {
      patientId: patient._id,
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
      targetResourceId: checkIn._id,
      createdAt: now,
    })

    const amendmentId = await ctx.db.insert('checkInAmendments', {
      checkInId: checkIn._id,
      patientId: patient._id,
      episodeId: checkIn.episodeId,
      amendedByUserId: user._id,
      reason: correctionReason,
      symptoms: args.symptoms,
      symptomTotal,
      methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
      activityImpact: args.activityImpact,
      dangerSignsPresent,
      dangerSigns: dangerSignsList,
      note: sanitizedNote,
      originalSymptoms: checkIn.symptoms,
      originalSymptomTotal: checkIn.symptomTotal,
      originalActivityImpact: checkIn.activityImpact,
      originalDangerSignsPresent: checkIn.dangerSignsPresent,
      originalDangerSigns: checkIn.dangerSigns,
      originalNote: checkIn.note,
      safetyEvaluationId,
      createdAt: now,
    })

    const notification = await attemptCareTeamNotification(ctx, {
      patient,
      episodeId: checkIn.episodeId,
      safetyResult,
      dangerSigns: dangerSignsList,
      actorUserId: user._id,
      actorRole: user.role,
      symptomTotal,
      safetyEvaluationId,
      now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Amended daily check-in for ${checkIn.date}: ${correctionReason} (original total ${checkIn.symptomTotal}/48 → corrected ${symptomTotal}/48)`,
      targetResource: 'checkInAmendments',
      resourceId: amendmentId,
      action: 'update',
      createdAt: now,
    })

    return {
      amendmentId,
      safetyEvaluationId,
      safetyResult,
    }
  },
})

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
      methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
      activityImpact: args.activityImpact,
      dangerSignsPresent,
      dangerSigns: dangerSignsList,
      note: sanitizedNote,
      createdAt: now,
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
      followUpState: 'pending_acknowledgement',
      createdAt: now,
    })

    const notification = await attemptCareTeamNotification(ctx, {
      patient,
      episodeId,
      safetyResult,
      dangerSigns: dangerSignsList,
      actorUserId: user._id,
      actorRole: user.role,
      symptomTotal,
      safetyEvaluationId,
      now,
    })

    await ctx.db.patch(safetyEvaluationId, {
      followUpState: notification.followUpState,
      notificationAttemptedAt: now,
      notificationOutcome: notification.outcome,
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
