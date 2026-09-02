'use client'

import React, { useMemo } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'

import { AuthSync } from '@/components/auth'
import { getConvexUrl } from '@/lib/env'

interface ConvexClientProviderProps {
  children: React.ReactNode
}

/**
 * ConvexClientProvider supplies the reactive Convex client to the React tree
 * authenticated via Clerk. It refuses to start without a real deployment URL.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convexUrl = getConvexUrl()
  const client = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl])

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <AuthSync />
      {children}
    </ConvexProviderWithClerk>
  )
}
