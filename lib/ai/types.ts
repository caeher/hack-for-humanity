/**
 * Shared types for CRI AI privacy, guardrails, and governance.
 */

export type AgeBand = '13-17' | '18-24' | '25-44' | '45-64' | '65+' | 'unknown'

export type SymptomSeverityBand = 'minimal' | 'mild' | 'moderate' | 'severe'

export type TrendDirection = 'improving' | 'stable' | 'worsening' | 'insufficient_data'

export type AiFeature = 'nlp' | 'rag' | 'insights' | 'all'

export type KillSwitchScope = 'global' | 'org' | 'feature'

export type AiRequestOutcome =
  | 'success'
  | 'blocked_kill_switch'
  | 'blocked_safety_engine'
  | 'blocked_injection'
  | 'blocked_exfiltration'
  | 'blocked_unsafe_output'
  | 'blocked_citation_spoof'
  | 'blocked_model_not_allowed'
  | 'blocked_cost_limit'
  | 'blocked_timeout'
  | 'error'

export interface DeidentifiedClinicalContext {
  /** Ephemeral pseudonymous session ID — not linkable to patient */
  ctxSessionId: string
  ageBand: AgeBand
  daysSinceInjury?: number
  symptomTotalBand: SymptomSeverityBand
  symptomTotal?: number
  trendDirection: TrendDirection
  recentSymptomSummary?: string
  activityContext?: string
  /** Redacted user query — PII patterns removed */
  queryText?: string
}

export interface AiProviderConfig {
  providerId: string
  modelId: string
  trainingOptOut: boolean
  dataRetention: 'zero' | 'minimal'
  requestTimeoutMs: number
  maxTokens: number
  temperature: number
}

export interface AiGovernanceState {
  globalKillSwitch: boolean
  orgKillSwitches: Record<string, boolean>
  featureKillSwitches: Partial<Record<AiFeature, boolean>>
  dailyCostLimitCents: number
  currentDailyCostCents: number
}

export interface AiGuardrailResult {
  allowed: boolean
  outcome: AiRequestOutcome
  reason?: string
  matchedPatterns?: string[]
}

export interface AiAuditEntry {
  requestId: string
  ctxSessionId: string
  providerId?: string
  modelId?: string
  feature: AiFeature
  outcome: AiRequestOutcome
  latencyMs?: number
  tokenCount?: number
  promptFingerprint: string
  timestamp: number
}

export interface EvaluationCase {
  id: string
  slice: 'adults' | 'pediatric' | 'ambiguity' | 'adversarial'
  input: {
    queryText?: string
    clinicalContext?: Partial<DeidentifiedClinicalContext>
    rawPayload?: Record<string, unknown>
  }
  expected: {
    allowed: boolean
    outcome?: AiRequestOutcome
    containsPii?: boolean
    requiresRefusal?: boolean
    requiresCitation?: boolean
    neutralLanguage?: boolean
    requiresSafetyEscalation?: boolean
    extraction?: {
      symptom?: string
      activityDomain?: string
      durationMinutes?: number
      noCandidates?: boolean
      symptomOptional?: boolean
    }
  }
  tags: string[]
}

export interface EvaluationResult {
  caseId: string
  passed: boolean
  actualOutcome: AiRequestOutcome
  metrics: Record<string, number>
  failureReason?: string
}

export interface EvaluationSummary {
  datasetVersion: string
  runAt: string
  totalCases: number
  passedCases: number
  failedCases: number
  metrics: Record<string, number>
  criticalFailures: string[]
  releaseBlocked: boolean
}
