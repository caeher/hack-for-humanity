import { describe, expect, it } from 'vitest'
import {
  buildPatternInsightProvenance,
  buildSymptomTotalProvenanceFromAnswers,
  buildTrendProvenance,
  formatDateRangeLabel,
  formatProvenanceConfidence,
  mapPatternConfidence,
} from '@/lib/provenance'
import { computeDescriptiveTrend, SYMPTOM_METHODOLOGY_VERSION } from '@/lib/symptomMethodology'

const completeInventory = {
  headache: 2,
  dizziness: 1,
  nausea: 0,
  lightSensitivity: 1,
  noiseSensitivity: 0,
  fatigue: 3,
  concentration: 2,
  sleepDifficulty: 1,
}

describe('provenance builders', () => {
  it('builds symptom total provenance with eight contributing categories', () => {
    const provenance = buildSymptomTotalProvenanceFromAnswers({
      answers: completeInventory,
      checkInDate: '2026-09-01',
      checkInId: 'check_in_1',
    })

    expect(provenance.sourceKind).toBe('symptom_total')
    expect(provenance.contributingCategories).toHaveLength(8)
    expect(provenance.plainLanguageRationale).toMatch(/eight independent ratings/i)
    expect(provenance.nonDiagnosticDisclaimer).toMatch(/not a diagnosis/i)
    expect(provenance.methodVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
  })

  it('marks amended totals and hides private notes for caregivers', () => {
    const provenance = buildSymptomTotalProvenanceFromAnswers({
      answers: completeInventory,
      recomputedFromAmendment: true,
      amendmentNote: 'Corrected headache rating',
      viewer: { canViewPrivateNotes: false },
    })

    expect(provenance.recomputedFromAmendment).toBe(true)
    expect(provenance.amendmentNote).toBe('Corrected headache rating')
    expect(provenance.restrictedDetailCount).toBe(1)
  })

  it('builds trend provenance linked to source dates and method version', () => {
    const trend = computeDescriptiveTrend([
      { date: '2026-08-25', symptomTotal: 24 },
      { date: '2026-08-26', symptomTotal: 22 },
      { date: '2026-08-27', symptomTotal: 20 },
      { date: '2026-08-28', symptomTotal: 18 },
      { date: '2026-08-29', symptomTotal: 16 },
    ])

    const provenance = buildTrendProvenance({
      trend,
      sourceCheckInDates: ['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29'],
    })

    expect(provenance.sourceKind).toBe('computed_trend')
    expect(provenance.dateRangeStart).toBe(trend.earliestDate)
    expect(provenance.methodVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
    expect(provenance.sourceRecords.length).toBeGreaterThan(0)
  })

  it('maps pattern confidence to plain-language insufficient state', () => {
    expect(mapPatternConfidence(null, 'insufficient')).toBe('insufficient')
    expect(formatProvenanceConfidence('insufficient')).toMatch(/not enough data/i)

    const provenance = buildPatternInsightProvenance({
      title: 'Test pattern',
      description: 'Example association',
      patternType: 'high_screen_same_day_headache',
      status: 'available',
      confidence: 'moderate',
      sampleCount: 8,
      matchCount: 5,
      inputDateRangeStart: '2026-08-01',
      inputDateRangeEnd: '2026-08-30',
      algorithmVersion: '1.0.0',
      effectDirection: 'positive',
      checkInCount: 12,
      exposureCount: 10,
    })

    expect(provenance.confidence).toBe('moderate')
    expect(provenance.dateRangeStart).toBe('2026-08-01')
    expect(provenance.evidenceReferences[0]?.version).toBe('1.0.0')
  })

  it('formats single-day and ranged date labels', () => {
    expect(formatDateRangeLabel('2026-09-01', '2026-09-01')).toBe('2026-09-01')
    expect(formatDateRangeLabel('2026-08-01', '2026-08-30')).toBe('2026-08-01 – 2026-08-30')
  })
})
