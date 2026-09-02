import { describe, expect, test } from 'vitest'

import {
  DEFAULT_PROVIDER_CONFIG,
  getApprovedProviderConfig,
  isModelAllowed,
  validateProviderConfig,
  wouldExceedCostLimit,
} from './providerConfig'

describe('providerConfig', () => {
  test('DEFAULT_PROVIDER_CONFIG enforces privacy requirements', () => {
    const validation = validateProviderConfig(DEFAULT_PROVIDER_CONFIG)
    expect(validation.valid).toBe(true)
    expect(DEFAULT_PROVIDER_CONFIG.trainingOptOut).toBe(true)
    expect(DEFAULT_PROVIDER_CONFIG.dataRetention).toBe('zero')
  })

  test('validateProviderConfig rejects training opt-in', () => {
    const validation = validateProviderConfig({
      ...DEFAULT_PROVIDER_CONFIG,
      trainingOptOut: false,
    })
    expect(validation.valid).toBe(false)
    expect(validation.violations).toContain('trainingOptOut must be true')
  })

  test('validateProviderConfig rejects non-zero retention', () => {
    const validation = validateProviderConfig({
      ...DEFAULT_PROVIDER_CONFIG,
      dataRetention: 'minimal',
    })
    expect(validation.valid).toBe(false)
  })

  test('isModelAllowed checks allowlist', () => {
    expect(isModelAllowed('openai', 'gpt-4o-mini')).toBe(true)
    expect(isModelAllowed('openai', 'gpt-3.5-turbo')).toBe(false)
    expect(isModelAllowed('unknown', 'model')).toBe(false)
  })

  test('getApprovedProviderConfig returns config for allowed models', () => {
    const config = getApprovedProviderConfig('openai', 'gpt-4o-mini')
    expect(config).not.toBeNull()
    expect(config?.trainingOptOut).toBe(true)
  })

  test('wouldExceedCostLimit tracks daily budget', () => {
    expect(wouldExceedCostLimit(990, 1000)).toBe(false)
    expect(wouldExceedCostLimit(999, 1000)).toBe(true)
  })
})
