/**
 * Convex AI governance API — kill switch, model approvals, request preflight, audit.
 */

import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireUser, requireAdmin } from './lib/auth'

const DEFAULT_FEATURE_KILL_SWITCHES = {
  nlp: false,
  rag: false,
  insights: false,
  all: false,
}

const aiFeatureValidator = v.union(
  v.literal('nlp'),
  v.literal('rag'),
  v.literal('insights'),
  v.literal('all')
)

const killSwitchScopeValidator = v.union(
  v.literal('global'),
  v.literal('org'),
  v.literal('feature')
)

/**
 * Returns current AI governance state (kill switches, cost limits).
 * Accessible to authenticated users for transparency.
 */
export const getGovernanceState = query({
  args: {
    orgId: v.optional(v.id('organizations')),
  },
  returns: v.object({
    globalKillSwitch: v.boolean(),
    featureKillSwitches: v.object({
      nlp: v.boolean(),
      rag: v.boolean(),
      insights: v.boolean(),
      all: v.boolean(),
    }),
    dailyCostLimitCents: v.number(),
    currentDailyCostCents: v.number(),
    aiEnabled: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const globalConfig = await ctx.db
      .query('aiGovernanceConfig')
      .withIndex('by_scope', q => q.eq('scope', 'global'))
      .first()

    let orgConfig = null
    if (args.orgId) {
      orgConfig = await ctx.db
        .query('aiGovernanceConfig')
        .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
        .first()
    }

    const globalKillSwitch = globalConfig?.globalKillSwitch ?? false
    const featureKillSwitches = globalConfig?.featureKillSwitches ?? DEFAULT_FEATURE_KILL_SWITCHES
    const orgKillSwitch = orgConfig?.globalKillSwitch ?? false

    const aiEnabled = !globalKillSwitch && !orgKillSwitch && !featureKillSwitches.all

    return {
      globalKillSwitch: globalKillSwitch || orgKillSwitch,
      featureKillSwitches,
      dailyCostLimitCents: globalConfig?.dailyCostLimitCents ?? 1000,
      currentDailyCostCents: globalConfig?.currentDailyCostCents ?? 0,
      aiEnabled,
    }
  },
})

/**
 * Sets kill switch at global, org, or feature level.
 * Admin only. Core tracking remains unaffected.
 */
export const setKillSwitch = mutation({
  args: {
    scope: killSwitchScopeValidator,
    enabled: v.boolean(),
    orgId: v.optional(v.id('organizations')),
    feature: v.optional(aiFeatureValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx)
    const now = Date.now()

    if (args.scope === 'org' && !args.orgId) {
      throw new Error('orgId required for org-scoped kill switch')
    }
    if (args.scope === 'feature' && !args.feature) {
      throw new Error('feature required for feature-scoped kill switch')
    }

    const scopeKey = args.scope === 'org' ? 'org' : 'global'
    const existing = await ctx.db
      .query('aiGovernanceConfig')
      .withIndex(args.scope === 'org' ? 'by_orgId' : 'by_scope', q =>
        args.scope === 'org' ? q.eq('orgId', args.orgId!) : q.eq('scope', 'global')
      )
      .first()

    const featureKillSwitches = {
      ...DEFAULT_FEATURE_KILL_SWITCHES,
      ...(existing?.featureKillSwitches ?? {}),
    }

    if (args.scope === 'feature' && args.feature) {
      featureKillSwitches[args.feature] = !args.enabled
    }

    const patch = {
      scope: scopeKey as 'global' | 'org',
      orgId: args.orgId,
      globalKillSwitch: args.scope === 'global' || args.scope === 'org' ? !args.enabled : (existing?.globalKillSwitch ?? false),
      featureKillSwitches,
      dailyCostLimitCents: existing?.dailyCostLimitCents ?? 1000,
      currentDailyCostCents: existing?.currentDailyCostCents ?? 0,
      costResetDate: existing?.costResetDate ?? new Date().toISOString().slice(0, 10),
      updatedByUserId: user._id,
      updatedAt: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch)
    } else {
      await ctx.db.insert('aiGovernanceConfig', patch)
    }

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: args.orgId,
      event: `AI kill switch ${args.enabled ? 'disabled' : 'enabled'} (scope: ${args.scope}${args.feature ? `, feature: ${args.feature}` : ''})`,
      targetResource: 'aiGovernanceConfig',
      action: 'update',
      createdAt: now,
    })

    return null
  },
})

/**
 * Records approval for a provider/model change after passing evaluations.
 * Admin only.
 */
export const approveModelChange = mutation({
  args: {
    providerId: v.string(),
    modelId: v.string(),
    evaluationDatasetVersion: v.string(),
    evaluationRunId: v.optional(v.id('aiEvaluationRuns')),
    notes: v.optional(v.string()),
    expiresAtDays: v.optional(v.number()),
  },
  returns: v.id('aiModelApprovals'),
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx)
    const now = Date.now()
    const expiresAt = now + (args.expiresAtDays ?? 90) * 24 * 60 * 60 * 1000

    const approvalId = await ctx.db.insert('aiModelApprovals', {
      providerId: args.providerId,
      modelId: args.modelId,
      evaluationDatasetVersion: args.evaluationDatasetVersion,
      evaluationRunId: args.evaluationRunId,
      approvedByUserId: user._id,
      approvedAt: now,
      expiresAt,
      notes: args.notes,
      status: 'active',
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      event: `AI model approved: ${args.providerId}/${args.modelId} (eval: ${args.evaluationDatasetVersion})`,
      targetResource: 'aiModelApprovals',
      resourceId: approvalId,
      action: 'create',
      createdAt: now,
    })

    return approvalId
  },
})

/**
 * Lists active model approvals.
 */
export const listModelApprovals = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('aiModelApprovals'),
      providerId: v.string(),
      modelId: v.string(),
      evaluationDatasetVersion: v.string(),
      approvedAt: v.number(),
      expiresAt: v.number(),
      status: v.union(v.literal('active'), v.literal('expired'), v.literal('revoked')),
    })
  ),
  handler: async ctx => {
    await requireUser(ctx)

    const approvals = await ctx.db
      .query('aiModelApprovals')
      .withIndex('by_status', q => q.eq('status', 'active'))
      .collect()

    return approvals.map(a => ({
      _id: a._id,
      providerId: a.providerId,
      modelId: a.modelId,
      evaluationDatasetVersion: a.evaluationDatasetVersion,
      approvedAt: a.approvedAt,
      expiresAt: a.expiresAt,
      status: a.status,
    }))
  },
})

/**
 * Records an AI request audit entry (metadata only — no prompts or PII).
 */
export const recordAiRequestAudit = mutation({
  args: {
    requestId: v.string(),
    ctxSessionId: v.string(),
    orgId: v.optional(v.id('organizations')),
    feature: aiFeatureValidator,
    outcome: v.string(),
    providerId: v.optional(v.string()),
    modelId: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    tokenCount: v.optional(v.number()),
    promptFingerprint: v.string(),
  },
  returns: v.id('aiRequestAudit'),
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const forbiddenFields = ['prompt', 'response', 'clinicalNote', 'email', 'name', 'phone']
    for (const field of forbiddenFields) {
      if (field in args) {
        throw new Error(`Forbidden field in audit entry: ${field}`)
      }
    }

    return await ctx.db.insert('aiRequestAudit', {
      requestId: args.requestId,
      ctxSessionId: args.ctxSessionId,
      orgId: args.orgId,
      feature: args.feature,
      outcome: args.outcome,
      providerId: args.providerId,
      modelId: args.modelId,
      latencyMs: args.latencyMs,
      tokenCount: args.tokenCount,
      promptFingerprint: args.promptFingerprint,
      createdAt: Date.now(),
    })
  },
})

/**
 * Records an evaluation run result for release gate audit.
 */
export const recordEvaluationRun = mutation({
  args: {
    datasetVersion: v.string(),
    totalCases: v.number(),
    passedCases: v.number(),
    failedCases: v.number(),
    metrics: v.object({
      safetyRefusalRate: v.number(),
      privacyNoPiiSent: v.number(),
      groundednessCitationValid: v.number(),
      injectionBlockedRate: v.number(),
      exfiltrationBlockedRate: v.number(),
      biasNeutralLanguage: v.number(),
    }),
    releaseBlocked: v.boolean(),
    criticalFailures: v.array(v.string()),
  },
  returns: v.id('aiEvaluationRuns'),
  handler: async (ctx, args) => {
    const { user } = await requireAdmin(ctx)

    return await ctx.db.insert('aiEvaluationRuns', {
      datasetVersion: args.datasetVersion,
      totalCases: args.totalCases,
      passedCases: args.passedCases,
      failedCases: args.failedCases,
      metrics: args.metrics,
      releaseBlocked: args.releaseBlocked,
      criticalFailures: args.criticalFailures,
      runByUserId: user._id,
      runAt: Date.now(),
    })
  },
})

/**
 * Returns the latest evaluation run for release gate status.
 */
export const getLatestEvaluationRun = query({
  args: {},
  returns: v.union(
    v.object({
      datasetVersion: v.string(),
      totalCases: v.number(),
      passedCases: v.number(),
      failedCases: v.number(),
      releaseBlocked: v.boolean(),
      runAt: v.number(),
    }),
    v.null()
  ),
  handler: async ctx => {
    await requireUser(ctx)

    const latest = await ctx.db
      .query('aiEvaluationRuns')
      .withIndex('by_runAt')
      .order('desc')
      .first()

    if (!latest) return null

    return {
      datasetVersion: latest.datasetVersion,
      totalCases: latest.totalCases,
      passedCases: latest.passedCases,
      failedCases: latest.failedCases,
      releaseBlocked: latest.releaseBlocked,
      runAt: latest.runAt,
    }
  },
})
