import { describe, expect, test } from 'vitest'
import { classifyEducationRequest } from './classifyRequest'
import { composeGroundedAnswer } from './composeAnswer'
import { retrieveCorpusChunks } from './retrieval'
import { APPROVED_CORPUS_CHUNKS_V1 } from './corpus/v1/chunks'
import { processEducationQuestion } from './assistant'
import { DEFAULT_GOVERNANCE_STATE } from '@/lib/ai/killSwitch'

describe('classifyEducationRequest', () => {
  test('classifies general education questions', () => {
    expect(
      classifyEducationRequest('What sleep hygiene practices are recommended during concussion recovery?')
    ).toBe('education')
  })

  test('classifies app help questions', () => {
    expect(classifyEducationRequest('How do I use the daily check-in?')).toBe('app_help')
  })

  test('classifies personal data questions', () => {
    expect(classifyEducationRequest('What does my symptom trend mean?')).toBe('personal_data')
  })

  test('classifies unsafe diagnostic questions', () => {
    expect(classifyEducationRequest('Do I have a concussion after my bike crash?')).toBe('unsafe_diagnostic')
  })

  test('classifies out of scope questions', () => {
    expect(classifyEducationRequest('What is the weather today?')).toBe('out_of_scope')
  })
})

describe('retrieveCorpusChunks', () => {
  test('retrieves sleep-related chunks for sleep hygiene query', () => {
    const results = retrieveCorpusChunks({
      queryText: 'What sleep hygiene practices are recommended during concussion recovery?',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0]?.sourceAuthority).toBe('CDC HEADS UP')
  })

  test('returns empty when no relevant evidence exists', () => {
    const results = retrieveCorpusChunks({
      queryText: 'quantum blockchain cryptocurrency portfolio',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
      minScore: 4,
    })

    expect(results).toHaveLength(0)
  })
})

describe('composeGroundedAnswer', () => {
  test('includes approved citations in composed answer', () => {
    const retrieved = retrieveCorpusChunks({
      queryText: 'screen time pacing after concussion',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
    })

    const composed = composeGroundedAnswer({
      queryText: 'screen time pacing after concussion',
      chunks: retrieved,
      corpusVersion: 'v1',
    })

    expect(composed.hasEvidence).toBe(true)
    expect(composed.citations.length).toBeGreaterThan(0)
    expect(composed.answerText).toContain('[Amsterdam 2022]')
  })

  test('returns insufficient evidence when retrieval is empty', () => {
    const composed = composeGroundedAnswer({
      queryText: 'unrelated topic',
      chunks: [],
      corpusVersion: 'v1',
    })

    expect(composed.hasEvidence).toBe(false)
    expect(composed.citations).toHaveLength(0)
  })
})

describe('processEducationQuestion', () => {
  test('returns grounded answer with citations for educational query', () => {
    const response = processEducationQuestion({
      requestId: 'test-edu-1',
      queryText: 'What sleep hygiene practices are recommended during concussion recovery?',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
      corpusVersion: 'v1',
      environment: 'development',
      governance: DEFAULT_GOVERNANCE_STATE,
    })

    expect(response.kind).toBe('grounded_answer')
    expect(response.citations.length).toBeGreaterThan(0)
    expect(response.answerText).toContain('[CDC HEADS UP]')
  })

  test('refuses diagnostic requests via safety engine', () => {
    const response = processEducationQuestion({
      requestId: 'test-edu-2',
      queryText: 'Can I play in the soccer tournament tomorrow if I feel fine?',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
      corpusVersion: 'v1',
      environment: 'development',
      governance: DEFAULT_GOVERNANCE_STATE,
    })

    expect(response.kind).toBe('safety_refusal')
    expect(response.citations).toHaveLength(0)
  })

  test('returns insufficient evidence for unsupported topics', () => {
    const response = processEducationQuestion({
      requestId: 'test-edu-3',
      queryText: 'Explain cryptocurrency mining economics in detail',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
      corpusVersion: 'v1',
      environment: 'development',
      governance: DEFAULT_GOVERNANCE_STATE,
    })

    expect(response.kind).toBe('insufficient_evidence')
  })

  test('uses retrieval-only fallback when AI kill switch is active', () => {
    const response = processEducationQuestion({
      requestId: 'test-edu-4',
      queryText: 'How should I gradually increase screen time after a concussion?',
      chunks: APPROVED_CORPUS_CHUNKS_V1,
      corpusVersion: 'v1',
      environment: 'development',
      governance: {
        ...DEFAULT_GOVERNANCE_STATE,
        featureKillSwitches: { rag: true },
      },
    })

    expect(response.kind).toBe('ai_disabled_fallback')
    expect(response.citations.length).toBeGreaterThan(0)
    expect(response.answerText).toContain('temporarily unavailable')
  })
})
