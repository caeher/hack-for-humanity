/**
 * Deterministic grounded answer composition from retrieved corpus chunks.
 * Never uses model general knowledge.
 */

import { verifyCitations } from '@/lib/ai/guardrails'
import type { EducationCitation, RetrievedChunk } from './types'

const MIN_RELEVANCE_SCORE = 2

export function buildCitation(chunk: RetrievedChunk, corpusVersion: string): EducationCitation {
  return {
    chunkId: chunk.chunkId,
    sourceTitle: chunk.sourceTitle,
    sourceAuthority: chunk.sourceAuthority,
    section: chunk.section,
    version: corpusVersion,
    effectiveDate: chunk.effectiveDate,
    excerpt: chunk.text.length > 240 ? `${chunk.text.slice(0, 237)}...` : chunk.text,
  }
}

export function composeGroundedAnswer(params: {
  queryText: string
  chunks: RetrievedChunk[]
  corpusVersion: string
}): { answerText: string; citations: EducationCitation[]; hasEvidence: boolean } {
  const relevant = params.chunks.filter(chunk => chunk.score >= MIN_RELEVANCE_SCORE)

  if (relevant.length === 0) {
    return {
      answerText:
        'There is not enough evidence in the approved recovery education library to answer this question. Please review your care plan or ask your care team.',
      citations: [],
      hasEvidence: false,
    }
  }

  const citations = relevant.map(chunk => buildCitation(chunk, params.corpusVersion))
  const intro =
    'Based on approved clinical education sources, here is general recovery guidance related to your question:'

  const body = relevant
    .map(chunk => `${chunk.text} [${chunk.sourceAuthority}]`)
    .join('\n\n')

  const disclaimer =
    'This information is educational only. CRI does not diagnose, prescribe, or clear return to activity. Contact your clinician for personal medical decisions.'

  const answerText = `${intro}\n\n${body}\n\n${disclaimer}`

  const citationCheck = verifyCitations(answerText)
  if (!citationCheck.valid) {
    return {
      answerText:
        'There is not enough evidence in the approved recovery education library to answer this question safely. Please review your care plan or ask your care team.',
      citations: [],
      hasEvidence: false,
    }
  }

  return { answerText, citations, hasEvidence: true }
}

export const REFUSAL_MESSAGES = {
  unsafe:
    'CRI cannot provide medical diagnoses, prescriptions, activity clearance, or advice to ignore danger signs. Please consult your healthcare provider.',
  personalData:
    'CRI cannot summarize your personal health data in this assistant. Review your dashboard, insights, and care plan—or message your care team for individualized guidance.',
  outOfScope:
    'This question is outside the scope of concussion recovery education. Try asking about general recovery topics such as sleep, pacing, or symptom tracking.',
  appHelpFallback:
    'Open Daily Check-in, Care Plan, or Messages from your patient navigation menu. Contact your care team if you need help with your recovery plan.',
  insufficientEvidence:
    'There is not enough evidence in the approved recovery education library to answer this question. Please review your care plan or ask your care team.',
  aiDisabled:
    'AI-assisted educational search is temporarily unavailable. The guidance below is retrieved directly from approved clinical sources.',
} as const
