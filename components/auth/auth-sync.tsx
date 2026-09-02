'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

/**
 * AuthSync automatically triggers Convex profile synchronization when
 * a user is authenticated via Clerk.
 */
export function AuthSync() {
  const { isSignedIn, user, isLoaded } = useUser()
  const syncCurrentUser = useMutation(api.users.syncCurrentUser)
  const syncedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      syncedUserIdRef.current = null
      return
    }

    // Prevent duplicate sync executions for the same user session
    if (syncedUserIdRef.current === user.id) {
      return
    }

    syncedUserIdRef.current = user.id

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullName || undefined

    syncCurrentUser({ name: fullName }).catch(err => {
      // Don't crash if account is suspended or network is offline
      console.warn('Convex user profile sync notice:', err?.message || err)
    })
  }, [isLoaded, isSignedIn, user, syncCurrentUser])

  return null
}
