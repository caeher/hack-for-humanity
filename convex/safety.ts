import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  activityImpactValidator,
  safetyEvaluationDocValidator,
  safetyEvaluationResultValidator,
  safetyRuleInfoValidator,
  symptomsObjectValidator,
} from './lib/validators'
import { requirePatientAccess, requireUser } from './lib/auth'
import { sanitizeInput, validateDateString } from './lib/businessLogic'
import {
  evaluateAiQuery,
  evaluateCheckIn,
  evaluateFreeText,
  evaluateOnboarding,
  LongitudinalRecord,
} from './lib/safetyEngine'
import { attemptCareTeamNotification } from './lib/safetyFollowUp'
import { RULE_REGISTRY_VERSION, SAFETY_RULES } from './lib/safetyRules'

/**
 * Returns the versioned clinical safety rule registry along with evidence authorities,
 * citations, approved reviewers, and standardized output codes.
 * Accessible to authenticated users for governance transparency and clinical audit.
 */
export const getRuleRegistry = query({
  args: {},
  returns: v.object({
    version: v.string(),
    rules: v.array(safetyRuleInfoValidator),
  }),
  handler: async ctx => {
    await requireUser(ctx)

    const rules = Object.values(SAFETY_RULES).map(r => ({
      ruleId: r.ruleId,
      version: r.version,
      name: r.name,
      category: r.category,
      severity: r.severity,
      requiredInputs: r.requiredInputs,
      outputCode: r.outputCode,
      evidenceSource: r.evidenceSource,
      escalationPath: r.escalationPath,
      userGuidance: r.userGuidance,
    }))

    return {
      version: RULE_REGISTRY_VERSION,
      rules,
    }
  },
})

/**
 * Get the latest safety evaluation record for a patient.
 * Requires patient ownership or active caregiver/clinician consent.
 */
export const getLatestForPatient = query({
  args: { patientId: v.id('patients') },
  returns: v.union(safetyEvaluationDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    return await ctx.db
      .query('safetyEvaluations')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .first()
  },
})

/**
 * List safety evaluations for a patient in reverse-chronological order.
 * Enforces ownership / patient access authorization and caregiver consent scopes.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(
    paginationResultValidator(safetyEvaluationDocValidator),
    v.array(safetyEvaluationDocValidator)
  ),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const q = ctx.db
      .query('safetyEvaluations')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }
    return await q.take(50)
  },
})

/**
 * Evaluates daily check-in inputs deterministically through the Safety Engine.
 * Fetches recent longitudinal history to evaluate trajectory spikes, plateaus, and single severe symptoms.
 * Persists an immutable safety evaluation audit record and triggers safety alerts if necessary.
 */
export const evaluateCheckInSafety = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    date: v.string(),
    symptoms: symptomsObjectValidator,
    dangerSigns: v.optional(v.array(v.string())),
    activityImpact: v.optional(activityImpactValidator),
    note: v.optional(v.string()),
    screenMinutes: v.optional(v.number()),
    cognitiveMinutes: v.optional(v.number()),
  },
  returns: safetyEvaluationResultValidator,
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    validateDateString(args.date, 'Check-in date')
    const sanitizedNote = args.note ? sanitizeInput(args.note) : undefined
    const dangerSigns = args.dangerSigns ?? []

    // Fetch recent longitudinal check-in history (up to last 14 entries) for trajectory evaluation
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

    const evaluation = evaluateCheckIn(
      args.symptoms,
      dangerSigns,
      sanitizedNote,
      history,
      {
        screenMinutes: args.screenMinutes,
        cognitiveMinutes: args.cognitiveMinutes,
      }
    )

    const now = Date.now()

    // Store evaluation document with minimized evidence summary
    await ctx.db.insert('safetyEvaluations', {
      patientId: args.patientId,
      orgId: patient.orgId,
      evaluatedByUserId: user._id,
      contextType: 'check_in',
      status: evaluation.status,
      highestSeverity: evaluation.highestSeverity,
      ruleEngineVersion: evaluation.ruleEngineVersion,
      matchedRuleCodes: evaluation.matchedRules.map(r => r.outputCode),
      matchedRuleIds: evaluation.matchedRules.map(r => r.ruleId),
      matchedEvidenceSummary: evaluation.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: evaluation.primaryEscalation,
      blockedActions: evaluation.blockedActions,
      failSafeApplied: evaluation.failSafeApplied,
      followUpState: 'pending_acknowledgement',
      createdAt: now,
    })

    if (evaluation.highestSeverity === 'emergency' || evaluation.highestSeverity === 'high') {
      await attemptCareTeamNotification(ctx, {
        patient,
        episodeId: args.episodeId,
        safetyResult: evaluation,
        dangerSigns,
        actorUserId: user._id,
        actorRole: user.role,
        now,
      })
    }

    return evaluation
  },
})

/**
 * Screen AI queries against prohibited intent guardrails (diagnosis, prescription, clearance, override).
 * Must be executed BEFORE any AI LLM invocation or RAG query retrieval.
 */
export const evaluateAiQuerySafety = mutation({
  args: {
    queryText: v.string(),
    patientId: v.optional(v.id('patients')),
  },
  returns: safetyEvaluationResultValidator,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const sanitizedQuery = sanitizeInput(args.queryText)

    let orgId = undefined
    const patientId = args.patientId
    if (patientId) {
      const patient = await ctx.db.get(patientId)
      if (patient) {
        orgId = patient.orgId
      }
    }

    const evaluation = evaluateAiQuery(sanitizedQuery)
    const now = Date.now()

    // Persist audit record
    await ctx.db.insert('safetyEvaluations', {
      patientId: patientId,
      orgId,
      evaluatedByUserId: user._id,
      contextType: 'ai_query',
      status: evaluation.status,
      highestSeverity: evaluation.highestSeverity,
      ruleEngineVersion: evaluation.ruleEngineVersion,
      matchedRuleCodes: evaluation.matchedRules.map(r => r.outputCode),
      matchedRuleIds: evaluation.matchedRules.map(r => r.ruleId),
      matchedEvidenceSummary: evaluation.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: evaluation.primaryEscalation,
      blockedActions: evaluation.blockedActions,
      failSafeApplied: evaluation.failSafeApplied,
      createdAt: now,
    })

    return evaluation
  },
})

/**
 * Screen unconfirmed free-text / clinical notes for emergency danger signs and red flag keywords.
 */
export const evaluateFreeTextSafety = mutation({
  args: {
    text: v.string(),
    patientId: v.optional(v.id('patients')),
  },
  returns: safetyEvaluationResultValidator,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const sanitizedText = sanitizeInput(args.text)

    let orgId = undefined
    if (args.patientId) {
      const patient = await ctx.db.get(args.patientId)
      if (patient) {
        orgId = patient.orgId
      }
    }

    const evaluation = evaluateFreeText(sanitizedText)
    const now = Date.now()

    await ctx.db.insert('safetyEvaluations', {
      patientId: args.patientId,
      orgId,
      evaluatedByUserId: user._id,
      contextType: 'free_text',
      status: evaluation.status,
      highestSeverity: evaluation.highestSeverity,
      ruleEngineVersion: evaluation.ruleEngineVersion,
      matchedRuleCodes: evaluation.matchedRules.map(r => r.outputCode),
      matchedRuleIds: evaluation.matchedRules.map(r => r.ruleId),
      matchedEvidenceSummary: evaluation.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: evaluation.primaryEscalation,
      blockedActions: evaluation.blockedActions,
      failSafeApplied: evaluation.failSafeApplied,
      createdAt: now,
    })

    return evaluation
  },
})

/**
 * Screen initial onboarding / intake questionnaire inputs against acute danger signs and baseline burden.
 */
export const evaluateOnboardingSafety = mutation({
  args: {
    patientId: v.id('patients'),
    baselineSymptoms: symptomsObjectValidator,
    dangerSigns: v.optional(v.array(v.string())),
    daysSinceInjury: v.optional(v.number()),
  },
  returns: safetyEvaluationResultValidator,
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const evaluation = evaluateOnboarding(
      args.baselineSymptoms,
      args.dangerSigns,
      args.daysSinceInjury
    )

    const now = Date.now()

    await ctx.db.insert('safetyEvaluations', {
      patientId: args.patientId,
      orgId: patient.orgId,
      evaluatedByUserId: user._id,
      contextType: 'onboarding',
      status: evaluation.status,
      highestSeverity: evaluation.highestSeverity,
      ruleEngineVersion: evaluation.ruleEngineVersion,
      matchedRuleCodes: evaluation.matchedRules.map(r => r.outputCode),
      matchedRuleIds: evaluation.matchedRules.map(r => r.ruleId),
      matchedEvidenceSummary: evaluation.matchedRules.map(r => r.matchedEvidenceSummary),
      primaryEscalation: evaluation.primaryEscalation,
      blockedActions: evaluation.blockedActions,
      failSafeApplied: evaluation.failSafeApplied,
      createdAt: now,
    })

    if (evaluation.highestSeverity === 'emergency') {
      await ctx.db.insert('alerts', {
        patientId: args.patientId,
        orgId: patient.orgId,
        detail: `[Safety Engine ${evaluation.ruleEngineVersion}] Acute onboarding red flag reported: ${evaluation.matchedRules[0]?.name}`,
        severity: 'High',
        status: 'active',
        dangerSigns: args.dangerSigns,
        createdAt: now,
      })
    }

    return evaluation
  },
})

/**
 * Record patient acknowledgement of a safety outcome.
 * Acknowledgement is audited and does NOT constitute clinical resolution.
 */
export const acknowledgeSafetyOutcome = mutation({
  args: {
    safetyEvaluationId: v.id('safetyEvaluations'),
    patientId: v.id('patients'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    const evaluation = await ctx.db.get(args.safetyEvaluationId)
    if (!evaluation) {
      throw new Error('Safety evaluation not found.')
    }

    if (evaluation.patientId !== args.patientId) {
      throw new Error('Safety evaluation does not belong to this patient.')
    }

    const now = Date.now()

    await ctx.db.patch(args.safetyEvaluationId, {
      followUpState: 'acknowledged',
      acknowledgedAt: now,
      acknowledgedByUserId: user._id,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: evaluation.orgId,
      patientId: args.patientId,
      event: `Acknowledged safety outcome (status: ${evaluation.status}, rules: ${evaluation.matchedRuleCodes.join(', ') || 'none'}) — not clinical resolution`,
      targetResource: 'safetyEvaluations',
      resourceId: args.safetyEvaluationId,
      action: 'safety_acknowledgement',
      createdAt: now,
    })

    return null
  },
})
