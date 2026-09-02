'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileText,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { nav, roles, Role } from '@/lib/cri-data'
import { cn } from '@/lib/utils'
import { CaregiverDynamicNav } from './caregiver-dynamic-nav'

const iconMap: Record<string, React.ElementType> = {
  Overview: LayoutDashboard,
  'Daily check-in': ClipboardCheck,
  Recovery: Activity,
  Insights: Sparkles,
  'Care plan': CalendarDays,
  Messages: MessageSquare,
  Reports: FileText,
  Profile: Settings,
  'Maya’s recovery': HeartPulse,
  Patients: Users,
  Alerts: AlertTriangle,
  Users,
  Cohorts: Activity,
  'Audit log': ShieldCheck,
  Settings,
}

export interface SidebarProps {
  role: Role
  open: boolean
  onClose: () => void
}

function SidebarLink({
  href,
  label,
  pathname,
  onClose,
  matchPrefix,
}: {
  href: string
  label: string
  pathname: string
  onClose: () => void
  matchPrefix?: boolean
}) {
  const Icon = iconMap[label] || ChevronRight
  const active = matchPrefix ? pathname.startsWith(href) : pathname === href

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
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const roleNav = nav[role] || []

  return (
    <aside
      className={cn(
        'no-print fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-card p-4 transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-2 py-3">
          <Link href={roles[role]?.home || '/'} className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-foreground text-sm font-bold text-background">
              C
            </span>
            <div>
              <strong className="block tracking-tight text-foreground">CRI</strong>
              <span className="text-xs text-muted-foreground">Recovery intelligence</span>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-1">
          {role === 'caregiver' ? (
            <>
              {roleNav
                .filter(item => item.label === 'Overview')
                .map(item => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    pathname={pathname}
                    onClose={onClose}
                  />
                ))}
              <CaregiverDynamicNav pathname={pathname} onClose={onClose} />
              {roleNav
                .filter(item => item.label === 'Messages')
                .map(item => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    pathname={pathname}
                    onClose={onClose}
                  />
                ))}
            </>
          ) : (
            roleNav.map(item => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                pathname={pathname}
                onClose={onClose}
                matchPrefix={item.label === 'Patients'}
              />
            ))
          )}
        </div>

        <div className="mt-auto rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold text-foreground">
            {role === 'caregiver' ? 'Consent-based access' : 'Prototype environment'}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {role === 'caregiver'
              ? 'Caregivers only see recovery information explicitly shared by each patient.'
              : 'Data shown is simulated and not medical advice.'}
          </p>
        </div>
      </div>
    </aside>
  )
}
