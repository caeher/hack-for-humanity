'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogIn, ShieldCheck, Sparkles } from 'lucide-react'
import { Show, UserButton, SignInButton, SignUpButton, useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roles, Role } from '@/lib/cri-data'
import { isE2ETestMode } from '@/lib/e2e'
import { HeaderDemoSandbox } from './header-demo-sandbox'
import { NotificationCenter } from '@/components/notifications/notification-center'

export interface HeaderProps {
  role: Role
  onMenuClick: () => void
}

export function Header({ role, onMenuClick }: HeaderProps) {
  if (isE2ETestMode) {
    return <HeaderDemoSandbox role={role} onMenuClick={onMenuClick} />
  }

  return <HeaderWithAuth role={role} onMenuClick={onMenuClick} />
}

function HeaderWithAuth({ role, onMenuClick }: HeaderProps) {
  const router = useRouter()
  const { isSignedIn } = useUser()
  const currentUser = useQuery(api.users.getMe)

  const initials =
    role === 'patient'
      ? 'MC'
      : role === 'caregiver'
      ? 'EC'
      : role === 'clinician'
      ? 'OB'
      : 'AL'

  const currentRoleConfig = roles[role] || { label: 'User', home: '/' }

  const handleRoleChange = (newRole: string) => {
    // If authenticated in real mode and not an admin, prevent switching to unauthorized roles
    if (isSignedIn && currentUser && currentUser.role !== 'admin' && currentUser.role !== newRole) {
      router.push(roles[currentUser.role as Role]?.home || '/')
      return
    }

    const target = roles[newRole as Role]?.home || '/'
    router.push(target)
  }

  return (
    <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="grid size-9 place-items-center rounded-lg border border-border bg-card lg:hidden text-foreground hover:bg-muted cursor-pointer"
          aria-label="Open sidebar navigation"
        >
          <Menu className="size-5" />
        </button>
        <p className="hidden text-sm font-medium text-foreground sm:block">
          {currentRoleConfig.label} workspace
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Real Auth Role Badge vs Demo Switcher */}
        {isSignedIn && currentUser ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" />
            <span className="capitalize">{currentUser.role}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider xl:inline-flex">
              <Sparkles className="size-3 text-amber-500" /> Demo sandbox
            </span>
            <div className="w-36">
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger aria-label="Switch demo role" className="h-9 font-semibold">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="clinician">Clinician</SelectItem>
                  <SelectItem value="admin">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isSignedIn && <NotificationCenter />}

        {/* Clerk Auth State & User Menu */}
        <Show when="signed-in">
          <div className="flex items-center">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'size-9 rounded-full ring-1 ring-border',
                },
              }}
            />
          </div>
        </Show>

        <Show when="signed-out">
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                <LogIn className="size-3.5" />
                <span>Sign in</span>
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="hidden sm:inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer">
                Sign up
              </button>
            </SignUpButton>
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </div>
        </Show>
      </div>
    </header>
  )
}

