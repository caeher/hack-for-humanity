import { describe, expect, it } from 'vitest'
import { getPostOnboardingRoute } from './onboarding'

describe('getPostOnboardingRoute', () => {
  it('routes self-tracking patients to daily check-in', () => {
    expect(getPostOnboardingRoute('patient', 'patient')).toBe('/patient/check-in')
  })

  it('routes caregivers to caregiver dashboard', () => {
    expect(getPostOnboardingRoute('caregiver', 'caregiver')).toBe('/caregiver/dashboard')
  })

  it('routes professional enrollment to clinician caseload for clinicians', () => {
    expect(getPostOnboardingRoute('professional', 'clinician')).toBe('/clinician/patients')
  })

  it('falls back to patient check-in when caregiver tracking with patient role', () => {
    expect(getPostOnboardingRoute('caregiver', 'patient')).toBe('/patient/check-in')
  })
})
