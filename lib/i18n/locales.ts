/**
 * Locales and timezone support for CRI internationalization.
 */

export const SUPPORTED_LOCALES = ['en-US', 'en-GB', 'es-US', 'es-ES', 'fr-CA'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'
export const DEFAULT_TIMEZONE = 'America/New_York'

export interface LocaleConfig {
  code: SupportedLocale
  name: string
  dir: 'ltr' | 'rtl'
  dateFormat: string
}

export const LOCALE_CONFIGS: Record<SupportedLocale, LocaleConfig> = {
  'en-US': { code: 'en-US', name: 'English (US)', dir: 'ltr', dateFormat: 'MM/DD/YYYY' },
  'en-GB': { code: 'en-GB', name: 'English (UK)', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  'es-US': { code: 'es-US', name: 'Español (EE. UU.)', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  'es-ES': { code: 'es-ES', name: 'Español (España)', dir: 'ltr', dateFormat: 'DD/MM/YYYY' },
  'fr-CA': { code: 'fr-CA', name: 'Français (Canada)', dir: 'ltr', dateFormat: 'YYYY-MM-DD' },
}

/**
 * Normalizes a locale string to a supported locale, falling back to DEFAULT_LOCALE.
 */
export function normalizeLocale(locale?: string | null): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE
  const normalized = locale.trim().replace('_', '-')
  const exact = SUPPORTED_LOCALES.find(l => l.toLowerCase() === normalized.toLowerCase())
  if (exact) return exact

  // Match language prefix (e.g., 'es' -> 'es-US', 'fr' -> 'fr-CA')
  const prefix = normalized.split('-')[0]?.toLowerCase()
  if (prefix === 'es') return 'es-US'
  if (prefix === 'fr') return 'fr-CA'
  if (prefix === 'en') return 'en-US'

  return DEFAULT_LOCALE
}

/**
 * Resolves safe client timeZone, falling back to DEFAULT_TIMEZONE if invalid.
 */
export function resolveSafeTimeZone(timeZone?: string | null, fallback = DEFAULT_TIMEZONE): string {
  if (timeZone && timeZone.trim()) {
    try {
      // Test if Intl supports this timeZone
      new Intl.DateTimeFormat(undefined, { timeZone: timeZone.trim() })
      return timeZone.trim()
    } catch {
      return fallback
    }
  }

  try {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detected) return detected
  } catch {
    // ignore
  }

  return fallback
}
