import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { auditActionValidator, auditLogDocValidator } from './lib/validators'
import { requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

/**
 * List recent security and compliance audit logs.
 * Restricted strictly to Organization Administrators.
 */
export const listRecent = query({
  args: {
    orgId: v.optional(v.id('organizations')),
    limit: v.optional(v.number()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(
    paginationResultValidator(auditLogDocValidator),
    v.array(auditLogDocValidator)
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin'])

    if (args.orgId) {
      const q = ctx.db
        .query('auditLogs')
        .withIndex('by_orgId_and_createdAt', q => q.eq('orgId', args.orgId!))
        .order('desc')

      if (args.paginationOpts) {
        return await q.paginate(args.paginationOpts)
      }

      const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
      return await q.take(limit)
    }

    const q = ctx.db.query('auditLogs').withIndex('by_createdAt').order('desc')

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
    return await q.take(limit)
  },
})

/**
 * Record an audit log entry.
 * Actor identity is securely verified and derived from caller profile.
 */
export const logAction = mutation({
  args: {
    event: v.string(),
    targetResource: v.string(),
    resourceId: v.optional(v.string()),
    orgId: v.optional(v.id('organizations')),
    patientId: v.optional(v.id('patients')),
    action: auditActionValidator,
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id('auditLogs'),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const validEvent = validateStringLength(args.event, 'Audit event', 2, 200)
    const validTargetResource = validateStringLength(args.targetResource, 'Target resource', 1, 100)
    const now = Date.now()

    return await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: args.orgId,
      patientId: args.patientId,
      event: validEvent,
      targetResource: validTargetResource,
      resourceId: args.resourceId,
      action: args.action,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: now,
    })
  },
})

