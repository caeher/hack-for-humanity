import type { Doc } from '../_generated/dataModel'

/** Corrections allowed within 72 hours of the original submission. */
export const CHECK_IN_CORRECTION_WINDOW_MS = 72 * 60 * 60 * 1000

export function parseIsoDate(date: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) {
    throw new Error(`Invalid ISO date: ${date}`)
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function addDaysToIsoDate(date: string, deltaDays: number): string {
  const { year, month, day } = parseIsoDate(date)
  const utc = new Date(Date.UTC(year, month - 1, day))
  utc.setUTCDate(utc.getUTCDate() + deltaDays)
  return formatIsoDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate())
}

export function compareIsoDates(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function clampIsoDate(date: string, min: string, max: string): string {
  if (compareIsoDates(date, min) < 0) return min
  if (compareIsoDates(date, max) > 0) return max
  return date
}

export function buildDescendingDatePage(args: {
  startDate: string
  endDate: string
  cursor: string | null
  numItems: number
}): { dates: string[]; continueCursor: string | null; isDone: boolean } {
  const { startDate, endDate, numItems } = args
  let current = args.cursor ? addDaysToIsoDate(args.cursor, -1) : endDate

  if (compareIsoDates(current, endDate) > 0) {
    current = endDate
  }

  const dates: string[] = []
  while (dates.length < numItems && compareIsoDates(current, startDate) >= 0) {
    dates.push(current)
    current = addDaysToIsoDate(current, -1)
  }

  const isDone = compareIsoDates(current, startDate) < 0
  const continueCursor = isDone || dates.length === 0 ? null : dates[dates.length - 1]!

  return { dates, continueCursor, isDone }
}

export function resolveEpisodeEndDate(
  episode: Doc<'recoveryEpisodes'>,
  today: string
): string {
  if (episode.closedAt) {
    const closedDate = formatIsoDate(
      new Date(episode.closedAt).getUTCFullYear(),
      new Date(episode.closedAt).getUTCMonth() + 1,
      new Date(episode.closedAt).getUTCDate()
    )
    return compareIsoDates(closedDate, today) < 0 ? closedDate : today
  }
  return today
}

export function isWithinCorrectionWindow(submittedAt: number, now: number): boolean {
  return now - submittedAt <= CHECK_IN_CORRECTION_WINDOW_MS
}

export function deriveCheckInCompleteness(checkIn: Doc<'checkIns'>): 'complete' | 'partial' {
  const symptomValues = Object.values(checkIn.symptoms)
  const allRated = symptomValues.every(value => value >= 0 && value <= 6)
  const impactProvided = checkIn.activityImpact !== 'none'
  return allRated && impactProvided ? 'complete' : 'partial'
}
