import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import {
  COHORT_METRIC_DEFINITIONS,
  COHORT_METHODOLOGY_VERSION,
  COHORT_PERIOD_DAYS,
  COHORT_SMALL_CELL_THRESHOLD,
  aggregateDimensionalCells,
  buildSegmentBreakdowns,
  classifyEngagementTier,
  classifyEpisodeDurationBand,
  computeFilteredMetrics,
  detectDataSource,
  getMetricDefinition,
  normalizeProgramPathway,
  shouldSuppress,
  type AgeBand,
  type CohortFilters,
  type DimensionalCell,
  type EpisodeDurationBand,
  type EngagementTier,
  type PatientCohortBuckets,
} from './lib/cohortAnalyticsLogic'
import {
  cohortDashboardValidator,
  cohortFiltersValidator,
  cohortMetricDefinitionsValidator,
} from './lib/validators'
import { requireOrgAdmin } from './lib/orgAuth'

const DEFAULT_PERIOD_KEY = 'rolling-30d'

const PRIVACY_NOTICE =
  'All values are de-identified aggregates. Groups smaller than the documented threshold are suppressed to prevent re-identification. Symptom totals describe patient-reported burden — not recovery, severity, prognosis, or return-to-activity readiness.'

function isoDateDaysAgo(asOfDate: string, days: number): string {
  const ms = Date.parse(`${asOfDate}T00:00:00.000Z`) - days * 24 * 60 * 60 * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

export async function buildPatientBuckets(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<'organizations'>,
  asOfDate: string,
  orgPathways: string[] | undefined
): Promise<{
  buckets: PatientCohortBuckets[]
  activeEpisodes: number
  lastCheckInDate: string | null
  lastPatientEnrollment: string | null
}> {
  const sevenDaysAgo = isoDateDaysAgo(asOfDate, 7)
  const thirtyDaysAgo = isoDateDaysAgo(asOfDate, COHORT_PERIOD_DAYS)

  const patients = await ctx.db
    .query('patients')
    .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', 'Active'))
    .collect()

  const episodes = await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', 'active'))
    .collect()

  const episodeByPatient = new Map<Id<'patients'>, Doc<'recoveryEpisodes'>>()
  for (const episode of episodes) {
    episodeByPatient.set(episode.patientId, episode)
  }

  const activeAlerts = await ctx.db
    .query('alerts')
    .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', 'active'))
    .collect()
  const patientsWithAlerts = new Set(activeAlerts.map(a => a.patientId))

  let lastCheckInDate: string | null = null
  let lastPatientEnrollment: string | null = null

  const buckets: PatientCohortBuckets[] = []

  for (const patient of patients) {
    const episode = episodeByPatient.get(patient._id)
    const ageBand: AgeBand = patient.ageBand ?? 'unknown'
    const episodeDurationBand: EpisodeDurationBand = episode
      ? classifyEpisodeDurationBand(episode.incidentDate, asOfDate)
      : 'unknown'
    const programPathway = episode
      ? normalizeProgramPathway(episode.injuryContext, orgPathways)
      : 'No active episode'

    const checkIns7d = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', patient._id).gte('date', sevenDaysAgo)
      )
      .collect()

    const checkIns30d = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', patient._id).gte('date', thirtyDaysAgo)
      )
      .collect()

    for (const checkIn of checkIns30d) {
      if (!lastCheckInDate || checkIn.date > lastCheckInDate) {
        lastCheckInDate = checkIn.date
      }
    }

    const enrollmentDate = new Date(patient.createdAt).toISOString().slice(0, 10)
    if (!lastPatientEnrollment || enrollmentDate > lastPatientEnrollment) {
      lastPatientEnrollment = enrollmentDate
    }

    const exposures30d = await ctx.db
      .query('exposureEntries')
      .withIndex('by_patientId_and_date', q =>
        q.eq('patientId', patient._id).gte('date', thirtyDaysAgo)
      )
      .first()

    let hasBaseline = false
    if (episode) {
      const baseline = await ctx.db
        .query('recoveryBaselines')
        .withIndex('by_episodeId_and_isCurrent', q =>
          q.eq('episodeId', episode._id).eq('isCurrent', true)
        )
        .first()
      hasBaseline = baseline !== null
    }

    const engagementTier = classifyEngagementTier(checkIns7d.length)
    const symptomTotals7d = checkIns7d.map(c => c.symptomTotal)
    const dangerSignCheckIns30d = checkIns30d.filter(c => c.dangerSignsPresent).length

    buckets.push({
      patientId: patient._id,
      ageBand,
      episodeDurationBand,
      engagementTier,
      programPathway,
      hasCheckIn7d: checkIns7d.length > 0,
      hasBaseline,
      hasExposure30d: exposures30d !== null,
      hasActiveAlert: patientsWithAlerts.has(patient._id),
      checkIns30d: checkIns30d.length,
      dangerSignCheckIns30d,
      symptomTotals7d,
    })
  }

  return {
    buckets,
    activeEpisodes: episodes.length,
    lastCheckInDate,
    lastPatientEnrollment,
  }
}

function serializeDimensionalCells(cells: DimensionalCell[]) {
  return cells.map(cell => ({
    ageBand: cell.ageBand,
    episodeDurationBand: cell.episodeDurationBand,
    engagementTier: cell.engagementTier,
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
}

function deserializeDimensionalCells(
  cells: Array<{
    ageBand: string
    episodeDurationBand: string
    engagementTier: string
    programPathway: string
    patientCount: number
    patientsWithCheckIn7d: number
    patientsWithBaseline: number
    patientsWithExposure30d: number
    patientsWithActiveAlert: number
    checkInsSubmitted30d: number
    dangerSignCheckIns30d: number
    symptomTotals7d: number[]
  }>
): DimensionalCell[] {
  return cells.map(cell => ({
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
}

function extractFilterOptions(cells: DimensionalCell[]) {
  const ageBands = new Set<string>()
  const episodeDurationBands = new Set<string>()
  const engagementTiers = new Set<string>()
  const programPathways = new Set<string>()

  for (const cell of cells) {
    if (!shouldSuppress(cell.patientCount)) {
      ageBands.add(cell.ageBand)
      episodeDurationBands.add(cell.episodeDurationBand)
      engagementTiers.add(cell.engagementTier)
      programPathways.add(cell.programPathway)
    }
  }

  return {
    ageBands: Array.from(ageBands).sort(),
    episodeDurationBands: Array.from(episodeDurationBands).sort(),
    engagementTiers: Array.from(engagementTiers).sort(),
    programPathways: Array.from(programPathways).sort(),
  }
}

function formatMetricValue(
  metricId: string,
  value: number | null,
  unit: 'count' | 'percent' | 'median'
): number | null {
  if (value === null) return null
  if (unit === 'percent') return value
  if (unit === 'median') return value
  return value
}

/**
 * Returns documented metric definitions for cohort analytics transparency.
 */
export const getMetricDefinitions = query({
  args: {},
  returns: cohortMetricDefinitionsValidator,
  handler: async () => {
    return COHORT_METRIC_DEFINITIONS.map(def => ({
      metricId: def.metricId,
      label: def.label,
      definition: def.definition,
      denominator: def.denominator,
      caveat: def.caveat,
      sourceQuery: def.sourceQuery,
      unit: def.unit,
      descriptiveOnly: def.descriptiveOnly,
    }))
  },
})

/**
 * Privacy-preserving cohort dashboard for organization administrators.
 * Uses maintained aggregate snapshots — no raw patient records returned.
 */
export const getCohortDashboard = query({
  args: {
    orgId: v.id('organizations'),
    asOfDate: v.string(),
    filters: v.optional(cohortFiltersValidator),
    periodKey: v.optional(v.string()),
  },
  returns: cohortDashboardValidator,
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.orgId)

    const periodKey = args.periodKey ?? DEFAULT_PERIOD_KEY
    const filters: CohortFilters = args.filters ?? {}
    const rangeEnd = args.asOfDate
    const rangeStart = isoDateDaysAgo(rangeEnd, COHORT_PERIOD_DAYS)

    const snapshot = await ctx.db
      .query('cohortAnalyticsSnapshots')
      .withIndex('by_orgId_and_periodKey', q =>
        q.eq('orgId', args.orgId).eq('periodKey', periodKey)
      )
      .order('desc')
      .first()

    if (!snapshot) {
      const org = await ctx.db.get(args.orgId)
      const orgPathways = org?.activePathways
      const patients = await ctx.db
        .query('patients')
        .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
        .collect()
      const episodes = await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
        .collect()

      const { buckets, activeEpisodes, lastCheckInDate, lastPatientEnrollment } =
        await buildPatientBuckets(ctx, args.orgId, rangeEnd, orgPathways)

      const dimensionalCells = aggregateDimensionalCells(buckets)
      const dataSource = detectDataSource(patients, episodes)

      return buildDashboardResponse({
        orgId: args.orgId,
        periodKey,
        dataSource,
        computedAt: Date.now(),
        rangeStart,
        rangeEnd,
        dimensionalCells,
        filters,
        dataFreshness: {
          lastCheckInDate,
          lastPatientEnrollment,
        },
        eligiblePatients: buckets.length,
        activeEpisodes,
      })
    }

    const dimensionalCells = deserializeDimensionalCells(snapshot.dimensionalCells)

    return buildDashboardResponse({
      orgId: args.orgId,
      periodKey: snapshot.periodKey,
      dataSource: snapshot.dataSource,
      computedAt: snapshot.computedAt,
      rangeStart: snapshot.rangeStart,
      rangeEnd: snapshot.rangeEnd,
      dimensionalCells,
      filters,
      dataFreshness: snapshot.dataFreshness,
      eligiblePatients: snapshot.eligiblePatients,
      activeEpisodes: snapshot.activeEpisodes,
    })
  },
})

function buildDashboardResponse(args: {
  orgId: Id<'organizations'>
  periodKey: string
  dataSource: 'live' | 'simulated'
  computedAt: number
  rangeStart: string
  rangeEnd: string
  dimensionalCells: DimensionalCell[]
  filters: CohortFilters
  dataFreshness: {
    lastCheckInDate: string | null
    lastPatientEnrollment: string | null
  }
  eligiblePatients: number
  activeEpisodes: number
}) {
  const aggregated = computeFilteredMetrics(args.dimensionalCells, args.filters)
  const segments = buildSegmentBreakdowns(args.dimensionalCells)
  const filterOptions = extractFilterOptions(args.dimensionalCells)

  const metrics = COHORT_METRIC_DEFINITIONS.map(def => {
    const computed = aggregated.metrics.find(m => m.metricId === def.metricId)
    const suppressed = aggregated.suppressed || (computed?.suppressed ?? false)
    return {
      metricId: def.metricId,
      label: def.label,
      definition: def.definition,
      denominator: def.denominator,
      caveat: def.caveat,
      sourceQuery: def.sourceQuery,
      unit: def.unit,
      descriptiveOnly: def.descriptiveOnly,
      value: suppressed ? null : formatMetricValue(def.metricId, computed?.value ?? null, def.unit),
      numerator: suppressed ? 0 : (computed?.numerator ?? 0),
      denominatorCount: suppressed ? 0 : (computed?.denominator ?? 0),
      suppressed,
    }
  })

  return {
    orgId: args.orgId,
    periodKey: args.periodKey,
    dataSource: args.dataSource,
    methodologyVersion: COHORT_METHODOLOGY_VERSION,
    smallCellThreshold: COHORT_SMALL_CELL_THRESHOLD,
    computedAt: args.computedAt,
    rangeStart: args.rangeStart,
    rangeEnd: args.rangeEnd,
    filtersApplied: {
      ageBand: args.filters.ageBand,
      episodeDurationBand: args.filters.episodeDurationBand,
      engagementTier: args.filters.engagementTier,
      programPathway: args.filters.programPathway,
    },
    cohortSize: aggregated.patientCount,
    cohortSuppressed: aggregated.suppressed,
    suppressionReason: aggregated.suppressionReason,
    metrics,
    segments: segments.map(s => ({
      segmentType: s.segmentType,
      label: s.label,
      count: s.count,
      suppressed: s.suppressed,
      displayCount: s.suppressed ? null : String(s.count),
    })),
    filterOptions,
    dataFreshness: args.dataFreshness,
    privacyNotice: PRIVACY_NOTICE,
  }
}

/**
 * Rebuilds the maintained cohort analytics snapshot for one organization.
 */
export const rebuildOrgSnapshot = internalMutation({
  args: {
    orgId: v.id('organizations'),
    asOfDate: v.string(),
    periodKey: v.optional(v.string()),
  },
  returns: v.id('cohortAnalyticsSnapshots'),
  handler: async (ctx, args) => {
    const periodKey = args.periodKey ?? DEFAULT_PERIOD_KEY
    const rangeEnd = args.asOfDate
    const rangeStart = isoDateDaysAgo(rangeEnd, COHORT_PERIOD_DAYS)

    const org = await ctx.db.get(args.orgId)
    if (!org) {
      throw new Error(`Organization ${args.orgId} not found.`)
    }

    const patients = await ctx.db
      .query('patients')
      .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
      .collect()
    const episodes = await ctx.db
      .query('recoveryEpisodes')
      .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
      .collect()

    const { buckets, activeEpisodes, lastCheckInDate, lastPatientEnrollment } =
      await buildPatientBuckets(ctx, args.orgId, rangeEnd, org.activePathways)

    const dimensionalCells = aggregateDimensionalCells(buckets)
    const dataSource = detectDataSource(patients, episodes)
    const now = Date.now()

    const existing = await ctx.db
      .query('cohortAnalyticsSnapshots')
      .withIndex('by_orgId_and_periodKey', q =>
        q.eq('orgId', args.orgId).eq('periodKey', periodKey)
      )
      .first()

    const snapshotData = {
      orgId: args.orgId,
      periodKey,
      dataSource,
      methodologyVersion: COHORT_METHODOLOGY_VERSION,
      computedAt: now,
      rangeStart,
      rangeEnd,
      eligiblePatients: buckets.length,
      activeEpisodes,
      dimensionalCells: serializeDimensionalCells(dimensionalCells),
      dataFreshness: {
        lastCheckInDate,
        lastPatientEnrollment,
      },
    }

    if (existing) {
      await ctx.db.patch(existing._id, snapshotData)
      return existing._id
    }

    return await ctx.db.insert('cohortAnalyticsSnapshots', snapshotData)
  },
})

/**
 * Rebuilds cohort analytics snapshots for all organizations.
 */
export const rebuildAllSnapshots = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const asOfDate = new Date().toISOString().slice(0, 10)
    const orgs = await ctx.db.query('organizations').collect()
    let count = 0
    for (const org of orgs) {
      await rebuildOrgSnapshotHandler(ctx, {
        orgId: org._id,
        asOfDate,
        periodKey: DEFAULT_PERIOD_KEY,
      })
      count += 1
    }
    return count
  },
})

export async function rebuildOrgSnapshotHandler(
  ctx: MutationCtx,
  args: { orgId: Id<'organizations'>; asOfDate: string; periodKey: string }
): Promise<Id<'cohortAnalyticsSnapshots'>> {
  const rangeEnd = args.asOfDate
  const rangeStart = isoDateDaysAgo(rangeEnd, COHORT_PERIOD_DAYS)

  const org = await ctx.db.get(args.orgId)
  if (!org) {
    throw new Error(`Organization ${args.orgId} not found.`)
  }

  const patients = await ctx.db
    .query('patients')
    .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
    .collect()
  const episodes = await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
    .collect()

  const { buckets, activeEpisodes, lastCheckInDate, lastPatientEnrollment } =
    await buildPatientBuckets(ctx, args.orgId, rangeEnd, org.activePathways)

  const dimensionalCells = aggregateDimensionalCells(buckets)
  const dataSource = detectDataSource(patients, episodes)
  const now = Date.now()

  const existing = await ctx.db
    .query('cohortAnalyticsSnapshots')
    .withIndex('by_orgId_and_periodKey', q =>
      q.eq('orgId', args.orgId).eq('periodKey', args.periodKey)
    )
    .first()

  const snapshotData = {
    orgId: args.orgId,
    periodKey: args.periodKey,
    dataSource,
    methodologyVersion: COHORT_METHODOLOGY_VERSION,
    computedAt: now,
    rangeStart,
    rangeEnd,
    eligiblePatients: buckets.length,
    activeEpisodes,
    dimensionalCells: serializeDimensionalCells(dimensionalCells),
    dataFreshness: {
      lastCheckInDate,
      lastPatientEnrollment,
    },
  }

  if (existing) {
    await ctx.db.patch(existing._id, snapshotData)
    return existing._id
  }

  return await ctx.db.insert('cohortAnalyticsSnapshots', snapshotData)
}

export { getMetricDefinition, COHORT_SMALL_CELL_THRESHOLD }
