import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PatientProfileForm } from './patient-profile-form'

describe('PatientProfileForm', () => {
  it('keeps wearable sync disabled with planned prototype copy', () => {
    render(<PatientProfileForm />)

    const wearableSwitch = screen.getByRole('switch', { name: /wearable data sync \(planned\)/i })
    expect(wearableSwitch).toBeDisabled()
    expect(screen.getByText(/not connected in this prototype/i)).toBeInTheDocument()
  })

  it('allows editing contact fields while wearables remain blocked', async () => {
    const user = userEvent.setup()
    render(<PatientProfileForm />)

    const nameInput = screen.getByDisplayValue('Maya Chen')
    await user.clear(nameInput)
    await user.type(nameInput, 'Maya Test')

    expect(nameInput).toHaveValue('Maya Test')
    expect(screen.getByRole('switch', { name: /wearable data sync \(planned\)/i })).toBeDisabled()
  })

  it('does not reference live device integrations in wearable copy', () => {
    render(<PatientProfileForm />)
    expect(screen.queryByText(/apple health/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/health connect/i)).not.toBeInTheDocument()
  })
})
