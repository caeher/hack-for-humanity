import React from 'react'
import { DashboardLayout } from '@/components/layouts'

export default function ClinicianLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="clinician">{children}</DashboardLayout>
}
