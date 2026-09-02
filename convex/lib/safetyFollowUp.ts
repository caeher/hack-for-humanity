/**
 * Safety outcome follow-up: care-team notification with consent checks and audit.
 */

import { MutationCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import type { SafetyEvaluationResult } from './safetyEngine'
import { buildSafetyProvenance } from './provenance'

export type NotificationOutcome = 'sent' | 'skipped_no_consent' | 'skipped_not_escalated'

export type FollowUpState =
  | 'pending_acknowledgement'
  | 'acknowledged'
  | 'notification_sent'
  | 'notification_skipped'

export interface NotificationResult {
  outcome: NotificationOutcome
  followUpState: FollowUpState
  alertId?: Id<'alerts'>
}

/**
 * Notifies authorized care team when consent and workflow permit.
 * Emergency/high severity triggers alert creation; consent scopes gate caregiver visibility.
 */
export async function attemptCareTeamNotification(
  ctx: MutationCtx,
  params: {
    patient: Doc<'patients'>
    episodeId?: Id<'recoveryEpisodes'>
    safetyResult: SafetyEvaluationResult
    dangerSigns: string[]
    actorUserId: Id<'users'>
    actorRole: string
    symptomTotal?: number
    safetyEvaluationId?: Id<'safetyEvaluations'>
    now: number
  }
): Promise<NotificationResult> {
  const { patient, safetyResult, dangerSigns, actorUserId, actorRole, now } = params

  const shouldNotify =
    safetyResult.highestSeverity === 'emergency' || safetyResult.highestSeverity === 'high'

  if (!shouldNotify) {
    return { outcome: 'skipped_not_escalated', followUpState: 'pending_acknowledgement' }
  }

  const topRule = safetyResult.matchedRules[0]
  const detail = `[Safety Engine v${safetyResult.ruleEngineVersion}] ${topRule?.name ?? 'Clinical safety event'}: ${topRule?.matchedEvidenceSummary ?? 'Elevated risk detected'}`
  const provenance = buildSafetyProvenance({
    safetyResult,
    symptomTotal: params.symptomTotal,
  })

  const alertId = await ctx.db.insert('alerts', {
    patientId: patient._id,
    episodeId: params.episodeId,
    orgId: patient.orgId,
    detail,
    severity: 'High',
    status: 'active',
    alertSource: 'safety_engine',
    ruleCode: topRule?.outputCode,
    safetyEvaluationId: params.safetyEvaluationId,
    provenance,
    dangerSigns: dangerSigns.length > 0 ? dangerSigns : undefined,
    createdAt: now,
  })

  const activeGrants = await ctx.db
    .query('consentGrants')
    .withIndex('by_patientId', q => q.eq('patientId', patient._id))
    .collect()

  const eligibleGrantees = activeGrants.filter(
    g =>
      g.status === 'active' &&
      (g.expiresAt === undefined || g.expiresAt > now) &&
      g.scopes.includes('receive_alerts')
  )

  await ctx.db.insert('auditLogs', {
    actorUserId,
    actorRole,
    orgId: patient.orgId,
    patientId: patient._id,
    event: `Safety notification: alert created (${eligibleGrantees.length} consent-granted recipient(s) with receive_alerts scope)`,
    targetResource: 'alerts',
    resourceId: alertId,
    action: 'safety_notification',
    createdAt: now,
  })

  if (eligibleGrantees.length === 0) {
    return {
      outcome: 'skipped_no_consent',
      followUpState: 'notification_skipped',
      alertId,
    }
  }

  return {
    outcome: 'sent',
    followUpState: 'notification_sent',
    alertId,
  }
}
