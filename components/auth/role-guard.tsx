'use client'

import React from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Role } from '@/lib/cri-data'
import { AccessDeniedView, AccountSuspendedView } from './access-denied'

export interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isSignedIn, isLoaded: isClerkLoaded } = useUser()
  const currentUser = useQuery(api.users.getMe)

  // 1. Prototype / Demo fallback when unauthenticated
  if (isClerkLoaded && !isSignedIn) {
    return <>{children}</>
  }

  // 2. Loading state while Clerk & Convex user state is resolving
  if (!isClerkLoaded || (isSignedIn && currentUser === undefined)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center" aria-busy="true" aria-label="Validating session permissions">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Verifying workspace permissions...
        </p>
      </div>
    )
  }

  // 3. User is signed in with Clerk but not yet synced in Convex (interim sync state)
  if (isSignedIn && currentUser === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center" aria-busy="true" aria-label="Initializing recovery profile">
        <div className="size-10 animate-spin rounded-full border-2 border-primary border-t-transparent mb-4" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Synchronizing your secure profile...
        </p>
      </div>
    )
  }

  // 4. Account Suspended Check
  if (currentUser?.status === 'Suspended') {
    return <AccountSuspendedView />
  }

  // 5. Role Authorization Check
  if (currentUser && !allowedRoles.includes(currentUser.role as Role)) {
    return (
      <AccessDeniedView
        currentRole={currentUser.role}
        allowedRoles={allowedRoles}
      />
    )
  }

  // 6. Access Granted
  return <>{children}</>
}
