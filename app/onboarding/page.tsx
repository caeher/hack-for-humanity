import type { Metadata } from 'next'
import { RecoveryOnboardingFlow } from '@/components/onboarding/recovery-onboarding-flow'

export const metadata: Metadata = {
  title: 'Recovery Onboarding',
  description:
    'Set up your concussion recovery tracking profile. CRI organizes symptoms — it does not diagnose.',
}

export default function OnboardingPage() {
  return (
    <main className="paper-grid min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <RecoveryOnboardingFlow />
    </main>
  )
}
