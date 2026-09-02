import { Doc } from '../_generated/dataModel'
import { addDaysToIsoDate, compareIsoDates } from './checkInHistoryLogic'
import type { ProvenanceMetadata } from './provenance'

export type CaseloadAttention = 'Routine' | 'Review' | 'Safety'
export type RiskLevel = 'Stable' | 'Review' | 'Elevated'

export interface CaseloadAttentionResult {
  attention: CaseloadAttention
  reasons: string[]
}

const RISK_RATIONALE: Record<RiskLevel, string> = {
  Stable:
    'Symptom total below 15 with neutral or downward trajectory over a 7-day rolling window (ONF triage criteria).',
  Review:
    'Symptom total between 15–29, plateau without improvement for more than 14 days, or emerging adherence concerns.',
  Elevated:
    'Symptom total at or above 30, consecutive 3-day increase of 6+ points, or active Tier 1 safety event.',
}

export function explainRiskLevel(riskLevel: RiskLevel | null | undefined): string {
  if (!riskLevel) {
    return 'No active recovery episode on file; risk classification unavailable until baseline is complete.'
  }
  return RISK_RATIONALE[riskLevel]
}

export function computeDayNumber(incidentDate: string | null | undefined, today: string): number | null {
  if (!incidentDate) {
    return null
  }
  let day = 1
  let cursor = incidentDate
  while (compareIsoDates(cursor, today) < 0) {
    day += 1
    cursor = addDaysToIsoDate(cursor, 1)
    if (day > 366) {
      break
    }
  }
  return day
}

export function countMissedCheckInsInWindow(
  recordedDates: Set<string>,
  windowStart: string,
  windowEnd: string
): number {
  let missed = 0
  let cursor = windowStart
  while (compareIsoDates(cursor, windowEnd) <= 0) {
    if (!recordedDates.has(cursor)) {
      missed += 1
    }
    cursor = addDaysToIsoDate(cursor, 1)
  }
  return missed
}

export function computeCheckInRatePercent(
  recordedDays: number,
  eligibleDays: number
): number | null {
  if (eligibleDays <= 0) {
    return null
  }
  return Math.round((recordedDays / eligibleDays) * 1000) / 10
}

export function deriveCaseloadAttention(args: {
  riskLevel: RiskLevel | null
  activeHighAlerts: number
  activeMediumAlerts: number
  missedCheckInsLast7Days: number
  latestSafetyStatus?: Doc<'safetyEvaluations'>['status'] | null
}): CaseloadAttentionResult {
  const reasons: string[] = []

  if (args.activeHighAlerts > 0) {
    reasons.push(`${args.activeHighAlerts} active high-priority safety alert(s).`)
  }

  if (args.latestSafetyStatus === 'emergency' || args.latestSafetyStatus === 'elevated') {
    reasons.push(`Latest safety evaluation status: ${args.latestSafetyStatus}.`)
  }

  if (args.riskLevel === 'Elevated') {
    reasons.push(explainRiskLevel('Elevated'))
  }

  if (
    args.activeHighAlerts > 0 ||
    args.riskLevel === 'Elevated' ||
    args.latestSafetyStatus === 'emergency' ||
    args.latestSafetyStatus === 'elevated'
  ) {
    return { attention: 'Safety', reasons }
  }

  if (args.riskLevel === 'Review' || args.activeMediumAlerts > 0) {
    if (args.riskLevel === 'Review') {
      reasons.push(explainRiskLevel('Review'))
    }
    if (args.activeMediumAlerts > 0) {
      reasons.push(`${args.activeMediumAlerts} medium-priority alert(s) awaiting review.`)
    }
    return { attention: 'Review', reasons }
  }

  if (args.missedCheckInsLast7Days >= 3) {
    reasons.push(
      `${args.missedCheckInsLast7Days} missed check-ins in the last 7 days; adherence follow-up recommended.`
    )
    return { attention: 'Review', reasons }
  }

  if (args.riskLevel === 'Stable') {
    reasons.push(explainRiskLevel('Stable'))
  } else {
    reasons.push('No active safety alerts or elevated risk signals in the current window.')
  }

  return { attention: 'Routine', reasons }
}

export function buildStableSortKey(displayId: string): string {
  return displayId.toUpperCase()
}

export function formatAlertFreshness(createdAt: number, now: number): string {
  const deltaMs = Math.max(0, now - createdAt)
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes} min ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hr ago`
  }
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

export function isAlertVisibleInQueue(
  alert: Doc<'alerts'>,
  now: number
): boolean {
  if (alert.status === 'resolved') {
    return false
  }
  if (alert.status === 'snoozed' && alert.snoozedUntil !== undefined && alert.snoozedUntil > now) {
    return false
  }
  return true
}

export function resolveAlertProvenance(alert: Doc<'alerts'>): ProvenanceMetadata | null {
  if (!alert.provenance) {
    return null
  }
  return alert.provenance as ProvenanceMetadata
}
