'use client'

import React, { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'

export interface OnboardingGuardProps {
  children: React.ReactNode
}

/**
 * Redirects patient-role users who have not completed onboarding to /onboarding.
 * Bypassed in E2E test mode and for unauthenticated demo sessions.
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  if (isE2ETestMode) {
    return <>{children}</>
  }

  return <OnboardingGuardWithAuth>{children}</OnboardingGuardWithAuth>
}

function OnboardingGuardWithAuth({ children }: OnboardingGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn, isLoaded: isClerkLoaded } = useUser()
  const currentUser = useQuery(api.users.getMe)
  const onboardingStatus = useQuery(api.onboarding.getStatus)

  const isOnboardingRoute = pathname === '/onboarding'

  useEffect(() => {
    if (!isClerkLoaded || !isSignedIn || currentUser === undefined || onboardingStatus === undefined) {
      return
    }

    if (!currentUser || currentUser.role !== 'patient') {
      return
    }

    if (!onboardingStatus.completed && !isOnboardingRoute) {
      router.replace('/onboarding')
      return
    }

    if (onboardingStatus.completed && isOnboardingRoute) {
      router.replace(onboardingStatus.nextRoute ?? '/patient/dashboard')
    }
  }, [
    isClerkLoaded,
    isSignedIn,
    currentUser,
    onboardingStatus,
    isOnboardingRoute,
    router,
  ])

  if (
    isSignedIn &&
    currentUser?.role === 'patient' &&
    onboardingStatus !== undefined &&
    !onboardingStatus.completed &&
    !isOnboardingRoute
  ) {
    return (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center"
        aria-busy="true"
        aria-label="Redirecting to recovery onboarding"
      >
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Preparing your recovery setup…</p>
      </div>
    )
  }

  return <>{children}</>
}
