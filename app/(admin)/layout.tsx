import React from 'react'
import { DashboardLayout } from '@/components/layouts'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="admin">{children}</DashboardLayout>
}
