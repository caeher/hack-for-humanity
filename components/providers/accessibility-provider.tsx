'use client'

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useConvex, useMutation, useQuery } from 'convex/react'
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

interface AccessibilityConvexSyncProps {
  currentLocale: SupportedLocale
  setPreferences: React.Dispatch<React.SetStateAction<AccessibilityPreferences>>
  persistBackendRef: React.MutableRefObject<((prefs: AccessibilityPreferences) => Promise<void>) | null>
}

function AccessibilityConvexSync({
  currentLocale,
  setPreferences,
  persistBackendRef,
}: AccessibilityConvexSyncProps) {
  const patient = useQuery(api.patients.getMePatient, {})
  const convexPrefs = useQuery(
    api.profilePreferences.getForPatient,
    patient?._id ? { patientId: patient._id } : 'skip'
  )
  const updateConvexMutation = useMutation(api.profilePreferences.updateForPatient)

  // Sync with Convex preferences when patient logs in
  useEffect(() => {
    if (!convexPrefs || !convexPrefs.accessibilityPreferences) return

    const incoming: AccessibilityPreferences = {
      largeText: convexPrefs.accessibilityPreferences.largeText,
      highContrast: convexPrefs.accessibilityPreferences.highContrast,
      reducedMotion: convexPrefs.accessibilityPreferences.reducedMotion,
      locale: currentLocale,
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
  }, [convexPrefs, currentLocale, setPreferences])

  // Wire up backend persistence
  useEffect(() => {
    if (patient?._id) {
      persistBackendRef.current = async (next: AccessibilityPreferences) => {
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
    } else {
      persistBackendRef.current = null
    }

    return () => {
      persistBackendRef.current = null
    }
  }, [patient?._id, updateConvexMutation, persistBackendRef])

  return null
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex()
  const hasConvexClient = !isE2ETestMode && Boolean(convex)
  const persistBackendRef = useRef<((prefs: AccessibilityPreferences) => Promise<void>) | null>(null)

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

    // Persist to backend if authenticated patient and Convex is connected
    if (persistBackendRef.current) {
      await persistBackendRef.current(next)
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
      {hasConvexClient && (
        <AccessibilityConvexSync
          currentLocale={preferences.locale}
          setPreferences={setPreferences}
          persistBackendRef={persistBackendRef}
        />
      )}
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
