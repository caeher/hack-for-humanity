import type { TrendDirection } from './symptomMethodology'

export function formatGreetingDate(date = new Date(), timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function formatUpdatedAt(timestampMs: number, timeZone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestampMs))
}

export function formatEncounterDateTime(datetime: string): { date: string; time: string } {
  const [datePart, timePart] = datetime.split(' ')
  const [year, month, day] = datePart!.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year!, month! - 1, day!))
  const date = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(utcDate)
  return { date, time: timePart ?? '' }
}

export function formatSleepDuration(hours: number | null): string {
  if (hours === null) return '—'
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  if (minutes === 0) return `${wholeHours}h`
  return `${wholeHours}h ${minutes}m`
}

export function formatTrendStatusText(direction: TrendDirection | null, readiness: 'insufficient' | 'sufficient'): string {
  if (readiness !== 'sufficient' || !direction) {
    return 'Within-person comparison pending'
  }
  return `Descriptive trend: ${direction}`
}

export function formatTrendChangeText(
  readiness: 'insufficient' | 'sufficient',
  delta: number | null,
  windowDays: number
): string {
  if (readiness !== 'sufficient' || delta === null) {
    return 'Trend pending additional check-ins'
  }
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta} points in ${windowDays}-day window`
}

export function formatCheckInConsistencyValue(ratePercent: number | null): string {
  if (ratePercent === null) return '—'
  return `${ratePercent}%`
}

export interface TrendChartDatum {
  day: string
  symptomBurden: number
  headache?: number
}

export function mapChartPointsToTrendData(
  points: Array<{ dayLabel: string; symptomBurden: number; headache: number }>
): TrendChartDatum[] {
  return points.map(point => ({
    day: point.dayLabel,
    symptomBurden: point.symptomBurden,
    headache: point.headache,
  }))
}
