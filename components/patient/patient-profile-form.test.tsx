import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

let queryCallCount = 0

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => {
    const position = queryCallCount % 3
    queryCallCount += 1
    if (position === 0) return mockMe
    if (position === 1) return mockPatient
    return mockPreferences
  }),
  useMutation: vi.fn(() => vi.fn()),
}))

import { PatientProfileForm } from './patient-profile-form'

describe('PatientProfileForm', () => {
  beforeEach(() => {
    queryCallCount = 0
  })

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
