/// <reference types="vite/client" />
import { describe, expect, test } from 'vitest'
import {
  COHORT_SMALL_CELL_THRESHOLD,
  aggregateDimensionalCells,
  buildSegmentBreakdowns,
  classifyEngagementTier,
  classifyEpisodeDurationBand,
  computeFilteredMetrics,
  filterDimensionalCells,
  normalizeProgramPathway,
  shouldSuppress,
  type DimensionalCell,
  type PatientCohortBuckets,
} from '../lib/cohortAnalyticsLogic'

function makeBucket(overrides: Partial<PatientCohortBuckets> = {}): PatientCohortBuckets {
  return {
    patientId: 'patient1' as PatientCohortBuckets['patientId'],
    ageBand: '25-39',
    episodeDurationBand: '15-30d',
    engagementTier: 'high',
    programPathway: 'Sports-related injury',
    hasCheckIn7d: true,
    hasBaseline: true,
    hasExposure30d: true,
    hasActiveAlert: false,
    checkIns30d: 10,
    dangerSignCheckIns30d: 0,
    symptomTotals7d: [18, 20, 16],
    ...overrides,
  }
}

describe('cohortAnalyticsLogic', () => {
  test('documents small-cell threshold at 5', () => {
    expect(COHORT_SMALL_CELL_THRESHOLD).toBe(5)
    expect(shouldSuppress(4)).toBe(true)
    expect(shouldSuppress(5)).toBe(false)
  })

  test('classifies episode duration bands from incident date', () => {
    expect(classifyEpisodeDurationBand('2026-08-25', '2026-08-31')).toBe('0-7d')
    expect(classifyEpisodeDurationBand('2026-07-01', '2026-08-31')).toBe('31-90d')
  })

  test('classifies engagement tiers from 7-day check-in count', () => {
    expect(classifyEngagementTier(6)).toBe('high')
    expect(classifyEngagementTier(3)).toBe('moderate')
    expect(classifyEngagementTier(1)).toBe('low')
    expect(classifyEngagementTier(0)).toBe('none')
  })

  test('normalizes program pathways without procedure/surgery dimensions', () => {
    const pathway = normalizeProgramPathway(
      '[SIMULATED DEMO] Sports collision (recreational soccer match)',
      ['Return-to-Learn', 'Sports medicine']
    )
    expect(pathway).toBe('Sports-related injury')
    expect(pathway.toLowerCase()).not.toContain('surgery')
    expect(pathway.toLowerCase()).not.toContain('procedure')
  })

  test('suppresses filtered cohort below threshold', () => {
    const buckets = Array.from({ length: 4 }, (_, i) =>
      makeBucket({
        patientId: `patient${i}` as PatientCohortBuckets['patientId'],
        ageBand: '18-24',
      })
    )
    const cells = aggregateDimensionalCells(buckets)
    const result = computeFilteredMetrics(cells, { ageBand: '18-24' })
    expect(result.suppressed).toBe(true)
    expect(result.suppressionReason).toContain('below the minimum threshold')
    expect(result.metrics.every(m => m.suppressed)).toBe(true)
  })

  test('returns metrics when cohort meets threshold', () => {
    const buckets = Array.from({ length: 6 }, (_, i) =>
      makeBucket({
        patientId: `patient${i}` as PatientCohortBuckets['patientId'],
        ageBand: '25-39',
        symptomTotals7d: [20, 22],
      })
    )
    const cells = aggregateDimensionalCells(buckets)
    const result = computeFilteredMetrics(cells, {})
    expect(result.suppressed).toBe(false)
    expect(result.patientCount).toBe(6)

    const enrollment = result.metrics.find(m => m.metricId === 'enrollment_count')
    expect(enrollment?.value).toBe(6)

    const engagement = result.metrics.find(m => m.metricId === 'check_in_engagement_7d')
    expect(engagement?.value).toBe(100)
  })

  test('suppresses segment breakdowns below threshold', () => {
    const cells: DimensionalCell[] = [
      {
        ageBand: '13-17',
        episodeDurationBand: '0-7d',
        engagementTier: 'low',
        programPathway: 'Sports-related injury',
        patientCount: 3,
        patientsWithCheckIn7d: 2,
        patientsWithBaseline: 1,
        patientsWithExposure30d: 1,
        patientsWithActiveAlert: 0,
        checkInsSubmitted30d: 5,
        dangerSignCheckIns30d: 0,
        symptomTotals7d: [15],
      },
      {
        ageBand: '25-39',
        episodeDurationBand: '15-30d',
        engagementTier: 'high',
        programPathway: 'Motor vehicle collision',
        patientCount: 8,
        patientsWithCheckIn7d: 7,
        patientsWithBaseline: 6,
        patientsWithExposure30d: 5,
        patientsWithActiveAlert: 1,
        checkInsSubmitted30d: 40,
        dangerSignCheckIns30d: 2,
        symptomTotals7d: [18, 20],
      },
    ]

    const segments = buildSegmentBreakdowns(cells)
    const smallSegment = segments.find(s => s.label === '13–17')
    expect(smallSegment?.suppressed).toBe(true)
    const largeSegment = segments.find(s => s.label === '25–39')
    expect(largeSegment?.suppressed).toBe(false)
  })

  test('filterDimensionalCells respects all filter dimensions', () => {
    const cells: DimensionalCell[] = [
      {
        ageBand: '18-24',
        episodeDurationBand: '8-14d',
        engagementTier: 'moderate',
        programPathway: 'Cycling-related injury',
        patientCount: 6,
        patientsWithCheckIn7d: 4,
        patientsWithBaseline: 3,
        patientsWithExposure30d: 2,
        patientsWithActiveAlert: 0,
        checkInsSubmitted30d: 12,
        dangerSignCheckIns30d: 0,
        symptomTotals7d: [22],
      },
      {
        ageBand: '40-54',
        episodeDurationBand: '31-90d',
        engagementTier: 'low',
        programPathway: 'Fall-related injury',
        patientCount: 7,
        patientsWithCheckIn7d: 3,
        patientsWithBaseline: 5,
        patientsWithExposure30d: 4,
        patientsWithActiveAlert: 1,
        checkInsSubmitted30d: 8,
        dangerSignCheckIns30d: 1,
        symptomTotals7d: [30],
      },
    ]

    const filtered = filterDimensionalCells(cells, {
      ageBand: '18-24',
      engagementTier: 'moderate',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.patientCount).toBe(6)
  })

  test('metric definitions never use recovery or readiness language as labels', async () => {
    const { COHORT_METRIC_DEFINITIONS } = await import('../lib/cohortAnalyticsLogic')
    for (const def of COHORT_METRIC_DEFINITIONS) {
      const labelAndDefinition = `${def.label} ${def.definition}`.toLowerCase()
      expect(labelAndDefinition).not.toContain('percent recovered')
      expect(labelAndDefinition).not.toContain('return-to-activity readiness')
      expect(labelAndDefinition).not.toContain('recovery score')
    }
  })
})

describe('cohortAnalytics API', () => {
  const adminIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
    subject: 'admin_1',
    name: 'System Admin',
    email: 'admin@example.com',
  }

  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  test('organization admin can access cohort dashboard with metric definitions', async () => {
    const { convexTest } = await import('convex-test')
    const { api } = await import('../_generated/api')
    const schema = (await import('../schema')).default
    const modules = import.meta.glob('../**/*.ts')

    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    expect(org).not.toBeNull()

    const definitions = await t.query(api.cohortAnalytics.getMetricDefinitions, {})
    expect(definitions.length).toBeGreaterThan(0)
    expect(
      definitions.every(
        (d: { definition: string; denominator: string; caveat: string }) =>
          d.definition && d.denominator && d.caveat
      )
    ).toBe(true)

    const dashboard = await t
      .withIdentity(adminIdentity)
      .query(api.cohortAnalytics.getCohortDashboard, {
        orgId: org!._id,
        asOfDate: '2026-08-31',
      })

    expect(dashboard.smallCellThreshold).toBe(5)
    expect(dashboard.cohortSize).toBeGreaterThan(0)
    expect(dashboard.metrics.length).toBeGreaterThan(0)
    expect(dashboard.privacyNotice).toContain('re-identification')

    const symptomMetric = dashboard.metrics.find(
      (m: { metricId: string }) => m.metricId === 'median_symptom_total_7d'
    )
    expect(symptomMetric?.descriptiveOnly).toBe(true)
    expect(symptomMetric?.caveat.toLowerCase()).toContain('not recovery')
  })

  test('non-admin cannot access cohort dashboard', async () => {
    const { convexTest } = await import('convex-test')
    const { api } = await import('../_generated/api')
    const schema = (await import('../schema')).default
    const modules = import.meta.glob('../**/*.ts')

    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})

    await expect(
      t.withIdentity(patientIdentity).query(api.cohortAnalytics.getCohortDashboard, {
        orgId: org!._id,
        asOfDate: '2026-08-31',
      })
    ).rejects.toThrow(/Forbidden|Organization admin/)
  })

  test('cohort dashboard does not expose patient identifiers', async () => {
    const { convexTest } = await import('convex-test')
    const { api } = await import('../_generated/api')
    const schema = (await import('../schema')).default
    const modules = import.meta.glob('../**/*.ts')

    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})

    const dashboard = await t
      .withIdentity(adminIdentity)
      .query(api.cohortAnalytics.getCohortDashboard, {
        orgId: org!._id,
        asOfDate: '2026-08-31',
      })

    const serialized = JSON.stringify(dashboard)
    expect(serialized).not.toContain('P-1042')
    expect(serialized).not.toContain('Maya Chen')
    expect(serialized).not.toMatch(/"patientId":/)
    expect(serialized).not.toMatch(/"displayId":/)
  })

  test('seed rebuilds maintained cohort analytics snapshot', async () => {
    const { convexTest } = await import('convex-test')
    const { api } = await import('../_generated/api')
    const schema = (await import('../schema')).default
    const modules = import.meta.glob('../**/*.ts')

    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})

    const snapshots = await t.run(async ctx => {
      return await ctx.db
        .query('cohortAnalyticsSnapshots')
        .withIndex('by_orgId_and_periodKey', q =>
          q.eq('orgId', org!._id).eq('periodKey', 'rolling-30d')
        )
        .collect()
    })

    expect(snapshots.length).toBeGreaterThan(0)
    expect(snapshots[0]?.eligiblePatients).toBeGreaterThan(0)
    expect(snapshots[0]?.dimensionalCells.length).toBeGreaterThan(0)
  })
})
