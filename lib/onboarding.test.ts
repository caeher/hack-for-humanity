import { describe, expect, it } from 'vitest'
import { getPostOnboardingRoute } from './onboarding'

describe('getPostOnboardingRoute', () => {
  it('routes self-tracking patients to initial assessment', () => {
    expect(getPostOnboardingRoute('patient', 'patient')).toBe('/patient/assessment')
  })

  it('routes caregivers to caregiver dashboard', () => {
    expect(getPostOnboardingRoute('caregiver', 'caregiver')).toBe('/caregiver/dashboard')
  })

  it('routes professional enrollment to clinician caseload for clinicians', () => {
    expect(getPostOnboardingRoute('professional', 'clinician')).toBe('/clinician/patients')
  })

  it('falls back to initial assessment when caregiver tracking with patient role', () => {
    expect(getPostOnboardingRoute('caregiver', 'patient')).toBe('/patient/assessment')
  })
})
