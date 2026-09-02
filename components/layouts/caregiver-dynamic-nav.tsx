'use client'

import React from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { HeartPulse } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import { cn } from '@/lib/utils'

export interface CaregiverDynamicNavProps {
  pathname: string
  onClose: () => void
}

function CaregiverDynamicNavDemo({ pathname, onClose }: CaregiverDynamicNavProps) {
  const href = '/caregiver/patient/P-1042'
  const active = pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-foreground text-background font-semibold'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <HeartPulse className="size-4 shrink-0" />
      <span className="truncate">Maya’s recovery</span>
    </Link>
  )
}

function CaregiverDynamicNavLive({ pathname, onClose }: CaregiverDynamicNavProps) {
  const accessiblePatients = useQuery(api.consent.listAccessiblePatients, {})

  if (!accessiblePatients || accessiblePatients.length === 0) {
    return null
  }

  return (
    <>
      {accessiblePatients.map(patient => {
        const href = `/caregiver/patient/${patient.displayId}`
        const label = `${patient.preferredName ?? patient.displayId}’s recovery`
        const active = pathname.startsWith(href)

        return (
          <Link
            key={patient.patientId}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-foreground text-background font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <HeartPulse className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Link>
        )
      })}
    </>
  )
}

export function CaregiverDynamicNav(props: CaregiverDynamicNavProps) {
  if (isE2ETestMode) {
    return <CaregiverDynamicNavDemo {...props} />
  }

  return <CaregiverDynamicNavLive {...props} />
}
