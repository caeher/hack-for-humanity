'use client'

import React, { useMemo } from 'react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'

import { AuthSync } from '@/components/auth'

interface ConvexClientProviderProps {
  children: React.ReactNode
}

/**
 * ConvexClientProvider supplies the reactive Convex client to the React tree
 * authenticated via Clerk.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  const client = useMemo(() => {
    const url = convexUrl && convexUrl.trim() !== '' ? convexUrl : 'https://placeholder.convex.cloud'
    return new ConvexReactClient(url)
  }, [convexUrl])

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <AuthSync />
      {children}
    </ConvexProviderWithClerk>
  )
}
