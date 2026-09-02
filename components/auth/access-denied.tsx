'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Lock, LogOut, ShieldAlert, UserCheck } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'
import { Role, roles } from '@/lib/cri-data'

interface AccessDeniedViewProps {
  currentRole?: Role | string
  allowedRoles: Role[]
}

export function AccessDeniedView({ currentRole, allowedRoles }: AccessDeniedViewProps) {
  const currentRoleLabel = currentRole && roles[currentRole as Role]?.label
    ? roles[currentRole as Role].label
    : (currentRole || 'User')

  const allowedLabels = allowedRoles
    .map(r => roles[r]?.label || r)
    .join(' or ')

  const homeUrl = currentRole && roles[currentRole as Role]?.home
    ? roles[currentRole as Role].home
    : '/'

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive mb-6 shadow-sm">
        <ShieldAlert className="size-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
        <Lock className="size-3" /> Access Restricted
      </span>

      <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl max-w-lg">
        This workspace is restricted to {allowedLabels} accounts
      </h1>

      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        You are currently signed in with the <strong className="text-foreground">{currentRoleLabel}</strong> role.
        Your permissions do not permit access to this section.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={homeUrl}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
        >
          <UserCheck className="size-4" />
          <span>Go to my {currentRoleLabel} workspace</span>
          <ArrowRight className="size-4" />
        </Link>

        <SignOutButton>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>Switch account</span>
          </button>
        </SignOutButton>
      </div>

      <div className="mt-12 rounded-lg border border-border bg-card/60 p-4 max-w-md text-left text-xs text-muted-foreground">
        <strong className="block font-semibold text-foreground mb-1">Need administrative or clinical access?</strong>
        <span>Contact your organization administrator to request role reassignment or an updated clinical staff invite.</span>
      </div>
    </div>
  )
}

export function AccountSuspendedView() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive mb-6 shadow-sm">
        <ShieldAlert className="size-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
        Account Suspended
      </span>

      <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl max-w-lg">
        Your access has been temporarily suspended
      </h1>

      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        This account is currently suspended by an organization administrator. All queries and mutations are blocked in accordance with clinical safety policies.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <SignOutButton>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>Sign out</span>
          </button>
        </SignOutButton>
      </div>
    </div>
  )
}
