import React from 'react'
import { DashboardLayout } from '@/components/layouts'
import { RoleGuard, OnboardingGuard } from '@/components/auth'
import { BaselineGuard } from '@/components/auth/baseline-guard'

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['patient']}>
      <OnboardingGuard>
        <BaselineGuard>
          <DashboardLayout role="patient">{children}</DashboardLayout>
        </BaselineGuard>
      </OnboardingGuard>
    </RoleGuard>
  )
}
