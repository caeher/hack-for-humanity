import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScoreGauge } from './score-gauge'

describe('ScoreGauge accessibility', () => {
  it('renders with role="meter" and correct ARIA values', () => {
    render(
      <ScoreGauge
        score={18}
        maxScore={48}
        statusText="Improving trend"
        changeText="-6 this week"
      />
    )

    const meter = screen.getByRole('meter')
    expect(meter).toBeInTheDocument()
    expect(meter).toHaveAttribute('aria-valuenow', '18')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '48')
    expect(meter).toHaveAttribute(
      'aria-valuetext',
      '18 of 48 symptom severity points, Improving trend'
    )
  })

  it('renders status badge with visual indicator for color independence', () => {
    render(
      <ScoreGauge
        score={12}
        tone="good"
        statusText="Lower symptoms"
      />
    )

    expect(screen.getByText('Lower symptoms')).toBeInTheDocument()
    // Indicator svg is present inside badge
    const badge = screen.getByText('Lower symptoms').closest('span')
    expect(badge?.querySelector('svg')).toBeInTheDocument()
  })
})
