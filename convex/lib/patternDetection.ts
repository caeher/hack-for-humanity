/**
 * Transparent longitudinal pattern detection for symptom–exposure associations.
 * Deterministic statistical methods only — no ML black boxes.
 *
 * Language contract: outputs describe temporal associations, never causation.
 */

import { addDaysToIsoDate, compareIsoDates } from './checkInHistoryLogic'
import { TREND_REQUIREMENTS } from './symptomMethodology'

export const PATTERN_DETECTION_VERSION = '1.0.0' as const

export const PATTERN_EVIDENCE_THRESHOLDS = {
  /** Minimum complete check-ins before any pattern is considered. */
  minimumCheckIns: TREND_REQUIREMENTS.minimumTotalEntries,
  /** Minimum paired observations for correlation-based patterns. */
  minimumPairedObservations: 7,
  /** Minimum absolute matches for threshold/lag patterns. */
  minimumMatchCount: 2,
  /** Minimum exposure events for threshold patterns. */
  minimumExposureEvents: 3,
  /** Minimum share of eligible events that must match to emit a pattern. */
  minimumMatchRatio: 0.5,
  /** Below this ratio findings are suppressed as unstable. */
  suppressionMatchRatio: 0.45,
  /** Minimum absolute Spearman rho to emit a correlation-based pattern. */
  minimumAbsCorrelation: 0.75,
  /** Below this |rho| correlation findings are suppressed as unstable. */
  suppressionAbsCorrelation: 0.55,
  /** Analysis window in days (rolling). */
  analysisWindowDays: 30,
  /** Short sleep threshold in hours. */
  shortSleepHours: 7,
  /** High screen time threshold in minutes. */
  highScreenMinutes: 120,
  /** High physical exertion score threshold (0–10 scale). */
  highPhysicalExertionScore: 6,
  /** High cognitive load threshold in minutes. */
  highCognitiveMinutes: 90,
  /** Low physical exertion score for inverse patterns. */
  lowPhysicalExertionScore: 3,
} as const

export const NON_CAUSAL_DISCLAIMER =
  'Observed patterns reflect temporal associations in patient-reported entries and do not establish medical causation.'

export type PatternType =
  | 'short_sleep_lagged_headache'
  | 'high_screen_same_day_headache'
  | 'high_physical_same_day_symptoms'
  | 'high_cognitive_concentration'
  | 'lower_physical_lower_dizziness'

export type PatternStatus = 'available' | 'insufficient' | 'suppressed'

export type EffectDirection = 'positive' | 'negative' | 'mixed'

export type ConfidenceLevel = 'low' | 'moderate' | 'high'

export interface CheckInObservation {
  date: string
  symptomTotal: number
  symptoms: {
    headache: number
    dizziness: number
    concentration: number
  }
}

export interface ExposureObservation {
  date: string
  sleepHours: number
  screenMinutes: number
  physicalExertionScore: number
  cognitiveMinutes: number
}

export interface PatternEvidence {
  patternType: PatternType
  status: PatternStatus
  effectDirection: EffectDirection | null
  strength: number | null
  confidence: ConfidenceLevel | null
  sampleCount: number
  matchCount: number
  inputDateRangeStart: string | null
  inputDateRangeEnd: string | null
  algorithmVersion: string
  title: string
  description: string
  footer: string
  suppressedReason: string | null
}

export interface PatternDetectionInput {
  checkIns: CheckInObservation[]
  exposures: ExposureObservation[]
  today: string
  windowDays?: number
}

export interface PatternDetectionResult {
  algorithmVersion: string
  patterns: PatternEvidence[]
  primaryInsight: PatternEvidence | null
  checkInCount: number
  exposureCount: number
  computedAt: string
}

interface PairedPoint {
  date: string
  exposure: number
  outcome: number
}

function filterByWindow<T extends { date: string }>(
  records: T[],
  today: string,
  windowDays: number
): T[] {
  const windowStart = addDaysToIsoDate(today, -(windowDays - 1))
  return records.filter(
    record =>
      compareIsoDates(record.date, windowStart) >= 0 &&
      compareIsoDates(record.date, today) <= 0
  )
}

function resolveDateRange(dates: string[]): { start: string | null; end: string | null } {
  if (dates.length === 0) return { start: null, end: null }
  const sorted = [...dates].sort(compareIsoDates)
  return { start: sorted[0] ?? null, end: sorted[sorted.length - 1] ?? null }
}

/** Deterministic Spearman rank correlation for paired numeric observations. */
export function spearmanRankCorrelation(pairs: Array<{ x: number; y: number }>): number | null {
  const n = pairs.length
  if (n < 2) return null

  const rank = (values: number[]): number[] => {
    const indexed = values.map((value, index) => ({ value, index }))
    indexed.sort((a, b) => a.value - b.value || a.index - b.index)
    const ranks = new Array<number>(values.length)
    let i = 0
    while (i < indexed.length) {
      let j = i
      while (j + 1 < indexed.length && indexed[j + 1]!.value === indexed[i]!.value) {
        j += 1
      }
      const avgRank = (i + j + 2) / 2
      for (let k = i; k <= j; k += 1) {
        ranks[indexed[k]!.index] = avgRank
      }
      i = j + 1
    }
    return ranks
  }

  const xs = pairs.map(pair => pair.x)
  const ys = pairs.map(pair => pair.y)
  const xRanks = rank(xs)
  const yRanks = rank(ys)

  const meanX = xRanks.reduce((sum, value) => sum + value, 0) / n
  const meanY = yRanks.reduce((sum, value) => sum + value, 0) / n

  let numerator = 0
  let denomX = 0
  let denomY = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xRanks[i]! - meanX
    const dy = yRanks[i]! - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denominator = Math.sqrt(denomX * denomY)
  if (denominator === 0) return null
  return numerator / denominator
}

function classifyConfidence(matchRatio: number, sampleCount: number): ConfidenceLevel {
  if (matchRatio >= 0.6 && sampleCount >= 7) return 'high'
  if (matchRatio >= 0.4 && sampleCount >= 5) return 'moderate'
  return 'low'
}

function classifyCorrelationConfidence(rho: number, sampleCount: number): ConfidenceLevel {
  const absRho = Math.abs(rho)
  if (absRho >= 0.7 && sampleCount >= 7) return 'high'
  if (absRho >= 0.5 && sampleCount >= 5) return 'moderate'
  return 'low'
}

function buildFooter(checkInCount: number, dateRange: { start: string | null; end: string | null }): string {
  const range =
    dateRange.start && dateRange.end
      ? `${dateRange.start}–${dateRange.end}`
      : 'no date range'
  return `BASED ON ${checkInCount} CHECK-INS · ${range} · ALGORITHM v${PATTERN_DETECTION_VERSION} · LIVE DATA`
}

function buildInsufficientPattern(
  patternType: PatternType,
  title: string,
  description: string,
  checkInCount: number,
  sampleCount: number,
  dateRange: { start: string | null; end: string | null }
): PatternEvidence {
  return {
    patternType,
    status: 'insufficient',
    effectDirection: null,
    strength: null,
    confidence: null,
    sampleCount,
    matchCount: 0,
    inputDateRangeStart: dateRange.start,
    inputDateRangeEnd: dateRange.end,
    algorithmVersion: PATTERN_DETECTION_VERSION,
    title,
    description,
    footer: buildFooter(checkInCount, dateRange),
    suppressedReason: null,
  }
}

function detectShortSleepLaggedHeadache(
  checkIns: CheckInObservation[],
  exposures: ExposureObservation[],
  today: string,
  checkInCount: number
): PatternEvidence {
  const patternType: PatternType = 'short_sleep_lagged_headache'
  const checkInsByDate = new Map(checkIns.map(entry => [entry.date, entry]))
  const sortedExposures = [...exposures].sort((a, b) => compareIsoDates(a.date, b.date))
  const matchedDates: string[] = []
  let nightsUnderSeven = 0

  for (const exposure of sortedExposures) {
    if (exposure.sleepHours <= 0 || exposure.sleepHours >= PATTERN_EVIDENCE_THRESHOLDS.shortSleepHours) {
      continue
    }
    nightsUnderSeven += 1
    const nextDate = addDaysToIsoDate(exposure.date, 1)
    if (compareIsoDates(nextDate, today) > 0) continue
    const nextCheckIn = checkInsByDate.get(nextDate)
    const sameDayCheckIn = checkInsByDate.get(exposure.date)
    if (
      nextCheckIn &&
      sameDayCheckIn &&
      nextCheckIn.symptoms.headache > sameDayCheckIn.symptoms.headache
    ) {
      matchedDates.push(exposure.date)
    }
  }

  const dateRange = resolveDateRange(matchedDates.length > 0 ? matchedDates : sortedExposures.map(e => e.date))

  if (checkInCount < PATTERN_EVIDENCE_THRESHOLDS.minimumCheckIns) {
    return buildInsufficientPattern(
      patternType,
      'More check-ins needed for pattern observations',
      'CRI needs additional complete check-ins and sleep context before describing temporal associations between sleep and headache ratings.',
      checkInCount,
      checkInCount,
      dateRange
    )
  }

  if (nightsUnderSeven < PATTERN_EVIDENCE_THRESHOLDS.minimumExposureEvents) {
    return buildInsufficientPattern(
      patternType,
      'Insufficient short-sleep nights logged',
      'Additional sleep context entries are needed before assessing temporal associations with headache ratings.',
      checkInCount,
      nightsUnderSeven,
      dateRange
    )
  }

  const matchCount = matchedDates.length
  const matchRatio = nightsUnderSeven > 0 ? matchCount / nightsUnderSeven : 0

  if (matchRatio < PATTERN_EVIDENCE_THRESHOLDS.suppressionMatchRatio) {
    return {
      patternType,
      status: 'suppressed',
      effectDirection: null,
      strength: matchRatio,
      confidence: null,
      sampleCount: nightsUnderSeven,
      matchCount,
      inputDateRangeStart: dateRange.start,
      inputDateRangeEnd: dateRange.end,
      algorithmVersion: PATTERN_DETECTION_VERSION,
      title: 'No consistent sleep–headache association yet',
      description:
        'Recent entries do not show a repeatable temporal association between shorter sleep and higher headache ratings.',
      footer: buildFooter(checkInCount, dateRange),
      suppressedReason: 'Match ratio below stability threshold',
    }
  }

  if (matchCount < PATTERN_EVIDENCE_THRESHOLDS.minimumMatchCount) {
    return buildInsufficientPattern(
      patternType,
      'No consistent sleep–headache association yet',
      'Recent entries do not show a repeatable temporal association between shorter sleep and higher headache ratings.',
      checkInCount,
      nightsUnderSeven,
      dateRange
    )
  }

  const confidence = classifyConfidence(matchRatio, nightsUnderSeven)
  return {
    patternType,
    status: 'available',
    effectDirection: 'positive',
    strength: matchRatio,
    confidence,
    sampleCount: nightsUnderSeven,
    matchCount,
    inputDateRangeStart: dateRange.start,
    inputDateRangeEnd: dateRange.end,
    algorithmVersion: PATTERN_DETECTION_VERSION,
    title: 'Shorter sleep observed alongside higher next-day headache ratings',
    description: `On ${matchCount} of ${nightsUnderSeven} nights with less than ${PATTERN_EVIDENCE_THRESHOLDS.shortSleepHours} hours of sleep, the next check-in included a higher headache rating than the same day. ${NON_CAUSAL_DISCLAIMER}`,
    footer: buildFooter(checkInCount, dateRange),
    suppressedReason: null,
  }
}

function buildCorrelationPattern(args: {
  patternType: PatternType
  pairs: PairedPoint[]
  checkInCount: number
  exposureLabel: string
  outcomeLabel: string
  insufficientTitle: string
  insufficientDescription: string
  availableTitle: string
  minAbsRho?: number
}): PatternEvidence {
  const {
    patternType,
    pairs,
    checkInCount,
    exposureLabel,
    outcomeLabel,
    insufficientTitle,
    insufficientDescription,
    availableTitle,
    minAbsRho = PATTERN_EVIDENCE_THRESHOLDS.minimumAbsCorrelation,
  } = args

  const dates = pairs.map(pair => pair.date)
  const dateRange = resolveDateRange(dates)

  if (checkInCount < PATTERN_EVIDENCE_THRESHOLDS.minimumCheckIns) {
    return buildInsufficientPattern(
      patternType,
      'More check-ins needed for pattern observations',
      'CRI needs additional complete check-ins before describing temporal associations between daily exposures and symptom ratings.',
      checkInCount,
      pairs.length,
      dateRange
    )
  }

  if (pairs.length < PATTERN_EVIDENCE_THRESHOLDS.minimumPairedObservations) {
    return buildInsufficientPattern(
      patternType,
      insufficientTitle,
      insufficientDescription,
      checkInCount,
      pairs.length,
      dateRange
    )
  }

  const rho =
    spearmanRankCorrelation(pairs.map(pair => ({ x: pair.exposure, y: pair.outcome }))) ?? 0
  const absRho = Math.abs(rho)

  if (absRho < PATTERN_EVIDENCE_THRESHOLDS.suppressionAbsCorrelation) {
    return {
      patternType,
      status: 'suppressed',
      effectDirection: null,
      strength: rho,
      confidence: null,
      sampleCount: pairs.length,
      matchCount: 0,
      inputDateRangeStart: dateRange.start,
      inputDateRangeEnd: dateRange.end,
      algorithmVersion: PATTERN_DETECTION_VERSION,
      title: insufficientTitle,
      description: `Logged ${exposureLabel} and ${outcomeLabel} entries do not show a stable association in the current window. ${NON_CAUSAL_DISCLAIMER}`,
      footer: buildFooter(checkInCount, dateRange),
      suppressedReason: 'Correlation below stability threshold',
    }
  }

  if (absRho < minAbsRho) {
    return buildInsufficientPattern(
      patternType,
      insufficientTitle,
      `Logged ${exposureLabel} and ${outcomeLabel} entries do not show a consistent temporal association in the current window.`,
      checkInCount,
      pairs.length,
      dateRange
    )
  }

  const effectDirection: EffectDirection = rho > 0 ? 'positive' : rho < 0 ? 'negative' : 'mixed'
  const confidence = classifyCorrelationConfidence(rho, pairs.length)
  const directionPhrase =
    effectDirection === 'positive'
      ? 'higher values appeared together'
      : effectDirection === 'negative'
        ? 'lower exposure days were observed alongside lower symptom ratings'
        : 'values showed a mixed association'

  return {
    patternType,
    status: 'available',
    effectDirection,
    strength: rho,
    confidence,
    sampleCount: pairs.length,
    matchCount: pairs.length,
    inputDateRangeStart: dateRange.start,
    inputDateRangeEnd: dateRange.end,
    algorithmVersion: PATTERN_DETECTION_VERSION,
    title: availableTitle,
    description: `Across ${pairs.length} days with both ${exposureLabel} and ${outcomeLabel} logged, ${directionPhrase} (rank association ${rho.toFixed(2)}). ${NON_CAUSAL_DISCLAIMER}`,
    footer: buildFooter(checkInCount, dateRange),
    suppressedReason: null,
  }
}

function pairSameDayExposureSymptom(
  checkIns: CheckInObservation[],
  exposures: ExposureObservation[],
  exposureSelector: (exposure: ExposureObservation) => number | null,
  outcomeSelector: (checkIn: CheckInObservation) => number
): PairedPoint[] {
  const checkInsByDate = new Map(checkIns.map(entry => [entry.date, entry]))
  const pairs: PairedPoint[] = []

  for (const exposure of exposures) {
    const exposureValue = exposureSelector(exposure)
    if (exposureValue === null || exposureValue < 0) continue
    const checkIn = checkInsByDate.get(exposure.date)
    if (!checkIn) continue
    pairs.push({
      date: exposure.date,
      exposure: exposureValue,
      outcome: outcomeSelector(checkIn),
    })
  }

  return pairs.sort((a, b) => compareIsoDates(a.date, b.date))
}

function detectHighScreenHeadache(
  checkIns: CheckInObservation[],
  exposures: ExposureObservation[],
  checkInCount: number
): PatternEvidence {
  const pairs = pairSameDayExposureSymptom(
    checkIns,
    exposures,
    exposure => (exposure.screenMinutes > 0 ? exposure.screenMinutes : null),
    checkIn => checkIn.symptoms.headache
  )

  return buildCorrelationPattern({
    patternType: 'high_screen_same_day_headache',
    pairs,
    checkInCount,
    exposureLabel: 'screen time',
    outcomeLabel: 'headache ratings',
    insufficientTitle: 'No consistent screen–headache association yet',
    insufficientDescription:
      'Additional days with both screen time and headache ratings are needed before assessing temporal associations.',
    availableTitle: 'Higher screen time observed alongside higher headache ratings',
  })
}

function detectHighPhysicalSymptoms(
  checkIns: CheckInObservation[],
  exposures: ExposureObservation[],
  checkInCount: number
): PatternEvidence {
  const pairs = pairSameDayExposureSymptom(
    checkIns,
    exposures,
    exposure => (exposure.physicalExertionScore > 0 ? exposure.physicalExertionScore : null),
    checkIn => checkIn.symptomTotal
  )

  return buildCorrelationPattern({
    patternType: 'high_physical_same_day_symptoms',
    pairs,
    checkInCount,
    exposureLabel: 'physical exertion',
    outcomeLabel: 'symptom totals',
    insufficientTitle: 'No consistent exertion–symptom association yet',
    insufficientDescription:
      'Additional days with both physical exertion and symptom totals are needed before assessing temporal associations.',
    availableTitle: 'Higher physical exertion observed alongside higher symptom totals',
  })
}

function detectHighCognitiveConcentration(
  checkIns: CheckInObservation[],
  exposures: ExposureObservation[],
  checkInCount: number
): PatternEvidence {
  const pairs = pairSameDayExposureSymptom(
    checkIns,
    exposures,
    exposure => (exposure.cognitiveMinutes > 0 ? exposure.cognitiveMinutes : null),
    checkIn => checkIn.symptoms.concentration
  )

  return buildCorrelationPattern({
    patternType: 'high_cognitive_concentration',
    pairs,
    checkInCount,
    exposureLabel: 'cognitive load',
    outcomeLabel: 'concentration difficulty ratings',
    insufficientTitle: 'No consistent cognitive load–concentration association yet',
    insufficientDescription:
      'Additional days with both cognitive load and concentration ratings are needed before assessing temporal associations.',
    availableTitle:
      'Higher cognitive load observed alongside higher concentration difficulty ratings',
  })
}

function detectLowerPhysicalLowerDizziness(
  checkIns: CheckInObservation[],
  exposures: ExposureObservation[],
  checkInCount: number
): PatternEvidence {
  const pairs = pairSameDayExposureSymptom(
    checkIns,
    exposures,
    exposure => (exposure.physicalExertionScore >= 0 ? exposure.physicalExertionScore : null),
    checkIn => checkIn.symptoms.dizziness
  )

  return buildCorrelationPattern({
    patternType: 'lower_physical_lower_dizziness',
    pairs,
    checkInCount,
    exposureLabel: 'physical exertion',
    outcomeLabel: 'dizziness ratings',
    insufficientTitle: 'No consistent activity–dizziness association yet',
    insufficientDescription:
      'Additional days with both physical activity and dizziness ratings are needed before assessing temporal associations.',
    availableTitle: 'Lower physical activity observed alongside lower dizziness ratings',
  })
}

/**
 * Runs all candidate pattern detectors and returns only patterns that meet
 * the documented evidence threshold (available status).
 */
export function detectLongitudinalPatterns(input: PatternDetectionInput): PatternDetectionResult {
  const windowDays = input.windowDays ?? PATTERN_EVIDENCE_THRESHOLDS.analysisWindowDays
  const checkIns = filterByWindow(input.checkIns, input.today, windowDays)
  const exposures = filterByWindow(input.exposures, input.today, windowDays)

  const patterns: PatternEvidence[] = [
    detectShortSleepLaggedHeadache(checkIns, exposures, input.today, checkIns.length),
    detectHighScreenHeadache(checkIns, exposures, checkIns.length),
    detectHighPhysicalSymptoms(checkIns, exposures, checkIns.length),
    detectHighCognitiveConcentration(checkIns, exposures, checkIns.length),
    detectLowerPhysicalLowerDizziness(checkIns, exposures, checkIns.length),
  ]

  const availablePatterns = patterns.filter(pattern => pattern.status === 'available')
  const primaryInsight =
    availablePatterns.sort((a, b) => {
      const confidenceRank: Record<ConfidenceLevel, number> = { high: 3, moderate: 2, low: 1 }
      const aRank = a.confidence ? confidenceRank[a.confidence] : 0
      const bRank = b.confidence ? confidenceRank[b.confidence] : 0
      return bRank - aRank || (b.strength ?? 0) - (a.strength ?? 0)
    })[0] ?? null

  return {
    algorithmVersion: PATTERN_DETECTION_VERSION,
    patterns,
    primaryInsight,
    checkInCount: checkIns.length,
    exposureCount: exposures.length,
    computedAt: input.today,
  }
}

/**
 * Maps the primary pattern insight to the legacy dashboard insight shape.
 */
export function toDashboardInsight(
  result: PatternDetectionResult
): {
  status: 'available' | 'insufficient'
  title: string
  description: string
  footer: string
  generatedAt: string | null
  sourceRecordCount: number
} {
  const primary = result.primaryInsight
  if (!primary) {
    const fallback =
      result.patterns.find(pattern => pattern.status === 'insufficient') ??
      result.patterns[0]
    if (!fallback) {
      return {
        status: 'insufficient',
        title: 'More check-ins needed for pattern observations',
        description:
          'CRI needs additional complete check-ins before describing temporal associations in your recovery data.',
        footer: `BASED ON ${result.checkInCount} CHECK-INS · LIVE DATA`,
        generatedAt: result.computedAt,
        sourceRecordCount: result.checkInCount,
      }
    }
    return {
      status: 'insufficient',
      title: fallback.title,
      description: fallback.description,
      footer: fallback.footer,
      generatedAt: result.computedAt,
      sourceRecordCount: result.checkInCount,
    }
  }

  return {
    status: 'available',
    title: primary.title,
    description: primary.description,
    footer: primary.footer,
    generatedAt: result.computedAt,
    sourceRecordCount: result.checkInCount,
  }
}

/**
 * Measures false-positive rate on null synthetic data where exposures and
 * symptoms are independently generated. Used for algorithm validation.
 */
export function measureFalsePositiveRate(
  datasets: Array<{ checkIns: CheckInObservation[]; exposures: ExposureObservation[] }>,
  today: string
): { falsePositiveRate: number; datasetsWithFalsePositive: number; totalDatasets: number } {
  let falsePositives = 0
  for (const dataset of datasets) {
    const result = detectLongitudinalPatterns({
      checkIns: dataset.checkIns,
      exposures: dataset.exposures,
      today,
    })
    if (result.patterns.some(pattern => pattern.status === 'available')) {
      falsePositives += 1
    }
  }
  return {
    falsePositiveRate: datasets.length > 0 ? falsePositives / datasets.length : 0,
    datasetsWithFalsePositive: falsePositives,
    totalDatasets: datasets.length,
  }
}

/**
 * Deterministic seeded pseudo-random for synthetic null-data generation.
 */
export function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export function generateNullSyntheticDataset(
  seed: number,
  dayCount: number,
  startDate: string
): { checkIns: CheckInObservation[]; exposures: ExposureObservation[] } {
  const random = seededRandom(seed)
  const checkIns: CheckInObservation[] = []
  const exposures: ExposureObservation[] = []

  for (let day = 0; day < dayCount; day += 1) {
    const date = addDaysToIsoDate(startDate, day)
    const headache = Math.floor(random() * 7)
    const dizziness = Math.floor(random() * 7)
    const concentration = Math.floor(random() * 7)
    checkIns.push({
      date,
      symptomTotal: headache + dizziness + concentration + Math.floor(random() * 15),
      symptoms: { headache, dizziness, concentration },
    })
    exposures.push({
      date,
      sleepHours: 4 + random() * 6,
      screenMinutes: Math.floor(random() * 300),
      physicalExertionScore: Math.floor(random() * 10),
      cognitiveMinutes: Math.floor(random() * 240),
    })
  }

  return { checkIns, exposures }
}
