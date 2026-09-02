import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard } from '@/components/auth'

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['caregiver']}>
      <DashboardLayout role="caregiver">{children}</DashboardLayout>
    </RoleGuard>
  )
}
