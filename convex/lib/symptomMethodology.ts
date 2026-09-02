/**
 * Convex copy of lib/symptomMethodology.ts — keep in sync when changing rules or version.
 */

export const SYMPTOM_METHODOLOGY_VERSION = '1.0.0' as const

export const SYMPTOM_DIMENSION_COUNT = 8
export const SYMPTOM_RATING_MIN = 0
export const SYMPTOM_RATING_MAX = 6
export const SYMPTOM_TOTAL_MAX = 48

export const SYMPTOM_DIMENSIONS = [
  { id: 'headache', label: 'Headache' },
  { id: 'dizziness', label: 'Dizziness' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'lightSensitivity', label: 'Light sensitivity' },
  { id: 'noiseSensitivity', label: 'Noise sensitivity' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'concentration', label: 'Concentration difficulty' },
  { id: 'sleepDifficulty', label: 'Sleep difficulty' },
] as const

export type SymptomDimensionId = (typeof SYMPTOM_DIMENSIONS)[number]['id']

export const SYMPTOM_DIMENSION_IDS: readonly SymptomDimensionId[] = SYMPTOM_DIMENSIONS.map(
  dimension => dimension.id
)

export const TREND_REQUIREMENTS = {
  minimumTotalEntries: 5,
  minimumConsecutiveDays: 3,
  defaultWindowDays: 7,
  stableThresholdPoints: 2,
  meaningfulChangePoints: 3,
} as const

export const METHODOLOGY_COPY = {
  metricName: 'Patient-Reported Symptom Total',
  metricShortName: 'symptom total',
  metricRange: '0–48',
  calculationRule:
    'Sum of eight patient-reported symptom ratings (0 = none, 6 = severe). Each dimension is rated independently; missing dimensions are excluded — never treated as zero.',
  notRecoveryScore:
    'This is a descriptive sum of self-reported symptoms. It is not a clinical recovery score, diagnosis, prognosis, recovery determination, or return-to-activity clearance.',
  withinPersonUse:
    'Compare totals only for the same person over time using complete check-ins. Do not rank individuals or infer percent recovered.',
  missingDataRule:
    'Days without a complete check-in remain blank. CRI does not interpolate, average, or impute missing symptom ratings.',
  trendDisclaimer:
    'Observed changes reflect patient-reported entries over time and do not establish medical causation, predict recovery, or clear return to activity.',
  insufficientTrendData:
    'Additional daily entries needed to identify trends. At least five complete check-ins, or three consecutive days with complete check-ins, are required.',
  noInterpolation:
    'Missing check-in days are shown as gaps without synthetic values.',
} as const

export type SymptomTotalStatus = 'complete' | 'partial' | 'empty'

export interface ContributingRating {
  dimensionId: SymptomDimensionId
  label: string
  rating: number
}

export interface SymptomTotalComputation {
  methodologyVersion: typeof SYMPTOM_METHODOLOGY_VERSION
  status: SymptomTotalStatus
  total: number | null
  answeredCount: number
  requiredCount: number
  maxPossibleForAnswered: number
  contributingRatings: ContributingRating[]
  rules: {
    missingHandling: 'excluded'
    persistedRequiresComplete: true
  }
}

export type TrendReadiness = 'insufficient' | 'sufficient'
export type TrendDirection = 'decreasing' | 'increasing' | 'stable' | 'mixed'

export interface CheckInDataPoint {
  date: string
  symptomTotal: number
}

export interface TrendSummary {
  methodologyVersion: typeof SYMPTOM_METHODOLOGY_VERSION
  readiness: TrendReadiness
  direction: TrendDirection | null
  windowDays: number
  dataPointsInWindow: number
  totalDataPoints: number
  hasConsecutiveStreak: boolean
  longestConsecutiveStreak: number
  earliestDate: string | null
  latestDate: string | null
  earliestTotal: number | null
  latestTotal: number | null
  delta: number | null
  summaryText: string
  disclaimerText: string
  insufficientReason: string | null
}

const dimensionLabelById = Object.fromEntries(
  SYMPTOM_DIMENSIONS.map(dimension => [dimension.id, dimension.label])
) as Record<SymptomDimensionId, string>

export function isValidSymptomRating(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= SYMPTOM_RATING_MIN &&
    value <= SYMPTOM_RATING_MAX
  )
}

export function computeSymptomTotalComputation(
  answers: Record<string, number>,
  requiredIds: readonly string[] = SYMPTOM_DIMENSION_IDS
): SymptomTotalComputation {
  const contributingRatings: ContributingRating[] = []

  for (const dimensionId of requiredIds) {
    const rating = answers[dimensionId]
    if (!isValidSymptomRating(rating)) continue
    contributingRatings.push({
      dimensionId: dimensionId as SymptomDimensionId,
      label: dimensionLabelById[dimensionId as SymptomDimensionId] ?? dimensionId,
      rating,
    })
  }

  const answeredCount = contributingRatings.length
  const requiredCount = requiredIds.length
  const total =
    answeredCount === 0
      ? null
      : contributingRatings.reduce((sum, entry) => sum + entry.rating, 0)

  let status: SymptomTotalStatus = 'empty'
  if (answeredCount > 0 && answeredCount < requiredCount) status = 'partial'
  if (answeredCount === requiredCount) status = 'complete'

  return {
    methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
    status,
    total,
    answeredCount,
    requiredCount,
    maxPossibleForAnswered: answeredCount * SYMPTOM_RATING_MAX,
    contributingRatings,
    rules: {
      missingHandling: 'excluded',
      persistedRequiresComplete: true,
    },
  }
}

export function isCompleteSymptomInventory(
  answers: Record<string, number>,
  requiredIds: readonly string[] = SYMPTOM_DIMENSION_IDS
): boolean {
  return computeSymptomTotalComputation(answers, requiredIds).status === 'complete'
}

function parseUtcDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: string, days: number): string {
  const parsed = parseUtcDate(date)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return formatUtcDate(parsed)
}

export function longestConsecutiveDayStreak(dates: string[]): number {
  if (dates.length === 0) return 0

  const uniqueSorted = [...new Set(dates)].sort()
  let longest = 1
  let current = 1

  for (let index = 1; index < uniqueSorted.length; index += 1) {
    const previous = parseUtcDate(uniqueSorted[index - 1])
    const currentDate = parseUtcDate(uniqueSorted[index])
    const diffDays = Math.round(
      (currentDate.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000)
    )

    if (diffDays === 1) {
      current += 1
      longest = Math.max(longest, current)
    } else if (diffDays > 1) {
      current = 1
    }
  }

  return longest
}

export function meetsTrendMinimumHistory(points: CheckInDataPoint[]): {
  met: boolean
  reason: string | null
  longestConsecutiveStreak: number
} {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const longestConsecutiveStreak = longestConsecutiveDayStreak(sorted.map(point => point.date))

  if (sorted.length >= TREND_REQUIREMENTS.minimumTotalEntries) {
    return { met: true, reason: null, longestConsecutiveStreak }
  }

  if (longestConsecutiveStreak >= TREND_REQUIREMENTS.minimumConsecutiveDays) {
    return { met: true, reason: null, longestConsecutiveStreak }
  }

  return {
    met: false,
    reason: METHODOLOGY_COPY.insufficientTrendData,
    longestConsecutiveStreak,
  }
}

function filterPointsToWindow(points: CheckInDataPoint[], windowDays: number): CheckInDataPoint[] {
  if (points.length === 0) return []

  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const latestDate = sorted[sorted.length - 1].date
  const windowStart = addUtcDays(latestDate, -(windowDays - 1))

  return sorted.filter(point => point.date >= windowStart && point.date <= latestDate)
}

function classifyDirection(delta: number): TrendDirection {
  const absDelta = Math.abs(delta)
  if (absDelta <= TREND_REQUIREMENTS.stableThresholdPoints) return 'stable'
  if (delta <= -TREND_REQUIREMENTS.meaningfulChangePoints) return 'decreasing'
  if (delta >= TREND_REQUIREMENTS.meaningfulChangePoints) return 'increasing'
  return 'mixed'
}

function buildTrendSummaryText(
  direction: TrendDirection,
  earliestDate: string,
  latestDate: string,
  earliestTotal: number,
  latestTotal: number,
  delta: number
): string {
  const absDelta = Math.abs(delta)

  switch (direction) {
    case 'decreasing':
      return `Patient-reported symptom total decreased by ${absDelta} points between ${earliestDate} and ${latestDate} (${earliestTotal} to ${latestTotal}). Lower totals reflect fewer reported symptoms in this sum.`
    case 'increasing':
      return `Patient-reported symptom total increased by ${absDelta} points between ${earliestDate} and ${latestDate} (${earliestTotal} to ${latestTotal}). This describes logged ratings only.`
    case 'stable':
      return `Patient-reported symptom total remained relatively stable between ${earliestDate} and ${latestDate} (within ${TREND_REQUIREMENTS.stableThresholdPoints} points: ${earliestTotal} to ${latestTotal}). Day-to-day variation is common.`
    case 'mixed':
      return `Patient-reported symptom total changed by ${delta >= 0 ? '+' : ''}${delta} points between ${earliestDate} and ${latestDate} (${earliestTotal} to ${latestTotal}). The change is smaller than the threshold for a directional label.`
    default: {
      const exhaustive: never = direction
      return exhaustive
    }
  }
}

export function computeDescriptiveTrend(
  points: CheckInDataPoint[],
  windowDays: number = TREND_REQUIREMENTS.defaultWindowDays
): TrendSummary {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const historyCheck = meetsTrendMinimumHistory(sorted)
  const windowPoints = filterPointsToWindow(sorted, windowDays)

  const base: TrendSummary = {
    methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
    readiness: 'insufficient',
    direction: null,
    windowDays,
    dataPointsInWindow: windowPoints.length,
    totalDataPoints: sorted.length,
    hasConsecutiveStreak:
      historyCheck.longestConsecutiveStreak >= TREND_REQUIREMENTS.minimumConsecutiveDays,
    longestConsecutiveStreak: historyCheck.longestConsecutiveStreak,
    earliestDate: null,
    latestDate: null,
    earliestTotal: null,
    latestTotal: null,
    delta: null,
    summaryText: historyCheck.reason ?? METHODOLOGY_COPY.insufficientTrendData,
    disclaimerText: METHODOLOGY_COPY.trendDisclaimer,
    insufficientReason: historyCheck.reason,
  }

  if (!historyCheck.met) {
    return base
  }

  if (windowPoints.length < 2) {
    return {
      ...base,
      insufficientReason:
        'At least two complete check-ins within the comparison window are required for a within-person trend.',
      summaryText:
        'At least two complete check-ins within the comparison window are required for a within-person trend.',
    }
  }

  const earliest = windowPoints[0]
  const latest = windowPoints[windowPoints.length - 1]
  const delta = latest.symptomTotal - earliest.symptomTotal
  const direction = classifyDirection(delta)

  return {
    ...base,
    readiness: 'sufficient',
    direction,
    earliestDate: earliest.date,
    latestDate: latest.date,
    earliestTotal: earliest.symptomTotal,
    latestTotal: latest.symptomTotal,
    delta,
    summaryText: buildTrendSummaryText(
      direction,
      earliest.date,
      latest.date,
      earliest.symptomTotal,
      latest.symptomTotal,
      delta
    ),
    insufficientReason: null,
  }
}
