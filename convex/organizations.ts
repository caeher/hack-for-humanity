import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  orgAggregateMetricsValidator,
  orgDocValidator,
  orgFeatureFlagsValidator,
} from './lib/validators'
import { getCallerAdminOrg, requireOrgAdmin, writeOrgAuditLog } from './lib/orgAuth'
import { validateEmail, validateStringLength } from './lib/businessLogic'
import {
  aggregateDimensionalCells,
  computeFilteredMetrics,
  shouldSuppress,
  type AgeBand,
  type EpisodeDurationBand,
  type EngagementTier,
} from './lib/cohortAnalyticsLogic'
import { buildPatientBuckets } from './cohortAnalytics'

const DEFAULT_FEATURE_FLAGS = {
  aiInsights: true,
  caregiverPortal: true,
  secureMessaging: true,
  patternDetection: true,
}

/**
 * Returns the authenticated caller's primary admin organization workspace.
 */
export const getMyOrganization = query({
  args: {},
  returns: v.union(orgDocValidator, v.null()),
  handler: async ctx => {
    const adminCtx = await getCallerAdminOrg(ctx)
    if (!adminCtx) {
      return null
    }
    return adminCtx.organization
  },
})

/**
 * Privacy-safe aggregate metrics for the organization dashboard.
 * Uses maintained cohort analytics snapshots — no individual PHI exposed.
 */
export const getAggregateMetrics = query({
  args: { orgId: v.id('organizations'), asOfDate: v.optional(v.string()) },
  returns: orgAggregateMetricsValidator,
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.orgId)

    const asOfDate = args.asOfDate ?? new Date().toISOString().slice(0, 10)

    const snapshot = await ctx.db
      .query('cohortAnalyticsSnapshots')
      .withIndex('by_orgId_and_periodKey', q =>
        q.eq('orgId', args.orgId).eq('periodKey', 'rolling-30d')
      )
      .order('desc')
      .first()

    let dimensionalCells
    let enrolledPatients = 0

    if (snapshot) {
      dimensionalCells = snapshot.dimensionalCells.map(cell => ({
        ageBand: cell.ageBand as AgeBand,
        episodeDurationBand: cell.episodeDurationBand as EpisodeDurationBand,
        engagementTier: cell.engagementTier as EngagementTier,
        programPathway: cell.programPathway,
        patientCount: cell.patientCount,
        patientsWithCheckIn7d: cell.patientsWithCheckIn7d,
        patientsWithBaseline: cell.patientsWithBaseline,
        patientsWithExposure30d: cell.patientsWithExposure30d,
        patientsWithActiveAlert: cell.patientsWithActiveAlert,
        checkInsSubmitted30d: cell.checkInsSubmitted30d,
        dangerSignCheckIns30d: cell.dangerSignCheckIns30d,
        symptomTotals7d: cell.symptomTotals7d,
      }))
      enrolledPatients = snapshot.eligiblePatients
    } else {
      const org = await ctx.db.get(args.orgId)
      const { buckets } = await buildPatientBuckets(
        ctx,
        args.orgId,
        asOfDate,
        org?.activePathways
      )
      dimensionalCells = aggregateDimensionalCells(buckets)
      enrolledPatients = buckets.length
    }

    const aggregated = computeFilteredMetrics(dimensionalCells, {})

    const episodes = await ctx.db
      .query('recoveryEpisodes')
      .withIndex('by_orgId_and_status', q => q.eq('orgId', args.orgId).eq('status', 'active'))
      .collect()

    const riskDistribution = { stable: 0, review: 0, elevated: 0 }
    for (const episode of episodes) {
      if (episode.riskLevel === 'Stable') riskDistribution.stable += 1
      else if (episode.riskLevel === 'Review') riskDistribution.review += 1
      else riskDistribution.elevated += 1
    }

    const pathwayCounts: Array<{ pathway: string; count: number }> = []
    const pathwayMap = new Map<string, number>()
    for (const cell of dimensionalCells) {
      if (!shouldSuppress(cell.patientCount)) {
        pathwayMap.set(
          cell.programPathway,
          (pathwayMap.get(cell.programPathway) ?? 0) + cell.patientCount
        )
      }
    }
    for (const [pathway, count] of pathwayMap.entries()) {
      if (!shouldSuppress(count)) {
        pathwayCounts.push({ pathway, count })
      }
    }
    pathwayCounts.sort((a, b) => b.count - a.count)

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_orgId_and_status', q => q.eq('orgId', args.orgId).eq('status', 'active'))
      .collect()

    const highAlerts = alerts.filter(a => a.severity === 'High').length
    const escalationRate =
      enrolledPatients > 0
        ? Math.round((highAlerts / enrolledPatients) * 1000) / 10
        : 0

    const engagementMetric = aggregated.metrics.find(m => m.metricId === 'check_in_engagement_7d')
    const checkInEngagementRate = engagementMetric?.value ?? 0

    const monthStart = Date.now() - 30 * 24 * 60 * 60 * 1000
    const patients = await ctx.db
      .query('patients')
      .withIndex('by_orgId_and_status', q => q.eq('orgId', args.orgId).eq('status', 'Active'))
      .collect()
    const newPatientsThisMonth = patients.filter(p => p.createdAt >= monthStart).length

    return {
      enrolledPatients,
      newPatientsThisMonth,
      checkInEngagementRate,
      activeAlertsCount: alerts.length,
      escalationRate,
      riskDistribution,
      pathwayCounts: pathwayCounts.slice(0, 5),
    }
  },
})

/**
 * Update organization settings. Restricted to organization administrators.
 */
export const updateSettings = mutation({
  args: {
    orgId: v.id('organizations'),
    name: v.optional(v.string()),
    primaryContactEmail: v.optional(v.string()),
    retentionPolicyDays: v.optional(v.number()),
    cohortCapacity: v.optional(v.number()),
    accentColor: v.optional(v.string()),
    activePathways: v.optional(v.array(v.string())),
    locale: v.optional(v.string()),
    autoEscalateAlerts: v.optional(v.boolean()),
    featureFlags: v.optional(orgFeatureFlagsValidator),
    approvedPolicies: v.optional(v.array(v.string())),
  },
  returns: orgDocValidator,
  handler: async (ctx, args) => {
    const { user, organization } = await requireOrgAdmin(ctx, args.orgId)
    const now = Date.now()

    const updates: Record<string, unknown> = {}
    if (args.name !== undefined) {
      updates.name = validateStringLength(args.name, 'Organization name', 2, 120)
    }
    if (args.primaryContactEmail !== undefined) {
      updates.primaryContactEmail = validateEmail(args.primaryContactEmail)
    }
    if (args.retentionPolicyDays !== undefined) {
      updates.retentionPolicyDays = args.retentionPolicyDays
    }
    if (args.cohortCapacity !== undefined) {
      updates.cohortCapacity = args.cohortCapacity
    }
    if (args.accentColor !== undefined) {
      updates.accentColor = args.accentColor
    }
    if (args.activePathways !== undefined) {
      updates.activePathways = args.activePathways
    }
    if (args.locale !== undefined) {
      updates.locale = args.locale
    }
    if (args.autoEscalateAlerts !== undefined) {
      updates.autoEscalateAlerts = args.autoEscalateAlerts
    }
    if (args.featureFlags !== undefined) {
      updates.featureFlags = args.featureFlags
    }
    if (args.approvedPolicies !== undefined) {
      updates.approvedPolicies = args.approvedPolicies
    }

    await ctx.db.patch(args.orgId, updates)

    await writeOrgAuditLog(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: args.orgId,
      event: `Updated organization settings for ${organization.name}`,
      targetResource: 'organizations',
      resourceId: args.orgId,
      action: 'update',
      now,
    })

    const updated = await ctx.db.get(args.orgId)
    if (!updated) {
      throw new Error('Organization not found after update.')
    }
    return updated
  },
})

/**
 * Returns organization settings with defaults applied for optional fields.
 */
export const getSettings = query({
  args: { orgId: v.id('organizations') },
  returns: v.object({
    organization: orgDocValidator,
    featureFlags: orgFeatureFlagsValidator,
  }),
  handler: async (ctx, args) => {
    const { organization } = await requireOrgAdmin(ctx, args.orgId)
    return {
      organization,
      featureFlags: organization.featureFlags ?? DEFAULT_FEATURE_FLAGS,
    }
  },
})
