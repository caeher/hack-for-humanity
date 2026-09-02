'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, LayoutDashboard } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { getAuthorizedHome, Role } from '@/lib/cri-data'

export function WorkspaceButton({ className }: { className?: string }) {
  const currentUser = useQuery(api.users.getMe)
  const home = getAuthorizedHome(currentUser?.role as Role)
  const roleLabel = currentUser?.role ? currentUser.role : 'Recovery'

  return (
    <Link
      href={home}
      className={className || 'rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity'}
    >
      <LayoutDashboard className="size-3.5" />
      <span>Open {roleLabel} workspace</span>
      <ArrowRight className="size-3.5" />
    </Link>
  )
}
