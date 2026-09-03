import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessibilityProvider, useAccessibility } from './accessibility-provider'

vi.mock('convex/react', () => ({
  useQuery: () => null,
  useMutation: () => vi.fn().mockResolvedValue(null),
}))

function TestConsumer() {
  const { preferences, updatePreferences, resetPreferences } = useAccessibility()

  return (
    <div>
      <span data-testid="large-text">{String(preferences.largeText)}</span>
      <span data-testid="high-contrast">{String(preferences.highContrast)}</span>
      <span data-testid="reduced-motion">{String(preferences.reducedMotion)}</span>
      <span data-testid="locale">{preferences.locale}</span>
      <span data-testid="timezone">{preferences.timeZone}</span>

      <button
        type="button"
        onClick={() => updatePreferences({ largeText: true, highContrast: true })}
      >
        Enable A11y Modes
      </button>

      <button type="button" onClick={() => resetPreferences()}>
        Reset A11y Modes
      </button>
    </div>
  )
}

describe('AccessibilityProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-large-text')
    document.documentElement.removeAttribute('data-high-contrast')
    document.documentElement.removeAttribute('data-reduced-motion')
  })

  it('provides default preferences and sets document attributes', () => {
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )

    expect(screen.getByTestId('large-text')).toHaveTextContent('false')
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('false')
    expect(document.documentElement.dataset.largeText).toBe('false')
    expect(document.documentElement.dataset.highContrast).toBe('false')
  })

  it('updates preferences, updates document attributes and persists to localStorage', async () => {
    const user = userEvent.setup()
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )

    await user.click(screen.getByRole('button', { name: /enable a11y modes/i }))

    expect(screen.getByTestId('large-text')).toHaveTextContent('true')
    expect(screen.getByTestId('high-contrast')).toHaveTextContent('true')
    expect(document.documentElement.dataset.largeText).toBe('true')
    expect(document.documentElement.dataset.highContrast).toBe('true')

    const stored = localStorage.getItem('cri_accessibility_preferences_v1')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!)).toMatchObject({ largeText: true, highContrast: true })
  })

  it('resets preferences back to defaults', async () => {
    const user = userEvent.setup()
    render(
      <AccessibilityProvider>
        <TestConsumer />
      </AccessibilityProvider>
    )

    await user.click(screen.getByRole('button', { name: /enable a11y modes/i }))
    expect(screen.getByTestId('large-text')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: /reset a11y modes/i }))
    expect(screen.getByTestId('large-text')).toHaveTextContent('false')
    expect(document.documentElement.dataset.largeText).toBe('false')
  })
})
