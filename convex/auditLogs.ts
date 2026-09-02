import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { auditLogDocValidator } from './lib/validators'
import { requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

/**
 * List recent security and compliance audit logs.
 * Restricted strictly to Organization Administrators.
 */
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(
    paginationResultValidator(auditLogDocValidator),
    v.array(auditLogDocValidator)
  ),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin'])

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
    resource: v.string(),
    time: v.optional(v.string()),
  },
  returns: v.id('auditLogs'),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const validEvent = validateStringLength(args.event, 'Audit event', 2, 200)
    const validResource = validateStringLength(args.resource, 'Audit resource', 1, 200)
    const now = Date.now()

    return await ctx.db.insert('auditLogs', {
      time: args.time || 'Just now',
      actor: user.name || user.email,
      event: validEvent,
      resource: validResource,
      createdAt: now,
    })
  },
})
