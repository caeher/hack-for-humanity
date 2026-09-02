import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

let queryCallCount = 0

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => {
    const position = queryCallCount % 3
    queryCallCount += 1
    if (position === 0) return null
    if (position === 1) return { name: 'Test User', role: 'patient' }
    return { completed: false, hasDraft: false }
  }),
  useMutation: vi.fn(() => vi.fn()),
}))

import { RecoveryOnboardingFlow } from './recovery-onboarding-flow'

describe('RecoveryOnboardingFlow', () => {
  beforeEach(() => {
    queryCallCount = 0
  })

  it('renders the first onboarding step with tracking relationship options', async () => {
    render(<RecoveryOnboardingFlow />)

    await waitFor(() => {
      expect(screen.getByText(/set up your recovery profile/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/i am tracking my own recovery/i)).toBeInTheDocument()
    expect(screen.getByText(/parent or caregiver/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('explains that CRI does not diagnose on the welcome step', async () => {
    render(<RecoveryOnboardingFlow />)

    await waitFor(() => {
      expect(screen.getByText(/does not diagnose or predict recovery/i)).toBeInTheDocument()
    })
  })

  it('announces step progress for assistive technology', async () => {
    render(<RecoveryOnboardingFlow />)

    await waitFor(() => {
      expect(screen.getByText(/recovery onboarding/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/who is tracking/i)).toBeInTheDocument()
  })
})
