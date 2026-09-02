/**
 * AI provider configuration: retention controls, timeouts, model allowlist.
 */

import type { AiProviderConfig } from './types'

export const PROVIDER_CONFIG_VERSION = '1.0.0'

/** Default provider settings enforcing zero-retention and training opt-out */
export const DEFAULT_PROVIDER_CONFIG: AiProviderConfig = {
  providerId: 'none',
  modelId: 'none',
  trainingOptOut: true,
  dataRetention: 'zero',
  requestTimeoutMs: 30_000,
  maxTokens: 1024,
  temperature: 0.2,
}

/**
 * Approved models that have passed evaluation and recorded approval.
 * Changes require re-evaluation and admin approval (see aiModelApprovals table).
 */
export const MODEL_ALLOWLIST: ReadonlyArray<{
  providerId: string
  modelId: string
  approvedAt: string
  evaluationDatasetVersion: string
}> = [
  {
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    approvedAt: '2026-09-02',
    evaluationDatasetVersion: 'v1',
  },
  {
    providerId: 'openai',
    modelId: 'gpt-4o',
    approvedAt: '2026-09-02',
    evaluationDatasetVersion: 'v1',
  },
]

/** Daily cost limit in cents (default: $10/day per org) */
export const DEFAULT_DAILY_COST_LIMIT_CENTS = 1000

/** Per-request cost estimate in cents (for budget tracking) */
export const ESTIMATED_COST_PER_REQUEST_CENTS = 2

/**
 * Checks if a provider/model combination is on the allowlist.
 */
export function isModelAllowed(providerId: string, modelId: string): boolean {
  return MODEL_ALLOWLIST.some(
    entry => entry.providerId === providerId && entry.modelId === modelId
  )
}

/**
 * Validates provider configuration meets privacy requirements.
 */
export function validateProviderConfig(config: AiProviderConfig): {
  valid: boolean
  violations: string[]
} {
  const violations: string[] = []

  if (!config.trainingOptOut) {
    violations.push('trainingOptOut must be true')
  }
  if (config.dataRetention !== 'zero') {
    violations.push('dataRetention must be "zero"')
  }
  if (config.requestTimeoutMs > 60_000) {
    violations.push('requestTimeoutMs must not exceed 60000')
  }
  if (config.requestTimeoutMs < 5_000) {
    violations.push('requestTimeoutMs must be at least 5000')
  }
  if (config.maxTokens > 4096) {
    violations.push('maxTokens must not exceed 4096')
  }
  if (config.temperature > 0.5) {
    violations.push('temperature must not exceed 0.5 for clinical context')
  }

  return { valid: violations.length === 0, violations }
}

/**
 * Builds provider API headers enforcing privacy controls.
 */
export function buildProviderHeaders(config: AiProviderConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(config.trainingOptOut ? { 'OpenAI-Beta': 'assistants=v2' } : {}),
  }
}

/**
 * Builds provider request body with privacy-enforced parameters.
 */
export function buildProviderRequestBody(
  config: AiProviderConfig,
  messages: Array<{ role: string; content: string }>
): Record<string, unknown> {
  return {
    model: config.modelId,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    store: false,
  }
}

/**
 * Checks if daily cost limit would be exceeded.
 */
export function wouldExceedCostLimit(
  currentDailyCostCents: number,
  dailyLimitCents: number,
  additionalCostCents: number = ESTIMATED_COST_PER_REQUEST_CENTS
): boolean {
  return currentDailyCostCents + additionalCostCents > dailyLimitCents
}

/**
 * Returns provider config for a given model, or null if not allowed.
 */
export function getApprovedProviderConfig(
  providerId: string,
  modelId: string
): AiProviderConfig | null {
  if (!isModelAllowed(providerId, modelId)) return null

  const validation = validateProviderConfig({
    ...DEFAULT_PROVIDER_CONFIG,
    providerId,
    modelId,
  })

  if (!validation.valid) return null

  return {
    ...DEFAULT_PROVIDER_CONFIG,
    providerId,
    modelId,
  }
}
