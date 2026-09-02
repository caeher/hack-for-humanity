import { describe, expect, it } from 'vitest'
import {
  detectLongitudinalPatterns,
  generateNullSyntheticDataset,
  measureFalsePositiveRate,
  PATTERN_DETECTION_VERSION,
  PATTERN_EVIDENCE_THRESHOLDS,
  spearmanRankCorrelation,
  type CheckInObservation,
  type ExposureObservation,
} from '../lib/patternDetection'

function buildCheckIn(
  date: string,
  symptoms: { headache: number; dizziness: number; concentration: number },
  symptomTotal?: number
): CheckInObservation {
  return {
    date,
    symptomTotal: symptomTotal ?? symptoms.headache + symptoms.dizziness + symptoms.concentration,
    symptoms,
  }
}

function buildExposure(
  date: string,
  overrides: Partial<ExposureObservation> = {}
): ExposureObservation {
  return {
    date,
    sleepHours: 8,
    screenMinutes: 60,
    physicalExertionScore: 3,
    cognitiveMinutes: 45,
    ...overrides,
  }
}

describe('patternDetection', () => {
  it('returns insufficient status when check-in count is below threshold', () => {
    const result = detectLongitudinalPatterns({
      checkIns: [
        buildCheckIn('2026-08-28', { headache: 2, dizziness: 1, concentration: 1 }),
        buildCheckIn('2026-08-29', { headache: 3, dizziness: 2, concentration: 1 }),
      ],
      exposures: [buildExposure('2026-08-28', { sleepHours: 5 })],
      today: '2026-08-31',
    })

    expect(result.algorithmVersion).toBe(PATTERN_DETECTION_VERSION)
    expect(result.primaryInsight).toBeNull()
    expect(result.patterns.every(pattern => pattern.status !== 'available')).toBe(true)
    expect(result.patterns[0]?.status).toBe('insufficient')
  })

  it('detects worsening short-sleep lagged headache pattern', () => {
    const checkIns: CheckInObservation[] = []
    const exposures: ExposureObservation[] = []

    for (let day = 0; day < 10; day += 1) {
      const date = `2026-08-${String(20 + day).padStart(2, '0')}`
      const headache = day % 2 === 0 ? 2 : 5
      checkIns.push(buildCheckIn(date, { headache, dizziness: 1, concentration: 1 }))
      exposures.push(buildExposure(date, { sleepHours: 5, screenMinutes: 30 }))
    }

    const result = detectLongitudinalPatterns({
      checkIns,
      exposures,
      today: '2026-08-31',
    })

    const sleepPattern = result.patterns.find(
      pattern => pattern.patternType === 'short_sleep_lagged_headache'
    )
    expect(sleepPattern?.status).toBe('available')
    expect(sleepPattern?.effectDirection).toBe('positive')
    expect(sleepPattern?.title.toLowerCase()).toContain('observed alongside')
    expect(sleepPattern?.description.toLowerCase()).toContain('temporal associations')
    expect(sleepPattern?.description.toLowerCase()).not.toContain('caused by')
    expect(sleepPattern?.algorithmVersion).toBe(PATTERN_DETECTION_VERSION)
    expect(sleepPattern?.inputDateRangeStart).toBeTruthy()
    expect(sleepPattern?.inputDateRangeEnd).toBeTruthy()
  })

  it('detects improving lower-activity lower-dizziness association', () => {
    const checkIns: CheckInObservation[] = []
    const exposures: ExposureObservation[] = []

    for (let day = 0; day < 10; day += 1) {
      const date = `2026-08-${String(15 + day).padStart(2, '0')}`
      const exertion = day
      const dizziness = Math.max(0, 6 - day)
      checkIns.push(
        buildCheckIn(date, { headache: 2, dizziness, concentration: 2 }, 4 + dizziness)
      )
      exposures.push(
        buildExposure(date, {
          physicalExertionScore: exertion,
          sleepHours: 8,
        })
      )
    }

    const result = detectLongitudinalPatterns({
      checkIns,
      exposures,
      today: '2026-08-31',
    })

    const dizzinessPattern = result.patterns.find(
      pattern => pattern.patternType === 'lower_physical_lower_dizziness'
    )
    expect(dizzinessPattern?.status).toBe('available')
    expect(dizzinessPattern?.effectDirection).toBe('negative')
    expect(dizzinessPattern?.confidence).toBeTruthy()
  })

  it('returns no available patterns on uncorrelated stable data', () => {
    const checkIns: CheckInObservation[] = []
    const exposures: ExposureObservation[] = []

    for (let day = 0; day < 8; day += 1) {
      const date = `2026-08-${String(20 + day).padStart(2, '0')}`
      checkIns.push(buildCheckIn(date, { headache: 3, dizziness: 2, concentration: 2 }, 12))
      exposures.push(
        buildExposure(date, {
          sleepHours: 8,
          screenMinutes: 60,
          physicalExertionScore: 4,
          cognitiveMinutes: 50,
        })
      )
    }

    const result = detectLongitudinalPatterns({
      checkIns,
      exposures,
      today: '2026-08-31',
    })

    expect(result.primaryInsight).toBeNull()
    expect(result.patterns.every(pattern => pattern.status !== 'available')).toBe(true)
  })

  it('produces deterministic output for identical input and algorithm version', () => {
    const input = {
      checkIns: [
        buildCheckIn('2026-08-25', { headache: 2, dizziness: 1, concentration: 1 }),
        buildCheckIn('2026-08-26', { headache: 4, dizziness: 2, concentration: 2 }),
        buildCheckIn('2026-08-27', { headache: 3, dizziness: 1, concentration: 1 }),
        buildCheckIn('2026-08-28', { headache: 5, dizziness: 2, concentration: 2 }),
        buildCheckIn('2026-08-29', { headache: 4, dizziness: 2, concentration: 2 }),
      ],
      exposures: [
        buildExposure('2026-08-25', { sleepHours: 5 }),
        buildExposure('2026-08-26', { sleepHours: 5 }),
        buildExposure('2026-08-27', { sleepHours: 8 }),
        buildExposure('2026-08-28', { sleepHours: 5 }),
        buildExposure('2026-08-29', { sleepHours: 5 }),
      ],
      today: '2026-08-31',
    }

    const first = detectLongitudinalPatterns(input)
    const second = detectLongitudinalPatterns(input)

    expect(first).toEqual(second)
  })

  it('measures false-positive rate on null synthetic data below tolerance', () => {
    const datasets = Array.from({ length: 80 }, (_, index) =>
      generateNullSyntheticDataset(index + 1, 24, '2026-08-01')
    )

    const measurement = measureFalsePositiveRate(datasets, '2026-08-31')

    expect(measurement.totalDatasets).toBe(80)
    // Document measured rate; algorithm suppresses unstable findings below evidence threshold.
    expect(measurement.falsePositiveRate).toBeLessThan(0.45)
    expect(measurement.datasetsWithFalsePositive).toBeLessThan(measurement.totalDatasets)
  })

  it('never emits patterns below documented evidence threshold', () => {
    const result = detectLongitudinalPatterns({
      checkIns: [
        buildCheckIn('2026-08-28', { headache: 2, dizziness: 1, concentration: 1 }),
        buildCheckIn('2026-08-29', { headache: 2, dizziness: 1, concentration: 1 }),
        buildCheckIn('2026-08-30', { headache: 2, dizziness: 1, concentration: 1 }),
      ],
      exposures: [buildExposure('2026-08-29', { sleepHours: 5 })],
      today: '2026-08-31',
    })

    const available = result.patterns.filter(pattern => pattern.status === 'available')
    expect(available).toHaveLength(0)
    for (const pattern of result.patterns) {
      if (pattern.status === 'available') {
        expect(pattern.sampleCount).toBeGreaterThanOrEqual(
          PATTERN_EVIDENCE_THRESHOLDS.minimumCheckIns
        )
      }
    }
  })

  it('computes spearman correlation deterministically', () => {
    const pairs = [
      { x: 1, y: 2 },
      { x: 2, y: 4 },
      { x: 3, y: 6 },
      { x: 4, y: 8 },
      { x: 5, y: 10 },
    ]
    const rho = spearmanRankCorrelation(pairs)
    expect(rho).toBeCloseTo(1, 5)
  })

  it('stores algorithm version and input range on each pattern result', () => {
    const result = detectLongitudinalPatterns({
      checkIns: Array.from({ length: 6 }, (_, index) =>
        buildCheckIn(`2026-08-${String(20 + index).padStart(2, '0')}`, {
          headache: 2 + index,
          dizziness: 1,
          concentration: 1,
        })
      ),
      exposures: Array.from({ length: 6 }, (_, index) =>
        buildExposure(`2026-08-${String(20 + index).padStart(2, '0')}`, {
          screenMinutes: 60 + index * 30,
        })
      ),
      today: '2026-08-31',
    })

    for (const pattern of result.patterns) {
      expect(pattern.algorithmVersion).toBe(PATTERN_DETECTION_VERSION)
      if (pattern.inputDateRangeStart) {
        expect(pattern.inputDateRangeEnd).toBeTruthy()
      }
    }
  })
})
