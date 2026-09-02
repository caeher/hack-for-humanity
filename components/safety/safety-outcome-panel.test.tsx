import React from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SafetyOutcomePanel } from './safety-outcome-panel'
import { evaluateCheckIn } from '@/convex/lib/safetyEngine'

describe('SafetyOutcomePanel', () => {
  it('shows action first with emergency call for danger signs', () => {
    const safetyResult = evaluateCheckIn(
      {
        headache: 5,
        dizziness: 4,
        nausea: 4,
        lightSensitivity: 3,
        noiseSensitivity: 3,
        fatigue: 4,
        concentration: 3,
        sleepDifficulty: 2,
      },
      ['Repeated vomiting or nausea']
    )

    render(
      <SafetyOutcomePanel
        safetyResult={safetyResult}
        emergencyRegion="us"
        onAcknowledge={() => undefined}
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /get emergency medical help now/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /call 911/i })).toHaveAttribute('href', 'tel:911')
    expect(screen.getByText(/rule rule-red-flag-vomiting/i)).toBeInTheDocument()
    expect(screen.getAllByText(/does not mean your symptoms are resolved/i).length).toBeGreaterThan(0)
  })

  it('shows routine completion with symptom total', () => {
    const safetyResult = evaluateCheckIn({
      headache: 1,
      dizziness: 0,
      nausea: 0,
      lightSensitivity: 1,
      noiseSensitivity: 0,
      fatigue: 1,
      concentration: 1,
      sleepDifficulty: 0,
    })

    render(
      <SafetyOutcomePanel
        safetyResult={safetyResult}
        symptomTotal={4}
        savedSuccessfully
        showRoutineCompletion
      />
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/out of 48/i)).toBeInTheDocument()
    expect(screen.queryByText(/recovery score/i)).not.toBeInTheDocument()
  })

  it('shows offline fallback banner when source is client_fallback', () => {
    const safetyResult = evaluateCheckIn(
      {
        headache: 3,
        dizziness: 2,
        nausea: 2,
        lightSensitivity: 2,
        noiseSensitivity: 2,
        fatigue: 2,
        concentration: 2,
        sleepDifficulty: 2,
      },
      ['Seizures or convulsions']
    )

    render(<SafetyOutcomePanel safetyResult={safetyResult} source="client_fallback" />)

    expect(screen.getByText(/offline guidance/i)).toBeInTheDocument()
  })

  it('conveys severity with text labels accessible to screen readers', () => {
    const safetyResult = evaluateCheckIn(
      {
        headache: 5,
        dizziness: 5,
        nausea: 5,
        lightSensitivity: 5,
        noiseSensitivity: 5,
        fatigue: 5,
        concentration: 5,
        sleepDifficulty: 5,
      },
      []
    )

    render(<SafetyOutcomePanel safetyResult={safetyResult} />)

    expect(screen.getByText(/elevated — contact your care team/i)).toBeInTheDocument()
  })
})
