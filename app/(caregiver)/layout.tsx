import React from 'react'
import { DashboardLayout } from '@/components/layouts'

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="caregiver">{children}</DashboardLayout>
}
