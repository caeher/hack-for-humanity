'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { roles, Role } from '@/lib/cri-data'

export interface HeaderProps {
  role: Role
  onMenuClick: () => void
}

export function Header({ role, onMenuClick }: HeaderProps) {
  const router = useRouter()
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

        <button
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />
        </button>

        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
