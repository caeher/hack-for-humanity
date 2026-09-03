import { normalizeLocale, resolveSafeTimeZone } from './locales'

function parseDateInput(input: Date | number | string): Date {
  if (input instanceof Date) return input
  if (typeof input === 'number') return new Date(input)
  if (typeof input === 'string') {
    // If it's a date-only string like '2026-08-31', treat as UTC noon or parse safely
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [year, month, day] = input.split('-').map(Number)
      return new Date(Date.UTC(year!, month! - 1, day!, 12, 0, 0))
    }
    return new Date(input)
  }
  return new Date()
}

/**
 * Format a date string with customizable Intl options, locale, and timezone.
 */
export function formatDate(
  input: Date | number | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale?: string,
  timeZone?: string
): string {
  const date = parseDateInput(input)
  const resolvedLocale = normalizeLocale(locale)
  const resolvedTz = resolveSafeTimeZone(timeZone)

  return new Intl.DateTimeFormat(resolvedLocale, {
    timeZone: resolvedTz,
    ...options,
  }).format(date)
}

/**
 * Format a time string (e.g. "8:00 AM" or "08:00")
 */
export function formatTime(
  input: Date | number | string,
  options: Intl.DateTimeFormatOptions = { timeStyle: 'short' },
  locale?: string,
  timeZone?: string
): string {
  const date = parseDateInput(input)
  const resolvedLocale = normalizeLocale(locale)
  const resolvedTz = resolveSafeTimeZone(timeZone)

  return new Intl.DateTimeFormat(resolvedLocale, {
    timeZone: resolvedTz,
    ...options,
  }).format(date)
}

/**
 * Format a full combined date and time string.
 */
export function formatDateTime(
  input: Date | number | string,
  locale?: string,
  timeZone?: string
): string {
  return formatDate(
    input,
    { dateStyle: 'medium', timeStyle: 'short' },
    locale,
    timeZone
  )
}

/**
 * Format a date range label (e.g., "Aug 19, 2026 – Sep 2, 2026")
 */
export function formatDateRange(
  startInput: Date | number | string,
  endInput: Date | number | string,
  locale?: string,
  timeZone?: string
): string {
  const start = parseDateInput(startInput)
  const end = parseDateInput(endInput)
  const resolvedLocale = normalizeLocale(locale)
  const resolvedTz = resolveSafeTimeZone(timeZone)

  const dtf = new Intl.DateTimeFormat(resolvedLocale, {
    timeZone: resolvedTz,
    dateStyle: 'medium',
  })

  // Intl.DateTimeFormat.formatRange is available in modern JS/TS runtimes
  if (typeof dtf.formatRange === 'function') {
    try {
      return dtf.formatRange(start, end)
    } catch {
      // fallback if range fails
    }
  }

  return `${dtf.format(start)} – ${dtf.format(end)}`
}

/**
 * Format relative time (e.g., "in 3 days", "2 hours ago").
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale?: string
): string {
  const resolvedLocale = normalizeLocale(locale)
  try {
    const rtf = new Intl.RelativeTimeFormat(resolvedLocale, { numeric: 'auto' })
    return rtf.format(value, unit)
  } catch {
    return `${value} ${unit}`
  }
}

/**
 * Format localized numbers (e.g. 1,248 vs 1.248)
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locale?: string
): string {
  const resolvedLocale = normalizeLocale(locale)
  return new Intl.NumberFormat(resolvedLocale, options).format(value)
}

/**
 * Format localized percentage (e.g. 86.4% or 86,4%)
 */
export function formatPercent(
  value: number,
  locale?: string,
  decimalPlaces = 1
): string {
  const resolvedLocale = normalizeLocale(locale)
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value > 1 ? value / 100 : value)
}

/**
 * Format symptom score representation (e.g. "15 / 48")
 */
export function formatSymptomScore(
  score: number,
  max = 48,
  locale?: string
): string {
  return `${formatNumber(score, undefined, locale)} / ${formatNumber(max, undefined, locale)}`
}
