/**
 * Region-aware emergency contact guidance.
 * Does not assume a universal emergency number.
 */

export type EmergencyRegion = 'us' | 'non-us' | 'unknown'

export interface EmergencyGuidance {
  region: EmergencyRegion
  primaryActionLabel: string
  primaryActionHref?: string
  secondaryGuidance: string
  limitation: string
}

const US_EMERGENCY_NUMBER = '911'
export const US_EMERGENCY_TEL_HREF = 'tel:911' as const

/**
 * Detects likely US locale from browser when available.
 * Falls back to unknown — copy always includes non-US guidance.
 */
export function detectEmergencyRegion(): EmergencyRegion {
  if (typeof navigator === 'undefined') return 'unknown'
  const locale = navigator.language?.toLowerCase() ?? ''
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? ''
  if (locale.endsWith('-us') || timeZone.startsWith('America/')) {
    return 'us'
  }
  if (locale.length > 0) {
    return 'non-us'
  }
  return 'unknown'
}

export function getEmergencyGuidance(region: EmergencyRegion = detectEmergencyRegion()): EmergencyGuidance {
  const limitation =
    'CRI cannot determine whether you have a medical emergency and does not replace an in-person evaluation. Acknowledging this screen does not mean your symptoms are resolved.'

  if (region === 'us') {
    return {
      region,
      primaryActionLabel: `Call ${US_EMERGENCY_NUMBER} (United States)`,
      primaryActionHref: US_EMERGENCY_TEL_HREF,
      secondaryGuidance:
        'Go to the nearest emergency department if you cannot call. Outside the United States, use your local emergency number.',
      limitation,
    }
  }

  return {
    region,
    primaryActionLabel: 'Call your local emergency number',
    secondaryGuidance:
      'In the United States, emergency services are reached at 911. Go to the nearest emergency department if you cannot call.',
    limitation,
  }
}
