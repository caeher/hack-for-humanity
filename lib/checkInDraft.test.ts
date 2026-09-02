/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it } from 'vitest'
import {
  clearCheckInDraft,
  getCheckInDraftStorageKey,
  readCheckInDraft,
  writeCheckInDraft,
} from './checkInDraft'

describe('checkInDraft', () => {
  const patientId = 'patient_test_123'

  afterEach(() => {
    clearCheckInDraft(patientId)
  })

  it('round-trips draft state in localStorage', () => {
    const draft = {
      version: 1 as const,
      step: 3,
      answers: { headache: 2, dizziness: 1 },
      activityImpact: 'yes',
      selectedDangerSigns: ['seizure'],
      note: 'Felt worse after screen time.',
      updatedAt: Date.now(),
    }

    writeCheckInDraft(patientId, draft)
    expect(readCheckInDraft(patientId)).toEqual(draft)
    expect(getCheckInDraftStorageKey(patientId)).toContain(patientId)
  })

  it('returns null for missing or invalid drafts', () => {
    expect(readCheckInDraft(patientId)).toBeNull()
    window.localStorage.setItem(getCheckInDraftStorageKey(patientId), '{bad json')
    expect(readCheckInDraft(patientId)).toBeNull()
  })

  it('clears stored drafts after successful submission policy', () => {
    writeCheckInDraft(patientId, {
      version: 1,
      step: 1,
      answers: {},
      activityImpact: 'no',
      selectedDangerSigns: [],
      note: '',
      updatedAt: Date.now(),
    })

    clearCheckInDraft(patientId)
    expect(readCheckInDraft(patientId)).toBeNull()
  })
})
