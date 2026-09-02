import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard } from '@/components/auth'

export const dynamic = 'force-dynamic'

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['caregiver']}>
      <DashboardLayout role="caregiver">{children}</DashboardLayout>
    </RoleGuard>
  )
}
