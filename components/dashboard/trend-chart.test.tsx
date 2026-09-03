import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrendChart } from './trend-chart'

describe('TrendChart accessibility', () => {
  const mockData = [
    { day: 'Day 1', date: '2026-08-20', symptomBurden: 28, headache: 4 },
    { day: 'Day 2', date: '2026-08-21', symptomBurden: 22, headache: 3 },
    { day: 'Day 3', date: '2026-08-22', symptomBurden: 16, headache: 2 },
  ]

  it('renders with accessible region role and label', () => {
    render(<TrendChart data={mockData} />)
    const region = screen.getByRole('region')
    expect(region).toBeInTheDocument()
    expect(region).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Patient-reported symptom total changed from 28 to 16')
    )
  })

  it('provides an equivalent tabular representation for screen readers (WCAG 1.1.1)', () => {
    render(<TrendChart data={mockData} clinical />)
    const table = screen.getByRole('table', { hidden: true })
    expect(table).toBeInTheDocument()

    // Verify caption and cell contents exist for assistive technologies
    expect(screen.getByText(/longitudinal patient-reported symptom total data/i)).toBeInTheDocument()
    expect(screen.getByText(/28 out of 48/i)).toBeInTheDocument()
    expect(screen.getByText(/16 out of 48/i)).toBeInTheDocument()
    expect(screen.getByText(/4 out of 6/i)).toBeInTheDocument()
  })

  it('renders friendly accessible empty state when data is missing', () => {
    render(<TrendChart data={[]} emptyMessage="No data recorded yet." />)
    expect(screen.getByText('No data recorded yet.')).toBeInTheDocument()
  })
})
