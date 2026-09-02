import { MutationCtx, QueryCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import { evaluateFreeText } from './safetyEngine'
import { attemptCareTeamNotification } from './safetyFollowUp'
import { messageSafetyGuidanceValidator } from './validators'
import { Infer } from 'convex/values'

export type MessageSafetyGuidance = Infer<typeof messageSafetyGuidanceValidator>

const PREVIEW_MAX_LENGTH = 120

export function buildMessagePreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized
  }
  return `${normalized.slice(0, PREVIEW_MAX_LENGTH - 1)}…`
}

export async function countUnreadMessages(
  ctx: QueryCtx,
  threadId: string,
  userId: Id<'users'>
): Promise<number> {
  const recentMessages = await ctx.db
    .query('messages')
    .withIndex('by_threadId_and_createdAt', q => q.eq('threadId', threadId))
    .order('desc')
    .take(100)

  let unread = 0

  for (const message of recentMessages) {
    if (message.senderUserId === userId) {
      continue
    }

    const receipt = await ctx.db
      .query('messageReadReceipts')
      .withIndex('by_messageId_and_userId', q =>
        q.eq('messageId', message._id).eq('userId', userId)
      )
      .first()

    if (!receipt) {
      unread++
    }
  }

  return unread
}

export async function writeMessageAuditLog(
  ctx: MutationCtx,
  params: {
    actorUserId: Id<'users'>
    actorRole: string
    orgId: Id<'organizations'>
    patientId: Id<'patients'>
    threadId: string
    messageId?: Id<'messages'>
    action: 'create' | 'read'
    now: number
  }
): Promise<void> {
  const actionLabel = params.action === 'create' ? 'sent' : 'read'

  await ctx.db.insert('auditLogs', {
    actorUserId: params.actorUserId,
    actorRole: params.actorRole,
    orgId: params.orgId,
    patientId: params.patientId,
    event: `Care-team message ${actionLabel} (thread ${params.threadId})`,
    targetResource: 'messages',
    resourceId: params.messageId ?? params.threadId,
    action: params.action,
    createdAt: params.now,
  })
}

export async function evaluateMessageSafety(
  ctx: MutationCtx,
  params: {
    content: string
    patient: Doc<'patients'>
    episodeId: Id<'recoveryEpisodes'>
    actorUserId: Id<'users'>
    actorRole: string
    now: number
  }
): Promise<{
  guidance?: MessageSafetyGuidance
  safetyStatus?: Doc<'messages'>['safetyStatus']
  safetySeverity?: Doc<'messages'>['safetySeverity']
  safetyEvaluationId?: Id<'safetyEvaluations'>
}> {
  const evaluation = evaluateFreeText(params.content)

  const safetyEvaluationId = await ctx.db.insert('safetyEvaluations', {
    patientId: params.patient._id,
    orgId: params.patient.orgId,
    evaluatedByUserId: params.actorUserId,
    contextType: 'free_text',
    status: evaluation.status,
    highestSeverity: evaluation.highestSeverity,
    ruleEngineVersion: evaluation.ruleEngineVersion,
    matchedRuleCodes: evaluation.matchedRules.map(rule => rule.outputCode),
    matchedRuleIds: evaluation.matchedRules.map(rule => rule.ruleId),
    matchedEvidenceSummary: evaluation.matchedRules.map(rule => rule.matchedEvidenceSummary),
    primaryEscalation: evaluation.primaryEscalation,
    blockedActions: evaluation.blockedActions,
    failSafeApplied: evaluation.failSafeApplied,
    createdAt: params.now,
  })

  const topRule = evaluation.matchedRules[0]
  const guidance: MessageSafetyGuidance | undefined =
    evaluation.status === 'safe'
      ? undefined
      : {
          status: evaluation.status,
          highestSeverity:
            evaluation.highestSeverity === 'none' ? 'none' : evaluation.highestSeverity,
          primaryEscalation: evaluation.primaryEscalation,
          userGuidance:
            topRule?.userGuidance?.defaultSafeText ??
            'If symptoms feel urgent or worsening, contact your care team or emergency services.',
          isEmergency: evaluation.status === 'emergency',
        }

  if (evaluation.highestSeverity === 'emergency' || evaluation.highestSeverity === 'high') {
    await attemptCareTeamNotification(ctx, {
      patient: params.patient,
      episodeId: params.episodeId,
      safetyResult: evaluation,
      dangerSigns: [],
      actorUserId: params.actorUserId,
      actorRole: params.actorRole,
      safetyEvaluationId,
      now: params.now,
    })
  }

  return {
    guidance,
    safetyStatus: evaluation.status,
    safetySeverity:
      evaluation.highestSeverity === 'none' ? 'none' : evaluation.highestSeverity,
    safetyEvaluationId,
  }
}

export async function markThreadMessagesRead(
  ctx: MutationCtx,
  params: {
    threadId: string
    userId: Id<'users'>
    now: number
  }
): Promise<number> {
  const unreadMessages = await ctx.db
    .query('messages')
    .withIndex('by_threadId_and_read', q =>
      q.eq('threadId', params.threadId).eq('read', false)
    )
    .take(100)

  let marked = 0

  for (const message of unreadMessages) {
    if (message.senderUserId === params.userId) {
      continue
    }

    const existingReceipt = await ctx.db
      .query('messageReadReceipts')
      .withIndex('by_messageId_and_userId', q =>
        q.eq('messageId', message._id).eq('userId', params.userId)
      )
      .first()

    if (!existingReceipt) {
      await ctx.db.insert('messageReadReceipts', {
        messageId: message._id,
        threadId: params.threadId,
        userId: params.userId,
        readAt: params.now,
      })
      marked++
    }
  }

  return marked
}
