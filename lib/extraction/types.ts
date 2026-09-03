/**
 * Strict extraction schema for recovery event candidates from free-text notes.
 * Candidates are NOT clinical fact until the user explicitly confirms them.
 */

import type { ExposureDomain } from '@/lib/exposureTracking'

export const EXTRACTION_SCHEMA_VERSION = '1.0.0'
export const EXTRACTION_PROMPT_VERSION = 'recovery-events-v1'
export const EXTRACTION_MODEL_ID = 'cri-local-parser-v1'

export const CONCUSSION_SYMPTOM_FIELDS = [
  'headache',
  'dizziness',
  'nausea',
  'lightSensitivity',
  'noiseSensitivity',
  'fatigue',
  'concentration',
  'sleepDifficulty',
] as const

export type ConcussionSymptomField = (typeof CONCUSSION_SYMPTOM_FIELDS)[number]

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type ExtractionValidationOutcome =
  | 'valid'
  | 'partial'
  | 'failed'
  | 'blocked'
  | 'ai_disabled'

export type CandidateStatus = 'pending' | 'confirmed' | 'discarded'

export interface ExtractionSymptom {
  field: ConcussionSymptomField
  severity?: number
  uncertain?: boolean
}

export interface ExtractionActivity {
  domain: ExposureDomain
  activityType: string
  trigger?: string
  uncertain?: boolean
  rejected?: boolean
}

export interface ExtractionDuration {
  minutes?: number
  text?: string
  uncertain?: boolean
}

export type TimingRelative =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'after_activity'
  | 'before_sleep'
  | 'unknown'

export interface ExtractionTiming {
  relative?: TimingRelative
  timeOfDay?: string
  uncertain?: boolean
}

export interface RecoveryEventCandidate {
  id: string
  symptom?: ExtractionSymptom
  activity?: ExtractionActivity
  duration?: ExtractionDuration
  timing?: ExtractionTiming
  confidence: ConfidenceLevel
  uncertain: boolean
  status: CandidateStatus
}

export interface ExtractionAuditMetadata {
  requestId: string
  ctxSessionId: string
  schemaVersion: string
  promptVersion: string
  modelId: string
  validationOutcome: ExtractionValidationOutcome
  latencyMs: number
  auditOutcome: string
  candidateCount: number
  promptFingerprint?: string
}

export interface ExtractionResponse {
  kind: 'candidates' | 'ai_disabled' | 'blocked' | 'parse_failed' | 'empty'
  candidates: RecoveryEventCandidate[]
  message?: string
  audit: ExtractionAuditMetadata
}

export interface ConfirmedCandidate extends RecoveryEventCandidate {
  status: 'confirmed'
}
