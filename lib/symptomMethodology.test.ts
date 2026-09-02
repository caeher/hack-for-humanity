import { describe, expect, it } from 'vitest'
import {
  computeAnsweredSymptomTotal,
  computeDescriptiveTrend,
  computeSymptomTotalComputation,
  countAnsweredSymptoms,
  formatSymptomTotalDisplay,
  isCompleteSymptomInventory,
  longestConsecutiveDayStreak,
  meetsTrendMinimumHistory,
  METHODOLOGY_COPY,
  SYMPTOM_DIMENSION_IDS,
  SYMPTOM_METHODOLOGY_VERSION,
  SYMPTOM_TOTAL_MAX,
  TREND_REQUIREMENTS,
  type CheckInDataPoint,
} from './symptomMethodology'

const ALL_SYMPTOM_IDS = SYMPTOM_DIMENSION_IDS

const completeInventory = Object.fromEntries(ALL_SYMPTOM_IDS.map(id => [id, 2]))

describe('symptomMethodology versioning', () => {
  it('exposes a semver methodology version on computations', () => {
    const computation = computeSymptomTotalComputation(completeInventory)
    expect(computation.methodologyVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
    expect(computation.methodologyVersion).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('symptom total — missing-item handling', () => {
  it('never treats missing dimensions as zero in partial inventories', () => {
    const partial = { headache: 3, dizziness: 2 }
    const computation = computeSymptomTotalComputation(partial)

    expect(computation.status).toBe('partial')
    expect(computation.total).toBe(5)
    expect(computation.answeredCount).toBe(2)
    expect(computation.requiredCount).toBe(8)
    expect(computation.rules.missingHandling).toBe('excluded')
    expect(computeAnsweredSymptomTotal(partial)).toBe(5)
    expect(countAnsweredSymptoms(partial)).toBe(2)
    expect(isCompleteSymptomInventory(partial, ALL_SYMPTOM_IDS)).toBe(false)
  })

  it('treats explicit zero ratings as valid contributing answers', () => {
    const withZeros = { headache: 0, dizziness: 0, nausea: 0 }
    expect(computeSymptomTotalComputation(withZeros).total).toBe(0)
    expect(countAnsweredSymptoms(withZeros)).toBe(3)
  })

  it('requires all eight dimensions for a complete inventory', () => {
    const computation = computeSymptomTotalComputation(completeInventory)
    expect(computation.status).toBe('complete')
    expect(computation.total).toBe(16)
    expect(computation.contributingRatings).toHaveLength(8)
    expect(isCompleteSymptomInventory(completeInventory, ALL_SYMPTOM_IDS)).toBe(true)
  })

  it('caps maximum complete total at 48', () => {
    const maxed = Object.fromEntries(ALL_SYMPTOM_IDS.map(id => [id, 6]))
    expect(computeSymptomTotalComputation(maxed).total).toBe(SYMPTOM_TOTAL_MAX)
  })

  it('returns null total for empty inventories', () => {
    const computation = computeSymptomTotalComputation({})
    expect(computation.status).toBe('empty')
    expect(computation.total).toBeNull()
    expect(formatSymptomTotalDisplay(computation)).toContain('No symptom ratings')
  })
})

describe('symptom total — display copy interpretation', () => {
  it('never labels the metric a Recovery Score', () => {
    const complete = computeSymptomTotalComputation(completeInventory)
    const partial = computeSymptomTotalComputation({ headache: 2 })

    for (const text of [METHODOLOGY_COPY.metricName]) {
      expect(text).not.toMatch(/Recovery Score/i)
      expect(text).not.toMatch(/percent recovered/i)
    }

    for (const text of [formatSymptomTotalDisplay(complete), formatSymptomTotalDisplay(partial)]) {
      expect(text).not.toMatch(/percent recovered/i)
      if (/recovery score/i.test(text)) {
        expect(text).toMatch(/not a clinical recovery score/i)
      }
    }

    expect(METHODOLOGY_COPY.notRecoveryScore).toMatch(/not a clinical recovery score/i)
  })

  it('states partial totals exclude missing dimensions', () => {
    const partial = computeSymptomTotalComputation({ headache: 4, fatigue: 1 })
    const display = formatSymptomTotalDisplay(partial)
    expect(display).toContain('partial')
    expect(display).toContain('missing')
  })
})

describe('trend minimum history', () => {
  it('requires five total entries unless three consecutive days are present', () => {
    const fourPoints: CheckInDataPoint[] = [
      { date: '2026-08-01', symptomTotal: 20 },
      { date: '2026-08-03', symptomTotal: 18 },
      { date: '2026-08-05', symptomTotal: 17 },
      { date: '2026-08-07', symptomTotal: 16 },
    ]

    expect(meetsTrendMinimumHistory(fourPoints).met).toBe(false)
    expect(meetsTrendMinimumHistory(fourPoints).reason).toBe(
      METHODOLOGY_COPY.insufficientTrendData
    )
  })

  it('accepts three consecutive calendar days as sufficient history', () => {
    const threeConsecutive: CheckInDataPoint[] = [
      { date: '2026-08-28', symptomTotal: 24 },
      { date: '2026-08-29', symptomTotal: 20 },
      { date: '2026-08-30', symptomTotal: 18 },
    ]

    expect(meetsTrendMinimumHistory(threeConsecutive).met).toBe(true)
    expect(longestConsecutiveDayStreak(threeConsecutive.map(point => point.date))).toBe(3)
  })

  it('accepts five non-consecutive entries', () => {
    const fiveEntries: CheckInDataPoint[] = [
      { date: '2026-08-01', symptomTotal: 30 },
      { date: '2026-08-04', symptomTotal: 28 },
      { date: '2026-08-08', symptomTotal: 25 },
      { date: '2026-08-12', symptomTotal: 22 },
      { date: '2026-08-16', symptomTotal: 20 },
    ]

    expect(meetsTrendMinimumHistory(fiveEntries).met).toBe(true)
  })
})

describe('computeDescriptiveTrend', () => {
  const sufficientWindow: CheckInDataPoint[] = [
    { date: '2026-08-25', symptomTotal: 27 },
    { date: '2026-08-26', symptomTotal: 25 },
    { date: '2026-08-27', symptomTotal: 23 },
    { date: '2026-08-28', symptomTotal: 24 },
    { date: '2026-08-29', symptomTotal: 20 },
    { date: '2026-08-30', symptomTotal: 18 },
    { date: '2026-09-01', symptomTotal: 15 },
  ]

  it('returns insufficient state below minimum history', () => {
    const trend = computeDescriptiveTrend([
      { date: '2026-08-28', symptomTotal: 20 },
      { date: '2026-08-29', symptomTotal: 18 },
    ])

    expect(trend.readiness).toBe('insufficient')
    expect(trend.direction).toBeNull()
    expect(trend.summaryText).toContain('Additional daily entries')
    expect(trend.methodologyVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
  })

  it('classifies a decreasing within-person trend in the default window', () => {
    const trend = computeDescriptiveTrend(sufficientWindow)

    expect(trend.readiness).toBe('sufficient')
    expect(trend.direction).toBe('decreasing')
    expect(trend.delta).toBe(-10)
    expect(trend.earliestTotal).toBe(25)
    expect(trend.latestTotal).toBe(15)
    expect(trend.windowDays).toBe(TREND_REQUIREMENTS.defaultWindowDays)
  })

  it('uses descriptive language without prognosis or clearance claims', () => {
    const trend = computeDescriptiveTrend(sufficientWindow)

    expect(trend.summaryText).toMatch(/decreased/i)
    expect(trend.summaryText).toMatch(/patient-reported/i)
    expect(trend.summaryText).not.toMatch(/recovered|clearance|prognosis|caused by/i)
    expect(trend.disclaimerText).toContain('do not establish medical causation')
    expect(trend.disclaimerText).not.toMatch(/return-to-activity clearance/i)
  })

  it('labels small changes as stable within the threshold', () => {
    const stablePoints: CheckInDataPoint[] = [
      { date: '2026-08-25', symptomTotal: 16 },
      { date: '2026-08-26', symptomTotal: 16 },
      { date: '2026-08-27', symptomTotal: 17 },
      { date: '2026-08-28', symptomTotal: 16 },
      { date: '2026-08-29', symptomTotal: 17 },
    ]

    const trend = computeDescriptiveTrend(stablePoints)
    expect(trend.direction).toBe('stable')
    expect(trend.summaryText).toContain('relatively stable')
  })

  it('labels increasing trends without implying causation', () => {
    const increasingPoints: CheckInDataPoint[] = [
      { date: '2026-08-25', symptomTotal: 10 },
      { date: '2026-08-26', symptomTotal: 12 },
      { date: '2026-08-27', symptomTotal: 13 },
      { date: '2026-08-28', symptomTotal: 14 },
      { date: '2026-08-29', symptomTotal: 18 },
    ]

    const trend = computeDescriptiveTrend(increasingPoints)
    expect(trend.direction).toBe('increasing')
    expect(trend.summaryText).toMatch(/increased/i)
    expect(trend.summaryText).toMatch(/logged ratings only/i)
  })

  it('does not impute missing days in the comparison window', () => {
    const gappedPoints: CheckInDataPoint[] = [
      { date: '2026-08-20', symptomTotal: 30 },
      { date: '2026-08-21', symptomTotal: 28 },
      { date: '2026-08-22', symptomTotal: 26 },
      { date: '2026-08-23', symptomTotal: 24 },
      { date: '2026-08-24', symptomTotal: 22 },
      { date: '2026-09-01', symptomTotal: 15 },
    ]

    const trend = computeDescriptiveTrend(gappedPoints)
    expect(trend.dataPointsInWindow).toBe(1)
    expect(trend.readiness).toBe('insufficient')
    expect(trend.summaryText).toContain('At least two complete check-ins')
  })
})
