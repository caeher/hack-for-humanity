import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { api } from '@/convex/_generated/api'

const mockMe = { name: 'Maya Chen', email: 'maya.chen@example.com', phone: '(415) 555-0192' }
const mockPatient = { _id: 'patient1', timeZone: 'America/New_York' }
const mockPreferences = {
  timeZone: 'America/New_York',
  communicationPreferences: {
    emailReminders: true,
    smsReminders: false,
    weeklySummary: true,
  },
  accessibilityPreferences: {
    largeText: false,
    highContrast: false,
    reducedMotion: false,
  },
  quietHours: { start: '21:00', end: '08:00' },
  wearableSyncStatus: 'planned_disabled' as const,
}

vi.mock('convex/react', () => ({
  useQuery: vi.fn((queryFn: any) => {
    if (queryFn === api.users.getMe) return mockMe
    if (queryFn === api.patients.getMePatient) return mockPatient
    if (queryFn === api.profilePreferences.getForPatient) return mockPreferences
    if (queryFn === api.privacy?.getLatestExport) return null
    return []
  }),
  useMutation: vi.fn(() => vi.fn()),
}))

import { PatientProfileForm } from './patient-profile-form'

describe('PatientProfileForm', () => {
  it('keeps wearable sync disabled with planned prototype copy', () => {
    render(<PatientProfileForm />)

    const wearableSwitch = screen.getByRole('switch', { name: /wearable data sync \(planned\)/i })
    expect(wearableSwitch).toBeDisabled()
    expect(screen.getByText(/not connected in this prototype/i)).toBeInTheDocument()
  })

  it('allows editing time zone while wearables remain blocked', async () => {
    const user = userEvent.setup()
    render(<PatientProfileForm />)

    const timeZoneInput = screen.getByLabelText(/time zone/i)
    await user.clear(timeZoneInput)
    await user.type(timeZoneInput, 'America/Chicago')

    expect(timeZoneInput).toHaveValue('America/Chicago')
    expect(screen.getByRole('switch', { name: /wearable data sync \(planned\)/i })).toBeDisabled()
  })

  it('does not reference live device integrations in wearable copy', () => {
    render(<PatientProfileForm />)
    expect(screen.queryByText(/apple health/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/health connect/i)).not.toBeInTheDocument()
  })
})
