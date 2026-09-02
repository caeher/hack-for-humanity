'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
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
import { api } from '@/convex/_generated/api'
import { nav, roles, Role } from '@/lib/cri-data'
import { cn } from '@/lib/utils'

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

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const accessiblePatients = useQuery(
    api.consent.listAccessiblePatients,
    role === 'caregiver' ? {} : 'skip'
  )

  const roleNav = React.useMemo(() => {
    const baseNav = nav[role] || []

    if (role !== 'caregiver' || !accessiblePatients) {
      return baseNav
    }

    const patientLinks = accessiblePatients.map(patient => ({
      label: `${patient.preferredName ?? patient.displayId}’s recovery`,
      href: `/caregiver/patient/${patient.displayId}`,
    }))

    const overview = baseNav.filter(item => item.label === 'Overview')
    const messages =
      accessiblePatients.some(patient => patient.scopes.includes('view_messages')) ||
      accessiblePatients.some(patient => patient.scopes.includes('send_messages'))
        ? baseNav.filter(item => item.label === 'Messages')
        : []

    return [...overview, ...patientLinks, ...messages]
  }, [role, accessiblePatients])

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
          {roleNav.map(item => {
            const Icon = iconMap[item.label] || HeartPulse
            const active =
              pathname === item.href ||
              (item.label === 'Patients' && pathname.startsWith('/clinician/patients')) ||
              (role === 'caregiver' &&
                item.href.startsWith('/caregiver/patient/') &&
                pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-foreground text-background font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="mt-auto rounded-lg border border-border bg-background p-3">
          <p className="text-xs font-semibold text-foreground">Consent-based access</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Caregivers only see recovery information explicitly shared by each patient.
          </p>
        </div>
      </div>
    </aside>
  )
}
