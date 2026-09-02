import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard, OnboardingGuard } from '@/components/auth'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['patient']}>
      <OnboardingGuard>
        <DashboardLayout role="patient">{children}</DashboardLayout>
      </OnboardingGuard>
    </RoleGuard>
  )
}
