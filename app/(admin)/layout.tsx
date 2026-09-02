import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard } from '@/components/auth'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <DashboardLayout role="admin">{children}</DashboardLayout>
    </RoleGuard>
  )
}
