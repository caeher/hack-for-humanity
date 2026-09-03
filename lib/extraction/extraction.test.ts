import { describe, expect, test } from 'vitest'
import { parseRecoveryNoteLocally } from './localParser'
import { validateExtractionOutput, validateCandidate } from './schema'
import { extractRecoveryEvents, evaluateConfirmedCandidatesSafety } from './extract'
import { mapConfirmedCandidatesToExposureEntries } from './mapToExposure'
import { DEFAULT_GOVERNANCE_STATE } from '@/lib/ai/killSwitch'
import { applyKillSwitch } from '@/lib/ai/killSwitch'
import type { RecoveryEventCandidate } from './types'

describe('parseRecoveryNoteLocally', () => {
  test('extracts headache after studying with duration', () => {
    const candidates = parseRecoveryNoteLocally(
      'Today I had a headache after studying for two hours.'
    )

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0]?.symptom?.field).toBe('headache')
    expect(candidates[0]?.activity?.domain).toBe('cognitive')
    expect(candidates[0]?.duration?.minutes).toBe(120)
  })

  test('extracts dizziness after walking', () => {
    const candidates = parseRecoveryNoteLocally('Felt dizzy after walking for 30 minutes this morning.')

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0]?.symptom?.field).toBe('dizziness')
    expect(candidates[0]?.activity?.activityType).toBe('light_walking')
    expect(candidates[0]?.timing?.relative).toBe('morning')
  })

  test('redacts PII before parsing', () => {
    const candidates = parseRecoveryNoteLocally(
      'Headache after studying. Contact me at patient@example.com'
    )

    expect(candidates.length).toBeGreaterThan(0)
    const serialized = JSON.stringify(candidates)
    expect(serialized).not.toContain('patient@example.com')
  })

  test('returns empty for blank input', () => {
    expect(parseRecoveryNoteLocally('')).toEqual([])
    expect(parseRecoveryNoteLocally('   ')).toEqual([])
  })
})

describe('validateExtractionOutput', () => {
  test('rejects unsupported symptom fields', () => {
    const result = validateExtractionOutput([
      {
        id: '1',
        symptom: { field: 'unsupported_symptom' as 'headache', uncertain: true },
        confidence: 'low',
        uncertain: true,
        status: 'pending',
      },
    ])

    expect(result.valid).toBe(false)
    expect(result.candidates).toHaveLength(0)
  })

  test('marks unsupported activity types as rejected with uncertainty', () => {
    const result = validateCandidate({
      id: '1',
      activity: {
        domain: 'physical',
        activityType: 'skydiving',
        uncertain: false,
      },
      confidence: 'low',
      uncertain: false,
      status: 'pending',
    })

    expect(result.valid).toBe(true)
    expect(result.rejected).toBe(true)
    expect(result.candidate?.activity?.rejected).toBe(true)
    expect(result.candidate?.uncertain).toBe(true)
  })
})

describe('extractRecoveryEvents', () => {
  test('returns candidates for valid note', () => {
    const result = extractRecoveryEvents({
      requestId: 'req-1',
      noteText: 'Headache after studying for two hours.',
      governance: DEFAULT_GOVERNANCE_STATE,
    })

    expect(result.kind).toBe('candidates')
    expect(result.candidates.length).toBeGreaterThan(0)
    expect(result.audit.modelId).toBeTruthy()
    expect(result.audit.latencyMs).toBeGreaterThanOrEqual(0)
  })

  test('returns ai_disabled when NLP kill switch is active', () => {
    const governance = applyKillSwitch(DEFAULT_GOVERNANCE_STATE, {
      scope: 'feature',
      enabled: false,
      feature: 'nlp',
    })

    const result = extractRecoveryEvents({
      requestId: 'req-2',
      noteText: 'Headache after studying.',
      governance,
    })

    expect(result.kind).toBe('ai_disabled')
    expect(result.candidates).toHaveLength(0)
  })

  test('does not hide safety signals on parser failure', () => {
    const result = extractRecoveryEvents({
      requestId: 'req-3',
      noteText: 'I had a seizure and passed out yesterday.',
      governance: DEFAULT_GOVERNANCE_STATE,
    })

    expect(result.message).toContain('Urgent safety signals')
  })

  test('never includes raw note in audit metadata', () => {
    const note = 'My headache after studying for two hours.'
    const result = extractRecoveryEvents({
      requestId: 'req-4',
      noteText: note,
      governance: DEFAULT_GOVERNANCE_STATE,
    })

    const serialized = JSON.stringify(result.audit)
    expect(serialized).not.toContain(note)
    expect(result.audit.promptFingerprint).toBeTruthy()
  })
})

describe('evaluateConfirmedCandidatesSafety', () => {
  test('evaluates confirmed structures', () => {
    const candidates: RecoveryEventCandidate[] = [
      {
        id: '1',
        status: 'confirmed',
        symptom: { field: 'headache', severity: 4 },
        activity: { domain: 'screen', activityType: 'computer', uncertain: false },
        duration: { minutes: 240 },
        confidence: 'high',
        uncertain: false,
      },
    ]

    const result = evaluateConfirmedCandidatesSafety(candidates)
    expect(result.status).toBeDefined()
    expect(result.matchedRules).toBeDefined()
  })

  test('ignores discarded candidates', () => {
    const candidates: RecoveryEventCandidate[] = [
      {
        id: '1',
        status: 'discarded',
        symptom: { field: 'headache', severity: 6 },
        activity: { domain: 'screen', activityType: 'computer', uncertain: false },
        duration: { minutes: 300 },
        confidence: 'high',
        uncertain: false,
      },
    ]

    const result = evaluateConfirmedCandidatesSafety(candidates)
    expect(result.status).toBe('safe')
  })
})

describe('mapConfirmedCandidatesToExposureEntries', () => {
  test('maps confirmed candidate to exposure entry', () => {
    const entries = mapConfirmedCandidatesToExposureEntries([
      {
        id: '1',
        status: 'confirmed',
        symptom: { field: 'headache' },
        activity: { domain: 'cognitive', activityType: 'studying', uncertain: false },
        duration: { minutes: 120 },
        confidence: 'high',
        uncertain: false,
      },
    ])

    expect(entries).toHaveLength(1)
    expect(entries[0]?.domain).toBe('cognitive')
    expect(entries[0]?.symptomsWorsened).toBe('yes')
    expect(entries[0]?.durationMinutes).toBe(120)
  })
})
