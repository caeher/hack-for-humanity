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
    const { user } = await requireRole(ctx, ['admin'])

    if (args.orgId) {
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_userId_and_orgId', q =>
          q.eq('userId', user._id).eq('orgId', args.orgId!)
        )
        .first()

      if (!membership || membership.orgRole !== 'admin' || membership.status !== 'active') {
        throw new Error('Forbidden: Organization admin access required.')
      }

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

    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .collect()

    const adminOrgIds = memberships
      .filter(m => m.orgRole === 'admin' && m.status === 'active')
      .map(m => m.orgId)

    if (adminOrgIds.length === 0) {
      throw new Error('Forbidden: Organization admin access required.')
    }

    const primaryOrgId = adminOrgIds[0]
    const q = ctx.db
      .query('auditLogs')
      .withIndex('by_orgId_and_createdAt', q => q.eq('orgId', primaryOrgId))
      .order('desc')

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

