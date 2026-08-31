'use client'

import React, { useMemo } from 'react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

interface ConvexClientProviderProps {
  children: React.ReactNode
}

/**
 * ConvexClientProvider supplies the reactive Convex client to the React component tree.
 * If NEXT_PUBLIC_CONVEX_URL is not yet configured, it uses a safe fallback to allow
 * local static rendering and preview builds without crashing.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  const client = useMemo(() => {
    const url = convexUrl && convexUrl.trim() !== '' ? convexUrl : 'https://placeholder.convex.cloud'
    return new ConvexReactClient(url)
  }, [convexUrl])

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
