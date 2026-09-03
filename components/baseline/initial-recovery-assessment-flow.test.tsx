import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/e2e', () => ({
  isE2ETestMode: true,
}))

describe('InitialRecoveryAssessmentFlow', () => {
  it('renders non-diagnostic assessment copy in E2E shell mode', async () => {
    const { InitialRecoveryAssessmentFlow } = await import('./initial-recovery-assessment-flow')
    render(<InitialRecoveryAssessmentFlow />)

    expect(screen.getByText(/capture your starting symptom baseline/i)).toBeInTheDocument()
    expect(screen.getByText(/does not diagnose concussion/i)).toBeInTheDocument()
  }, 15000)
})
