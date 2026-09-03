'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { roles, Role } from '@/lib/cri-data'

export interface HeaderDemoSandboxProps {
  role: Role
  onMenuClick: () => void
  sidebarOpen?: boolean
}

/**
 * Demo-only header for Playwright smoke tests (no Clerk / Convex dependencies).
 */
export function HeaderDemoSandbox({ role, onMenuClick, sidebarOpen }: HeaderDemoSandboxProps) {
  const router = useRouter()
  const currentRoleConfig = roles[role] || { label: 'User', home: '/' }

  return (
    <header role="banner" className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="grid size-9 place-items-center rounded-lg border border-border bg-card lg:hidden text-foreground hover:bg-muted cursor-pointer"
          aria-label="Open sidebar navigation"
          aria-expanded={Boolean(sidebarOpen)}
          aria-controls="mobile-sidebar"
        >
          <Menu className="size-5" />
        </button>
        <p className="hidden text-sm font-medium text-foreground sm:block">
          {currentRoleConfig.label} workspace
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-9 place-items-center rounded-lg border border-border bg-card text-foreground"
        >
          <Bell className="size-4" />
        </button>

        <div className="w-36">
        <Select
          value={role}
          onValueChange={newRole => router.push(roles[newRole as Role]?.home || '/')}
        >
          <SelectTrigger aria-label="Switch demo role" className="h-9 font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(roles).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>
    </header>
  )
}
