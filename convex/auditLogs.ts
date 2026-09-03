import { v } from 'convex/values'
import { mutation, query, QueryCtx } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  auditActionValidator,
  auditLogDocValidator,
  auditResultValidator,
} from './lib/validators'
import { requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import { Doc } from './_generated/dataModel'

/**
 * Hydrates an audit log document with the actor's display name and masked email.
 */
async function hydrateAuditLog(ctx: QueryCtx, log: Doc<'auditLogs'>) {
  const actor = await ctx.db.get(log.actorUserId)
  return {
    ...log,
    actorName: actor?.name ?? 'Unknown User',
    actorEmail: actor?.email ? maskEmail(actor.email) : undefined,
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!domain || user.length <= 2) return email
  const visible = user.slice(0, 2)
  return `${visible}***@${domain}`
}

/**
 * List security and compliance audit logs with indexing and pagination.
 * Restricted strictly to active Organization Administrators.
 */
export const listRecent = query({
  args: {
    orgId: v.optional(v.id('organizations')),
    action: v.optional(auditActionValidator),
    targetResource: v.optional(v.string()),
    result: v.optional(auditResultValidator),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    limit: v.optional(v.number()),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(
    paginationResultValidator(auditLogDocValidator),
    v.array(auditLogDocValidator)
  ),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin'])

    let effectiveOrgId = args.orgId

    if (effectiveOrgId) {
      const membership = await ctx.db
        .query('organizationMemberships')
        .withIndex('by_userId_and_orgId', q =>
          q.eq('userId', user._id).eq('orgId', effectiveOrgId!)
        )
        .first()

      if (!membership || membership.orgRole !== 'admin' || membership.status !== 'active') {
        throw new Error('Forbidden: Organization admin access required.')
      }
    } else {
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

      effectiveOrgId = adminOrgIds[0]
    }

    if (args.action) {
      const actionQuery = ctx.db
        .query('auditLogs')
        .withIndex('by_orgId_and_action', q =>
          q.eq('orgId', effectiveOrgId!).eq('action', args.action!)
        )
        .order('desc')

      if (args.paginationOpts) {
        const paged = await actionQuery.paginate(args.paginationOpts)
        const hydrated = await Promise.all(paged.page.map(log => hydrateAuditLog(ctx, log)))
        return {
          ...paged,
          page: hydrated,
        }
      }
      const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
      const docs = await actionQuery.take(limit)
      return await Promise.all(docs.map(log => hydrateAuditLog(ctx, log)))
    }

    if (args.targetResource) {
      const resourceQuery = ctx.db
        .query('auditLogs')
        .withIndex('by_orgId_and_targetResource', q =>
          q.eq('orgId', effectiveOrgId!).eq('targetResource', args.targetResource!)
        )
        .order('desc')

      if (args.paginationOpts) {
        const paged = await resourceQuery.paginate(args.paginationOpts)
        const hydrated = await Promise.all(paged.page.map(log => hydrateAuditLog(ctx, log)))
        return {
          ...paged,
          page: hydrated,
        }
      }
      const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
      const docs = await resourceQuery.take(limit)
      return await Promise.all(docs.map(log => hydrateAuditLog(ctx, log)))
    }

    // Standard chronological audit log query
    const baseQuery = ctx.db
      .query('auditLogs')
      .withIndex('by_orgId_and_createdAt', q => q.eq('orgId', effectiveOrgId!))
      .order('desc')

    if (args.paginationOpts) {
      const paged = await baseQuery.paginate(args.paginationOpts)
      const hydrated = await Promise.all(paged.page.map(log => hydrateAuditLog(ctx, log)))
      return {
        ...paged,
        page: hydrated,
      }
    }

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
    const docs = await baseQuery.take(limit)
    return await Promise.all(docs.map(log => hydrateAuditLog(ctx, log)))
  },
})

/**
 * Record an audit log entry.
 * Actor identity is securely verified and derived from caller profile.
 * Payload sanitization invariant: Event and resource strings MUST NOT contain
 * clinical notes or full message bodies.
 */
export const logAction = mutation({
  args: {
    event: v.string(),
    targetResource: v.string(),
    resourceId: v.optional(v.string()),
    orgId: v.optional(v.id('organizations')),
    patientId: v.optional(v.id('patients')),
    action: auditActionValidator,
    result: v.optional(auditResultValidator),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.id('auditLogs'),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const validEvent = validateStringLength(args.event, 'Audit event', 2, 250)
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
      result: args.result ?? 'success',
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: now,
    })
  },
})

