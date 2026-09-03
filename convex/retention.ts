import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { requireRole } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import {
  legalHoldDocValidator,
  legalHoldStatusValidator,
  legalHoldTypeValidator,
  retentionRunDocValidator,
} from './lib/validators'
import { isPatientUnderLegalHold } from './lib/retentionLogic'

/**
 * Apply a legal, clinical, or regulatory hold.
 * Prohibits any retention purging or account deletion for the covered patient or org.
 * Authorized for Clinicians and Organization Administrators.
 */
export const applyLegalHold = mutation({
  args: {
    orgId: v.id('organizations'),
    patientId: v.optional(v.id('patients')),
    holdType: legalHoldTypeValidator,
    reason: v.string(),
    notes: v.optional(v.string()),
  },
  returns: v.id('legalHolds'),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin', 'clinician'])

    const validReason = validateStringLength(args.reason, 'Hold reason', 3, 500)
    const validNotes = args.notes
      ? validateStringLength(args.notes, 'Hold notes', 1, 1000)
      : undefined

    const now = Date.now()

    const holdId = await ctx.db.insert('legalHolds', {
      orgId: args.orgId,
      patientId: args.patientId,
      holdType: args.holdType,
      reason: validReason,
      appliedByUserId: user._id,
      status: 'active',
      appliedAt: now,
      notes: validNotes,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: args.orgId,
      patientId: args.patientId,
      event: `Applied ${args.holdType} hold: ${validReason}`,
      targetResource: 'legalHolds',
      resourceId: holdId,
      action: 'legal_hold_apply',
      result: 'success',
      createdAt: now,
    })

    return holdId
  },
})

/**
 * Release an active legal hold.
 * Restricted to Organization Administrators.
 */
export const releaseLegalHold = mutation({
  args: {
    holdId: v.id('legalHolds'),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin'])

    const hold = await ctx.db.get(args.holdId)
    if (!hold) {
      throw new Error('Legal hold not found.')
    }

    if (hold.status === 'released') {
      return null // Idempotent
    }

    const now = Date.now()
    const appendNotes = args.notes ? `\nRelease note: ${args.notes}` : ''

    await ctx.db.patch(args.holdId, {
      status: 'released',
      releasedAt: now,
      releasedByUserId: user._id,
      notes: (hold.notes ?? '') + appendNotes,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: hold.orgId,
      patientId: hold.patientId,
      event: `Released ${hold.holdType} hold: ${hold.reason}`,
      targetResource: 'legalHolds',
      resourceId: hold._id,
      action: 'legal_hold_release',
      result: 'success',
      createdAt: now,
    })

    return null
  },
})

/**
 * List legal holds for an organization.
 * Accessible to Administrators and Clinicians.
 */
export const listLegalHolds = query({
  args: {
    orgId: v.optional(v.id('organizations')),
    status: v.optional(legalHoldStatusValidator),
  },
  returns: v.array(legalHoldDocValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin', 'clinician'])

    if (args.orgId && args.status) {
      return await ctx.db
        .query('legalHolds')
        .withIndex('by_orgId_and_status', q =>
          q.eq('orgId', args.orgId!).eq('status', args.status!)
        )
        .order('desc')
        .take(100)
    }

    if (args.orgId) {
      return await ctx.db
        .query('legalHolds')
        .withIndex('by_orgId_and_status', q => q.eq('orgId', args.orgId!))
        .order('desc')
        .take(100)
    }

    return await ctx.db.query('legalHolds').order('desc').take(100)
  },
})

/**
 * Internal automated statutory retention job.
 * Idempotent, bounded batch execution, observable via retentionRuns and auditLogs.
 * Honors active legal holds and safeguards patient records.
 */
export const runScheduledRetentionJob = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    maxBatchSize: v.optional(v.number()),
  },
  returns: v.object({
    runId: v.id('retentionRuns'),
    recordsScanned: v.number(),
    recordsEligible: v.number(),
    recordsPurged: v.number(),
    recordsRetainedDueToHold: v.number(),
  }),
  handler: async (ctx, args) => {
    const startedAt = Date.now()
    const isDryRun = args.dryRun ?? false
    const batchSize = Math.min(Math.max(args.maxBatchSize ?? 100, 1), 500)

    let recordsScanned = 0
    let recordsEligible = 0
    let recordsPurged = 0
    let recordsRetainedDueToHold = 0
    const errors: string[] = []

    // 1. Scan ephemeral read notifications older than 90 days
    const NINETY_DAYS_MS = 90 * 86400000
    const notificationCutoff = startedAt - NINETY_DAYS_MS

    try {
      const candidateNotifications = await ctx.db
        .query('notifications')
        .order('asc')
        .take(batchSize)

      for (const n of candidateNotifications) {
        recordsScanned++
        const isExpiredRead = Boolean(n.readAt && n.readAt < notificationCutoff)
        const isStaleNotification = n.createdAt < startedAt - 180 * 86400000

        if (isExpiredRead || isStaleNotification) {
          recordsEligible++
          if (n.patientId) {
            const holdCheck = await isPatientUnderLegalHold(ctx, n.patientId, n.orgId)
            if (holdCheck.isBlocked) {
              recordsRetainedDueToHold++
              continue
            }
          }

          if (!isDryRun) {
            await ctx.db.delete(n._id)
            recordsPurged++
          }
        }
      }
    } catch (err) {
      errors.push(`Notification retention scan error: ${String(err)}`)
    }

    // 2. Scan orphaned clerk webhook events older than 30 days
    const THIRTY_DAYS_MS = 30 * 86400000
    const webhookCutoff = startedAt - THIRTY_DAYS_MS

    try {
      const candidateWebhooks = await ctx.db
        .query('clerkWebhookEvents')
        .withIndex('by_status_and_receivedAt', q => q.eq('status', 'processed'))
        .take(batchSize)

      for (const w of candidateWebhooks) {
        recordsScanned++
        if (w.receivedAt < webhookCutoff) {
          recordsEligible++
          if (!isDryRun) {
            await ctx.db.delete(w._id)
            recordsPurged++
          }
        }
      }
    } catch (err) {
      errors.push(`Webhook retention scan error: ${String(err)}`)
    }

    const completedAt = Date.now()

    // 3. Record observable retention run metrics
    const runId = await ctx.db.insert('retentionRuns', {
      jobName: 'statutory_retention_purge',
      startedAt,
      completedAt,
      status: isDryRun ? 'dry_run' : errors.length > 0 ? 'failed' : 'completed',
      recordsScanned,
      recordsEligible,
      recordsPurged,
      recordsRetainedDueToHold,
      errors,
    })

    return {
      runId,
      recordsScanned,
      recordsEligible,
      recordsPurged,
      recordsRetainedDueToHold,
    }
  },
})

/**
 * Get recent retention run executions for administrative observability.
 */
export const getRetentionRuns = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(retentionRunDocValidator),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin'])
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100)
    return await ctx.db.query('retentionRuns').order('desc').take(limit)
  },
})
