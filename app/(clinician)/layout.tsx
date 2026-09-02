import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard } from '@/components/auth'

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['clinician', 'admin']}>
      <DashboardLayout role="clinician">{children}</DashboardLayout>
    </RoleGuard>
  )
}
