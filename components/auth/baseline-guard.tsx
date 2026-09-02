'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'

export interface BaselineGuardProps {
  children: React.ReactNode
}

/**
 * Redirects patient-role users who completed onboarding but not the initial
 * recovery assessment to /patient/assessment.
 */
export function BaselineGuard({ children }: BaselineGuardProps) {
  if (isE2ETestMode) {
    return <>{children}</>
  }

  return <BaselineGuardWithAuth>{children}</BaselineGuardWithAuth>
}

function BaselineGuardWithAuth({ children }: BaselineGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn, isLoaded: isClerkLoaded } = useUser()
  const currentUser = useQuery(api.users.getMe)
  const onboardingStatus = useQuery(api.onboarding.getStatus)
  const baselineStatus = useQuery(api.baseline.getStatus)

  const isAssessmentRoute = pathname === '/patient/assessment'

  useEffect(() => {
    if (
      !isClerkLoaded ||
      !isSignedIn ||
      currentUser === undefined ||
      onboardingStatus === undefined ||
      baselineStatus === undefined
    ) {
      return
    }

    if (!currentUser || currentUser.role !== 'patient') {
      return
    }

    if (!onboardingStatus.completed) {
      return
    }

    if (!baselineStatus.completed && !isAssessmentRoute) {
      router.replace('/patient/assessment')
      return
    }

    if (baselineStatus.completed && isAssessmentRoute) {
      router.replace(baselineStatus.nextRoute ?? '/patient/check-in')
    }
  }, [
    isClerkLoaded,
    isSignedIn,
    currentUser,
    onboardingStatus,
    baselineStatus,
    isAssessmentRoute,
    router,
  ])

  if (
    isSignedIn &&
    currentUser?.role === 'patient' &&
    onboardingStatus?.completed &&
    baselineStatus !== undefined &&
    !baselineStatus.completed &&
    !isAssessmentRoute
  ) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center"
        aria-busy="true"
        aria-label="Redirecting to initial recovery assessment"
      >
        <div className="mb-4 size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-muted-foreground">Preparing your initial assessment…</p>
      </div>
    )
  }

  return <>{children}</>
}
