/**
 * AI kill switch — disables AI features while core tracking remains functional.
 */

import type { AiFeature, AiGovernanceState, AiRequestOutcome, KillSwitchScope } from './types'

export const KILL_SWITCH_VERSION = '1.0.0'

/** Static fallback responses when AI is disabled */
export const AI_DISABLED_FALLBACKS: Record<AiFeature, string> = {
  nlp: 'Text analysis is temporarily unavailable. You can still complete your check-in manually.',
  rag: 'Educational search is temporarily unavailable. Please review your care plan or contact your care team.',
  insights: 'Recovery insights are temporarily unavailable. Your dashboard and symptom trends remain up to date.',
  all: 'AI-assisted features are temporarily unavailable. Check-ins, your dashboard, and care plans continue to work normally.',
}

export const DEFAULT_GOVERNANCE_STATE: AiGovernanceState = {
  globalKillSwitch: false,
  orgKillSwitches: {},
  featureKillSwitches: {},
  dailyCostLimitCents: 1000,
  currentDailyCostCents: 0,
}

export interface KillSwitchCheckParams {
  state: AiGovernanceState
  orgId?: string
  feature: AiFeature
}

/**
 * Determines if AI is enabled for a given org and feature.
 * Core tracking (check-in, dashboard, timeline) is never affected.
 */
export function isAiEnabled(params: KillSwitchCheckParams): boolean {
  const { state, orgId, feature } = params

  if (state.globalKillSwitch) return false

  if (orgId && state.orgKillSwitches[orgId]) return false

  if (state.featureKillSwitches[feature]) return false
  if (state.featureKillSwitches.all) return false

  return true
}

/**
 * Returns kill switch check result with outcome code and fallback message.
 */
export function checkKillSwitch(params: KillSwitchCheckParams): {
  enabled: boolean
  outcome: AiRequestOutcome
  fallbackMessage?: string
  scope?: KillSwitchScope
} {
  const { state, orgId, feature } = params

  if (state.globalKillSwitch) {
    return {
      enabled: false,
      outcome: 'blocked_kill_switch',
      fallbackMessage: AI_DISABLED_FALLBACKS.all,
      scope: 'global',
    }
  }

  if (orgId && state.orgKillSwitches[orgId]) {
    return {
      enabled: false,
      outcome: 'blocked_kill_switch',
      fallbackMessage: AI_DISABLED_FALLBACKS.all,
      scope: 'org',
    }
  }

  if (state.featureKillSwitches[feature] || state.featureKillSwitches.all) {
    return {
      enabled: false,
      outcome: 'blocked_kill_switch',
      fallbackMessage: AI_DISABLED_FALLBACKS[feature],
      scope: 'feature',
    }
  }

  return { enabled: true, outcome: 'success' }
}

/**
 * Applies a kill switch change to governance state (immutable update).
 */
export function applyKillSwitch(
  state: AiGovernanceState,
  params: {
    scope: KillSwitchScope
    enabled: boolean
    orgId?: string
    feature?: AiFeature
  }
): AiGovernanceState {
  const next = { ...state, orgKillSwitches: { ...state.orgKillSwitches }, featureKillSwitches: { ...state.featureKillSwitches } }

  switch (params.scope) {
    case 'global':
      next.globalKillSwitch = !params.enabled
      break
    case 'org':
      if (!params.orgId) throw new Error('orgId required for org-scoped kill switch')
      if (params.enabled) {
        delete next.orgKillSwitches[params.orgId]
      } else {
        next.orgKillSwitches[params.orgId] = true
      }
      break
    case 'feature':
      if (!params.feature) throw new Error('feature required for feature-scoped kill switch')
      if (params.enabled) {
        delete next.featureKillSwitches[params.feature]
      } else {
        next.featureKillSwitches[params.feature] = true
      }
      break
    default: {
      const _exhaustive: never = params.scope
      throw new Error(`Unknown kill switch scope: ${_exhaustive}`)
    }
  }

  return next
}

/**
 * Features that are AI-dependent (disabled when kill switch is active).
 * Core tracking features are NOT in this list.
 */
export const AI_DEPENDENT_FEATURES: AiFeature[] = ['nlp', 'rag', 'insights']

/**
 * Features that must continue working when AI is disabled.
 */
export const CORE_TRACKING_FEATURES = [
  'check_in',
  'dashboard',
  'timeline',
  'care_plan',
  'reminders',
  'messages',
  'reports',
] as const

export type CoreTrackingFeature = (typeof CORE_TRACKING_FEATURES)[number]

/**
 * Verifies that a feature is core tracking (never blocked by kill switch).
 */
export function isCoreTrackingFeature(feature: string): feature is CoreTrackingFeature {
  return (CORE_TRACKING_FEATURES as readonly string[]).includes(feature)
}
