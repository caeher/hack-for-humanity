import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  baselineAssessmentDraftPayloadValidator,
  baselineStatusValidator,
  baselineSubmitResultValidator,
  diagnosisStatusValidator,
  recoveryBaselineDocValidator,
  skippedFieldValidator,
  symptomsObjectValidator,
} from './lib/validators'
import { requirePatientAccess, requireUser } from './lib/auth'
import {
  computeDaysSinceIncident,
  computeSymptomTotalFromInventory,
  validateBaselineCareReceived,
  validateBaselineIncidentContext,
  validateBaselineIncidentDate,
  validateCompletionDuration,
  validateOptionalLikert,
  validateOptionalSleepHours,
  validateSkippedFields,
} from './lib/baselineLogic'
import { evaluateBaseline } from './lib/safetyEngine'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

const POST_BASELINE_ROUTE = '/patient/check-in'

async function getPatientForUser(ctx: QueryCtx | MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('patients')
    .withIndex('by_userId', q => q.eq('userId', userId))
    .first()
}

async function getActiveEpisodeForPatient(ctx: QueryCtx | MutationCtx, patientId: Id<'patients'>) {
  return await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId_and_status', q => q.eq('patientId', patientId).eq('status', 'active'))
    .first()
}

async function getCurrentBaseline(ctx: QueryCtx | MutationCtx, episodeId: Id<'recoveryEpisodes'>) {
  return await ctx.db
    .query('recoveryBaselines')
    .withIndex('by_episodeId_and_isCurrent', q => q.eq('episodeId', episodeId).eq('isCurrent', true))
    .first()
}

/**
 * Returns initial recovery assessment completion status for the authenticated patient.
 */
export const getStatus = query({
  args: {},
  returns: baselineStatusValidator,
  handler: async ctx => {
    const { user } = await requireUser(ctx)
    const patient = await getPatientForUser(ctx, user._id)

    if (!patient?.onboardingCompletedAt) {
      return {
        completed: false,
        hasDraft: false,
      }
    }

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)
    const completed = Boolean(patient.baselineCompletedAt)
    const currentBaseline = episode ? await getCurrentBaseline(ctx, episode._id) : null

    const draft = await ctx.db
      .query('baselineAssessmentDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    return {
      completed,
      hasDraft: Boolean(draft),
      episodeId: episode?._id,
      currentBaselineVersion: currentBaseline?.version,
      nextRoute: completed ? POST_BASELINE_ROUTE : undefined,
    }
  },
})

/**
 * Retrieves the authenticated user's saved baseline assessment draft, if any.
 */
export const getDraft = query({
  args: {},
  returns: v.union(baselineAssessmentDraftPayloadValidator, v.null()),
  handler: async ctx => {
    const { user } = await requireUser(ctx)

    const draft = await ctx.db
      .query('baselineAssessmentDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    if (!draft) {
      return null
    }

    return {
      step: draft.step,
      startedAt: draft.startedAt,
      incidentDate: draft.incidentDate,
      incidentContext: draft.incidentContext,
      careReceived: draft.careReceived,
      diagnosisStatus: draft.diagnosisStatus,
      symptoms: draft.symptoms,
      sleepHours: draft.sleepHours,
      schoolWorkDemand: draft.schoolWorkDemand,
      physicalActivityLevel: draft.physicalActivityLevel,
      cognitiveActivityLevel: draft.cognitiveActivityLevel,
      screenTolerance: draft.screenTolerance,
      skippedFields: draft.skippedFields,
      dangerSigns: draft.dangerSigns,
    }
  },
})

/**
 * Returns the current versioned baseline for the patient's active recovery episode.
 */
export const getCurrentForPatient = query({
  args: { patientId: v.id('patients') },
  returns: v.union(recoveryBaselineDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const episode = await getActiveEpisodeForPatient(ctx, args.patientId)
    if (!episode) {
      return null
    }

    return await getCurrentBaseline(ctx, episode._id)
  },
})

/**
 * Persists partial baseline assessment progress so users can resume after interruption.
 */
export const saveDraft = mutation({
  args: baselineAssessmentDraftPayloadValidator,
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const patient = await getPatientForUser(ctx, user._id)

    if (!patient?.onboardingCompletedAt) {
      throw new Error('Complete recovery onboarding before starting the initial assessment.')
    }
    if (patient.baselineCompletedAt) {
      throw new Error('Initial recovery assessment is already complete.')
    }

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)
    if (!episode) {
      throw new Error('No active recovery episode found.')
    }

    const now = Date.now()
    const startedAt = args.startedAt ?? now

    const existingDraft = await ctx.db
      .query('baselineAssessmentDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    const draftData = {
      userId: user._id,
      patientId: patient._id,
      episodeId: episode._id,
      step: args.step,
      startedAt,
      incidentDate: args.incidentDate,
      incidentContext: args.incidentContext,
      careReceived: args.careReceived,
      diagnosisStatus: args.diagnosisStatus,
      symptoms: args.symptoms,
      sleepHours: args.sleepHours,
      schoolWorkDemand: args.schoolWorkDemand,
      physicalActivityLevel: args.physicalActivityLevel,
      cognitiveActivityLevel: args.cognitiveActivityLevel,
      screenTolerance: args.screenTolerance,
      skippedFields: args.skippedFields,
      dangerSigns: args.dangerSigns,
      updatedAt: now,
    }

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, draftData)
    } else {
      await ctx.db.insert('baselineAssessmentDrafts', draftData)
    }

    return null
  },
})

interface SubmitBaselineArgs {
  incidentDate: string
  incidentContext: string
  careReceived?: string
  diagnosisStatus: 'yes' | 'no' | 'unsure'
  symptoms: Doc<'recoveryBaselines'>['symptoms']
  sleepHours?: number
  schoolWorkDemand?: number
  physicalActivityLevel?: number
  cognitiveActivityLevel?: number
  screenTolerance?: number
  skippedFields: Array<{ fieldId: string; reason: string }>
  dangerSigns: string[]
  completionDurationMs: number
  startedAt: number
}

async function persistBaselineVersion(
  ctx: MutationCtx,
  patient: Doc<'patients'>,
  episode: Doc<'recoveryEpisodes'>,
  user: Doc<'users'>,
  args: SubmitBaselineArgs,
  symptomTotal: number,
  safetyEvaluationId: Id<'safetyEvaluations'>
) {
  const now = Date.now()
  const currentBaseline = await getCurrentBaseline(ctx, episode._id)
  const nextVersion = currentBaseline ? currentBaseline.version + 1 : 1

  if (currentBaseline) {
    await ctx.db.patch(currentBaseline._id, {
      isCurrent: false,
      supersededAt: now,
    })
  }

  const baselineId = await ctx.db.insert('recoveryBaselines', {
    patientId: patient._id,
    episodeId: episode._id,
    orgId: patient.orgId,
    version: nextVersion,
    isCurrent: true,
    incidentDate: args.incidentDate,
    incidentContext: args.incidentContext,
    careReceived: args.careReceived,
    diagnosisStatus: args.diagnosisStatus,
    symptoms: args.symptoms,
    symptomTotal,
    sleepHours: args.sleepHours,
    schoolWorkDemand: args.schoolWorkDemand,
    physicalActivityLevel: args.physicalActivityLevel,
    cognitiveActivityLevel: args.cognitiveActivityLevel,
    screenTolerance: args.screenTolerance,
    skippedFields: args.skippedFields,
    dangerSignsPresent: args.dangerSigns.length > 0,
    dangerSigns: args.dangerSigns,
    completionDurationMs: args.completionDurationMs,
    submittedByUserId: user._id,
    createdAt: now,
  })

  await ctx.db.patch(episode._id, {
    incidentDate: args.incidentDate,
    injuryContext: args.incidentContext,
    baselineSymptomTotal: symptomTotal,
  })

  await ctx.db.patch(patient._id, {
    diagnosisStatus: args.diagnosisStatus,
    baselineCompletedAt: now,
  })

  const draft = await ctx.db
    .query('baselineAssessmentDrafts')
    .withIndex('by_userId', q => q.eq('userId', user._id))
    .first()
  if (draft) {
    await ctx.db.delete(draft._id)
  }

  await ctx.db.insert('auditLogs', {
    actorUserId: user._id,
    actorRole: user.role,
    orgId: patient.orgId,
    patientId: patient._id,
    event: `Submitted initial recovery baseline v${nextVersion} (symptom total: ${symptomTotal}/48, duration: ${args.completionDurationMs}ms)`,
    targetResource: 'recoveryBaselines',
    resourceId: baselineId,
    action: currentBaseline ? 'update' : 'create',
    createdAt: now,
  })

  await ctx.db.patch(safetyEvaluationId, {
    targetResourceId: baselineId,
  })

  return baselineId
}

function validateSubmitPayload(args: SubmitBaselineArgs) {
  const incidentDate = validateBaselineIncidentDate(args.incidentDate)
  const incidentContext = validateBaselineIncidentContext(args.incidentContext)
  const careReceived = validateBaselineCareReceived(args.careReceived)
  const symptomTotal = computeSymptomTotalFromInventory(args.symptoms)
  const skippedFields = validateSkippedFields(args.skippedFields, {
    careReceived,
    sleepHours: args.sleepHours,
    schoolWorkDemand: args.schoolWorkDemand,
    physicalActivityLevel: args.physicalActivityLevel,
    cognitiveActivityLevel: args.cognitiveActivityLevel,
    screenTolerance: args.screenTolerance,
  })

  const sleepHours = validateOptionalSleepHours(args.sleepHours)
  const schoolWorkDemand = validateOptionalLikert(args.schoolWorkDemand, 'School or work demand')
  const physicalActivityLevel = validateOptionalLikert(args.physicalActivityLevel, 'Physical activity level')
  const cognitiveActivityLevel = validateOptionalLikert(args.cognitiveActivityLevel, 'Cognitive activity level')
  const screenTolerance = validateOptionalLikert(args.screenTolerance, 'Screen tolerance')
  const completionDurationMs = validateCompletionDuration(args.completionDurationMs)

  return {
    incidentDate,
    incidentContext,
    careReceived,
    symptomTotal,
    skippedFields,
    sleepHours,
    schoolWorkDemand,
    physicalActivityLevel,
    cognitiveActivityLevel,
    screenTolerance,
    completionDurationMs,
  }
}

/**
 * Submits the initial recovery baseline after running the deterministic Safety Engine.
 * Emergency red-flag evaluations block routine completion until danger signs are cleared.
 */
export const submitBaseline = mutation({
  args: {
    incidentDate: v.string(),
    incidentContext: v.string(),
    careReceived: v.optional(v.string()),
    diagnosisStatus: diagnosisStatusValidator,
    symptoms: symptomsObjectValidator,
    sleepHours: v.optional(v.number()),
    schoolWorkDemand: v.optional(v.number()),
    physicalActivityLevel: v.optional(v.number()),
    cognitiveActivityLevel: v.optional(v.number()),
    screenTolerance: v.optional(v.number()),
    skippedFields: v.array(skippedFieldValidator),
    dangerSigns: v.array(v.string()),
    completionDurationMs: v.number(),
    startedAt: v.number(),
  },
  returns: baselineSubmitResultValidator,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const selfPatient = await getPatientForUser(ctx, user._id)
    if (!selfPatient) {
      throw new Error('Patient profile not found.')
    }
    const { patient } = await requirePatientAccess(ctx, selfPatient._id, 'log_proxy')

    if (!patient.onboardingCompletedAt) {
      throw new Error('Complete recovery onboarding before submitting the initial assessment.')
    }

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)
    if (!episode) {
      throw new Error('No active recovery episode found.')
    }

    const validated = validateSubmitPayload(args)
    const dangerSigns = args.dangerSigns ?? []
    const daysSinceInjury = computeDaysSinceIncident(validated.incidentDate, Date.now())

    const safetyResult = evaluateBaseline(args.symptoms, dangerSigns, daysSinceInjury, validated.incidentContext)
    const now = Date.now()
    const blocked = safetyResult.blockedActions.includes('allow_routine_completion')

    const safetyEvaluationId = await ctx.db.insert('safetyEvaluations', {
      patientId: patient._id,
      orgId: patient.orgId,
      evaluatedByUserId: user._id,
      contextType: 'baseline',
      status: safetyResult.status,
      highestSeverity: safetyResult.highestSeverity,
      ruleEngineVersion: safetyResult.ruleEngineVersion,
      matchedRuleCodes: safetyResult.matchedRules.map(r => r.outputCode),
      matchedEvidenceSummary: safetyResult.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: safetyResult.primaryEscalation,
      blockedActions: safetyResult.blockedActions,
      failSafeApplied: safetyResult.failSafeApplied,
      createdAt: now,
    })

    if (safetyResult.highestSeverity === 'emergency') {
      await ctx.db.insert('alerts', {
        patientId: patient._id,
        episodeId: episode._id,
        orgId: patient.orgId,
        detail: `[Safety Engine ${safetyResult.ruleEngineVersion}] Acute baseline red flag reported during initial assessment`,
        severity: 'High',
        status: 'active',
        dangerSigns,
        createdAt: now,
      })
    }

    if (blocked) {
      return {
        blocked: true,
        safetyResult,
        nextRoute: '/patient/assessment',
      }
    }

    const baselineId = await persistBaselineVersion(
      ctx,
      patient,
      episode,
      user,
      {
        ...args,
        incidentDate: validated.incidentDate,
        incidentContext: validated.incidentContext,
        careReceived: validated.careReceived,
        skippedFields: validated.skippedFields,
        sleepHours: validated.sleepHours,
        schoolWorkDemand: validated.schoolWorkDemand,
        physicalActivityLevel: validated.physicalActivityLevel,
        cognitiveActivityLevel: validated.cognitiveActivityLevel,
        screenTolerance: validated.screenTolerance,
        completionDurationMs: validated.completionDurationMs,
        dangerSigns,
      },
      validated.symptomTotal,
      safetyEvaluationId
    )

    return {
      baselineId,
      blocked: false,
      safetyResult,
      nextRoute: POST_BASELINE_ROUTE,
    }
  },
})

/**
 * Creates a corrected baseline version with an audit trail entry.
 */
export const correctBaseline = mutation({
  args: {
    patientId: v.id('patients'),
    incidentDate: v.string(),
    incidentContext: v.string(),
    careReceived: v.optional(v.string()),
    diagnosisStatus: diagnosisStatusValidator,
    symptoms: symptomsObjectValidator,
    sleepHours: v.optional(v.number()),
    schoolWorkDemand: v.optional(v.number()),
    physicalActivityLevel: v.optional(v.number()),
    cognitiveActivityLevel: v.optional(v.number()),
    screenTolerance: v.optional(v.number()),
    skippedFields: v.array(skippedFieldValidator),
    dangerSigns: v.array(v.string()),
    correctionReason: v.string(),
    completionDurationMs: v.number(),
    startedAt: v.number(),
  },
  returns: baselineSubmitResultValidator,
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    if (!patient.baselineCompletedAt) {
      throw new Error('No baseline exists to correct.')
    }

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)
    if (!episode) {
      throw new Error('No active recovery episode found.')
    }

    const correctionReason = args.correctionReason.trim()
    if (correctionReason.length < 10) {
      throw new Error('Please provide a brief reason for the correction (at least 10 characters).')
    }

    const validated = validateSubmitPayload(args)
    const dangerSigns = args.dangerSigns ?? []
    const daysSinceInjury = computeDaysSinceIncident(validated.incidentDate, Date.now())

    const safetyResult = evaluateBaseline(args.symptoms, dangerSigns, daysSinceInjury, validated.incidentContext)
    const now = Date.now()
    const blocked = safetyResult.blockedActions.includes('allow_routine_completion')

    const safetyEvaluationId = await ctx.db.insert('safetyEvaluations', {
      patientId: patient._id,
      orgId: patient.orgId,
      evaluatedByUserId: user._id,
      contextType: 'baseline',
      status: safetyResult.status,
      highestSeverity: safetyResult.highestSeverity,
      ruleEngineVersion: safetyResult.ruleEngineVersion,
      matchedRuleCodes: safetyResult.matchedRules.map(r => r.outputCode),
      matchedEvidenceSummary: safetyResult.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: safetyResult.primaryEscalation,
      blockedActions: safetyResult.blockedActions,
      failSafeApplied: safetyResult.failSafeApplied,
      createdAt: now,
    })

    if (blocked) {
      return {
        blocked: true,
        safetyResult,
        nextRoute: '/patient/assessment',
      }
    }

    const baselineId = await persistBaselineVersion(
      ctx,
      patient,
      episode,
      user,
      {
        incidentDate: validated.incidentDate,
        incidentContext: validated.incidentContext,
        careReceived: validated.careReceived,
        diagnosisStatus: args.diagnosisStatus,
        symptoms: args.symptoms,
        sleepHours: validated.sleepHours,
        schoolWorkDemand: validated.schoolWorkDemand,
        physicalActivityLevel: validated.physicalActivityLevel,
        cognitiveActivityLevel: validated.cognitiveActivityLevel,
        screenTolerance: validated.screenTolerance,
        skippedFields: validated.skippedFields,
        dangerSigns,
        completionDurationMs: validated.completionDurationMs,
        startedAt: args.startedAt,
      },
      validated.symptomTotal,
      safetyEvaluationId
    )

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Corrected initial recovery baseline: ${correctionReason}`,
      targetResource: 'recoveryBaselines',
      resourceId: baselineId,
      action: 'update',
      createdAt: now,
    })

    return {
      baselineId,
      blocked: false,
      safetyResult,
      nextRoute: POST_BASELINE_ROUTE,
    }
  },
})
