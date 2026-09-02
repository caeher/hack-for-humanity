import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ExplanationView } from './explanation-view'
import { buildSymptomTotalProvenanceFromAnswers } from '@/lib/provenance'

describe('ExplanationView', () => {
  it('renders rationale, categories, and non-diagnostic disclaimer', () => {
    const provenance = buildSymptomTotalProvenanceFromAnswers({
      answers: {
        headache: 2,
        dizziness: 1,
        nausea: 0,
        lightSensitivity: 1,
        noiseSensitivity: 0,
        fatigue: 3,
        concentration: 2,
        sleepDifficulty: 1,
      },
      checkInDate: '2026-09-01',
    })

    render(<ExplanationView provenance={provenance} title="How this total was calculated" />)

    expect(screen.getByRole('heading', { name: /how this total was calculated/i })).toBeTruthy()
    expect(screen.getByText(/eight independent ratings/i)).toBeTruthy()
    expect(screen.getByLabelText(/contributing symptom categories/i)).toBeTruthy()
    expect(screen.getByText(/not a diagnosis/i)).toBeTruthy()
    expect(screen.getByText('Headache')).toBeTruthy()
  })

  it('expands technical details with keyboard interaction', async () => {
    const user = userEvent.setup()
    const provenance = buildSymptomTotalProvenanceFromAnswers({
      answers: {
        headache: 1,
        dizziness: 1,
        nausea: 1,
        lightSensitivity: 1,
        noiseSensitivity: 1,
        fatigue: 1,
        concentration: 1,
        sleepDifficulty: 1,
      },
    })

    render(<ExplanationView provenance={provenance} />)

    const trigger = screen.getByRole('button', { name: /technical details/i })
    expect(screen.queryByText(/Methodology v/i)).toBeNull()

    await user.click(trigger)
    expect(screen.getByText(/Methodology v/i)).toBeTruthy()
  })

  it('shows permission notice when private details are restricted', () => {
    const provenance = buildSymptomTotalProvenanceFromAnswers({
      answers: {
        headache: 2,
        dizziness: 1,
        nausea: 0,
        lightSensitivity: 1,
        noiseSensitivity: 0,
        fatigue: 3,
        concentration: 2,
        sleepDifficulty: 1,
      },
      viewer: { canViewPrivateNotes: false },
    })

    render(<ExplanationView provenance={provenance} />)
    expect(screen.getByText(/hidden based on your access permissions/i)).toBeTruthy()
  })
})
