import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CheckInFlowSession as CheckInFlow } from './check-in-flow'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

async function completeSymptomSteps(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 0; step < 8; step += 1) {
    await user.click(screen.getByRole('button', { name: /continue/i }))
  }
}

describe('CheckInFlow', () => {
  it('walks through eight symptom steps and shows safety outcome for routine check-in', async () => {
    const user = userEvent.setup()
    render(<CheckInFlow />)

    expect(screen.getByText(/Daily check-in · 1 of 9/i)).toBeInTheDocument()
    await completeSymptomSteps(user)

    expect(screen.getByRole('heading', { name: /before you finish, check for danger signs/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /finish check-in/i }))

    expect(screen.getByRole('heading', { name: /continue your daily recovery routine/i })).toBeInTheDocument()
    expect(screen.queryByText(/recovery score/i)).not.toBeInTheDocument()
  })

  it('intercepts danger signs with structured safety outcome and 911 link', async () => {
    const user = userEvent.setup()
    render(<CheckInFlow />)
    await completeSymptomSteps(user)

    const dangerFieldset = screen.getByRole('group', { name: /^danger signs$/i })
    await user.click(within(dangerFieldset).getByText(/repeated vomiting/i))

    expect(screen.getByRole('button', { name: /view urgent guidance/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view urgent guidance/i }))

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(/get emergency medical help now/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /call 911/i })).toHaveAttribute('href', 'tel:911')
    expect(screen.getByText(/engine v1\.0\.0/i)).toBeInTheDocument()
  })

  it('exposes accessible live regions for emergency intercept', async () => {
    const user = userEvent.setup()
    render(<CheckInFlow />)
    await completeSymptomSteps(user)

    const dangerFieldset = screen.getByRole('group', { name: /^danger signs$/i })
    await user.click(within(dangerFieldset).getByText(/seizure/i))
    await user.click(screen.getByRole('button', { name: /view urgent guidance/i }))

    expect(screen.getByRole('heading', { name: /get emergency medical help now/i })).toBeInTheDocument()
    expect(screen.getAllByText(/emergency — immediate medical evaluation needed/i).length).toBeGreaterThan(0)
  })
})
