import { describe, expect, test } from 'vitest'

import {
  AI_DISABLED_FALLBACKS,
  applyKillSwitch,
  checkKillSwitch,
  CORE_TRACKING_FEATURES,
  DEFAULT_GOVERNANCE_STATE,
  isAiEnabled,
  isCoreTrackingFeature,
} from './killSwitch'

describe('killSwitch', () => {
  test('AI is enabled by default', () => {
    expect(isAiEnabled({ state: DEFAULT_GOVERNANCE_STATE, feature: 'rag' })).toBe(true)
  })

  test('global kill switch disables all AI', () => {
    const state = { ...DEFAULT_GOVERNANCE_STATE, globalKillSwitch: true }
    const result = checkKillSwitch({ state, feature: 'rag' })
    expect(result.enabled).toBe(false)
    expect(result.outcome).toBe('blocked_kill_switch')
    expect(result.fallbackMessage).toBe(AI_DISABLED_FALLBACKS.all)
  })

  test('org kill switch disables AI for that org only', () => {
    const state = {
      ...DEFAULT_GOVERNANCE_STATE,
      orgKillSwitches: { org123: true },
    }
    const result = checkKillSwitch({ state, orgId: 'org123', feature: 'rag' })
    expect(result.enabled).toBe(false)
    expect(result.scope).toBe('org')
  })

  test('feature kill switch disables specific feature', () => {
    const state = {
      ...DEFAULT_GOVERNANCE_STATE,
      featureKillSwitches: { rag: true },
    }
    const result = checkKillSwitch({ state, feature: 'rag' })
    expect(result.enabled).toBe(false)
    expect(result.fallbackMessage).toBe(AI_DISABLED_FALLBACKS.rag)
  })

  test('applyKillSwitch toggles global switch', () => {
    const disabled = applyKillSwitch(DEFAULT_GOVERNANCE_STATE, { scope: 'global', enabled: false })
    expect(disabled.globalKillSwitch).toBe(true)

    const reenabled = applyKillSwitch(disabled, { scope: 'global', enabled: true })
    expect(reenabled.globalKillSwitch).toBe(false)
  })

  test('applyKillSwitch toggles feature switch', () => {
    const disabled = applyKillSwitch(DEFAULT_GOVERNANCE_STATE, {
      scope: 'feature',
      enabled: false,
      feature: 'nlp',
    })
    expect(disabled.featureKillSwitches.nlp).toBe(true)
  })

  test('core tracking features are never AI-dependent', () => {
    for (const feature of CORE_TRACKING_FEATURES) {
      expect(isCoreTrackingFeature(feature)).toBe(true)
    }
    expect(isCoreTrackingFeature('rag')).toBe(false)
  })
})
