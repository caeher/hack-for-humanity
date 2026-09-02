import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard } from '@/components/auth'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['patient']}>
      <DashboardLayout role="patient">{children}</DashboardLayout>
    </RoleGuard>
  )
}
