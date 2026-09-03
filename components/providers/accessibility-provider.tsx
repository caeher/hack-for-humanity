'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  normalizeLocale,
  resolveSafeTimeZone,
  SupportedLocale,
} from '@/lib/i18n/locales'
import { isE2ETestMode } from '@/lib/e2e'

export interface AccessibilityPreferences {
  largeText: boolean
  highContrast: boolean
  reducedMotion: boolean
  locale: SupportedLocale
  timeZone: string
}

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
  locale: DEFAULT_LOCALE,
  timeZone: DEFAULT_TIMEZONE,
}

const STORAGE_KEY = 'cri_accessibility_preferences_v1'

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences
  updatePreferences: (updates: Partial<AccessibilityPreferences>) => Promise<void>
  resetPreferences: () => void
  isLoaded: boolean
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

function applyAttributesToDocument(prefs: AccessibilityPreferences) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  root.dataset.largeText = String(prefs.largeText)
  root.dataset.highContrast = String(prefs.highContrast)
  root.dataset.reducedMotion = String(prefs.reducedMotion)
  root.lang = prefs.locale
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            largeText: Boolean(parsed.largeText),
            highContrast: Boolean(parsed.highContrast),
            reducedMotion: Boolean(parsed.reducedMotion),
            locale: normalizeLocale(parsed.locale),
            timeZone: resolveSafeTimeZone(parsed.timeZone),
          }
        }
      } catch {
        // Fallback
      }
    }
    return DEFAULT_ACCESSIBILITY_PREFS
  })

  const [isLoaded, setIsLoaded] = useState(false)

  // Query patient if in authenticated mode
  const patient = useQuery(
    api.patients.getMePatient,
    isE2ETestMode ? 'skip' : {}
  )
  const convexPrefs = useQuery(
    api.profilePreferences.getForPatient,
    patient?._id && !isE2ETestMode ? { patientId: patient._id } : 'skip'
  )
  const updateConvexMutation = useMutation(api.profilePreferences.updateForPatient)

  // Initialize system preferences (reduced motion detection) if not set in storage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const hasStored = localStorage.getItem(STORAGE_KEY)
      if (!hasStored) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const detectedTz = resolveSafeTimeZone()
        const detectedLocale = normalizeLocale(navigator.language)

        setPreferences(prev => {
          const next: AccessibilityPreferences = {
            ...prev,
            reducedMotion: prefersReducedMotion,
            timeZone: detectedTz,
            locale: detectedLocale,
          }
          applyAttributesToDocument(next)
          return next
        })
      } else {
        applyAttributesToDocument(preferences)
      }
    } catch {
      applyAttributesToDocument(preferences)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Sync with Convex preferences when patient logs in
  useEffect(() => {
    if (!convexPrefs || !convexPrefs.accessibilityPreferences) return

    const incoming: AccessibilityPreferences = {
      largeText: convexPrefs.accessibilityPreferences.largeText,
      highContrast: convexPrefs.accessibilityPreferences.highContrast,
      reducedMotion: convexPrefs.accessibilityPreferences.reducedMotion,
      locale: preferences.locale,
      timeZone: resolveSafeTimeZone(convexPrefs.timeZone),
    }

    setPreferences(prev => {
      // Only update if changed
      if (
        prev.largeText === incoming.largeText &&
        prev.highContrast === incoming.highContrast &&
        prev.reducedMotion === incoming.reducedMotion &&
        prev.timeZone === incoming.timeZone
      ) {
        return prev
      }
      applyAttributesToDocument(incoming)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming))
      } catch {
        // ignore
      }
      return incoming
    })
  }, [convexPrefs])

  const updatePreferences = async (updates: Partial<AccessibilityPreferences>) => {
    const next: AccessibilityPreferences = {
      ...preferences,
      ...updates,
      locale: updates.locale ? normalizeLocale(updates.locale) : preferences.locale,
      timeZone: updates.timeZone ? resolveSafeTimeZone(updates.timeZone) : preferences.timeZone,
    }

    setPreferences(next)
    applyAttributesToDocument(next)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }

    // Persist to backend if authenticated patient
    if (patient?._id && !isE2ETestMode) {
      try {
        await updateConvexMutation({
          patientId: patient._id,
          timeZone: next.timeZone,
          accessibilityPreferences: {
            largeText: next.largeText,
            highContrast: next.highContrast,
            reducedMotion: next.reducedMotion,
          },
        })
      } catch {
        // Backend update failed; local preference remains active
      }
    }
  }

  const resetPreferences = () => {
    const next = { ...DEFAULT_ACCESSIBILITY_PREFS }
    setPreferences(next)
    applyAttributesToDocument(next)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
      resetPreferences,
      isLoaded,
    }),
    [preferences, isLoaded]
  )

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}

const FALLBACK_CONTEXT_VALUE: AccessibilityContextValue = {
  preferences: DEFAULT_ACCESSIBILITY_PREFS,
  updatePreferences: async () => {},
  resetPreferences: () => {},
  isLoaded: true,
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  return context ?? FALLBACK_CONTEXT_VALUE
}
