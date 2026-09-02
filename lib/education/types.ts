/**
 * Types for the citation-grounded concussion education assistant.
 */

export const EDUCATION_CORPUS_VERSION = 'v1'

export type EducationRequestClassification =
  | 'education'
  | 'app_help'
  | 'personal_data'
  | 'unsafe_diagnostic'
  | 'out_of_scope'

export type EducationResponseKind =
  | 'grounded_answer'
  | 'safety_refusal'
  | 'guardrail_refusal'
  | 'insufficient_evidence'
  | 'app_help'
  | 'personal_data_redirect'
  | 'out_of_scope'
  | 'ai_disabled_fallback'

export interface EducationCorpusChunk {
  chunkId: string
  sourceTitle: string
  sourceAuthority: string
  section: string
  effectiveDate: string
  text: string
  keywords: string[]
}

export interface EducationCitation {
  chunkId: string
  sourceTitle: string
  sourceAuthority: string
  section: string
  version: string
  effectiveDate: string
  excerpt: string
}

export interface EducationAssistantResponse {
  kind: EducationResponseKind
  answerText: string
  citations: EducationCitation[]
  classification: EducationRequestClassification
  corpusVersion: string
  environment: string
  safetyStatus?: string
  safetyGuidance?: string
  requestId: string
  ctxSessionId: string
  auditOutcome: string
}

export interface RetrievedChunk extends EducationCorpusChunk {
  score: number
}
