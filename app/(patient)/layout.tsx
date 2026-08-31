import React from 'react'
import { DashboardLayout } from '@/components/layouts'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="patient">{children}</DashboardLayout>
}
