/**
 * Safety outcome follow-up: care-team notification with consent checks and audit.
 */

import { MutationCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import type { SafetyEvaluationResult } from './safetyEngine'
import { buildSafetyProvenance } from './provenance'
import {
  buildSourceEventKey,
  createNotification,
  deepLinkForRole,
  getAlertEligibleRecipients,
  sanitizeNotificationBody,
} from './notificationLogic'

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

  const recipientIds = await getAlertEligibleRecipients(ctx, patient, actorUserId)

  for (const recipientId of recipientIds) {
    const recipient = await ctx.db.get(recipientId)
    if (!recipient) continue

    const isSafety = safetyResult.highestSeverity === 'emergency' || safetyResult.highestSeverity === 'high'

    await createNotification(ctx, {
      recipientUserId: recipientId,
      type: isSafety ? 'safety_guidance' : 'clinician_alert',
      priority: isSafety ? 'high' : 'medium',
      title: isSafety ? 'Safety review needed' : 'Clinical alert',
      body: sanitizeNotificationBody(
        `A recovery check-in may need review for ${patient.preferredName ?? patient.displayId}. Open alerts for details — symptom specifics are not shown here.`
      ),
      sourceResourceType: 'alerts',
      sourceResourceId: alertId,
      sourceEventKey: buildSourceEventKey(
        isSafety ? 'safety_guidance' : 'clinician_alert',
        'alerts',
        alertId,
        recipientId
      ),
      patientId: patient._id,
      orgId: patient.orgId,
      deepLinkPath: deepLinkForRole(recipient.role, 'alerts'),
      timeZone: patient.timeZone,
      attemptExternalDelivery: recipient.role === 'caregiver',
      externalChannel: 'email',
      nowMs: now,
    })
  }

  return {
    outcome: 'sent',
    followUpState: 'notification_sent',
    alertId,
  }
}
