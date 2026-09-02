import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  alertDocValidator,
  alertSeverityValidator,
  alertStatusValidator,
} from './lib/validators'
import { requirePatientAccess, requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

/**
 * List clinical safety alerts.
 * Uses composite indexes to avoid in-memory filtering.
 * Restricted to clinicians and administrators.
 */
export const list = query({
  args: {
    orgId: v.optional(v.id('organizations')),
    status: v.optional(alertStatusValidator),
    severity: v.optional(alertSeverityValidator),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(alertDocValidator), v.array(alertDocValidator)),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin', 'clinician'])

    if (args.status && args.severity) {
      const q = ctx.db
        .query('alerts')
        .withIndex('by_status_and_severity', q =>
          q.eq('status', args.status!).eq('severity', args.severity!)
        )
      if (args.paginationOpts) {
        return await q.paginate(args.paginationOpts)
      }
      return await q.take(50)
    }

    if (args.status) {
      const q = ctx.db
        .query('alerts')
        .withIndex('by_status', q => q.eq('status', args.status!))
      if (args.paginationOpts) {
        return await q.paginate(args.paginationOpts)
      }
      return await q.take(50)
    }

    if (args.severity) {
      const q = ctx.db
        .query('alerts')
        .withIndex('by_severity', q => q.eq('severity', args.severity!))
      if (args.paginationOpts) {
        return await q.paginate(args.paginationOpts)
      }
      return await q.take(50)
    }

    const q = ctx.db.query('alerts').order('desc')
    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }
    return await q.take(50)
  },
})

/**
 * Create a new clinical alert or danger-sign notification.
 */
export const createAlert = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    detail: v.string(),
    severity: alertSeverityValidator,
    dangerSigns: v.optional(v.array(v.string())),
  },
  returns: v.id('alerts'),
  handler: async (ctx, args) => {
    const { patient } = await requirePatientAccess(ctx, args.patientId, 'receive_alerts')

    const validDetail = validateStringLength(args.detail, 'Alert detail', 2, 500)

    return await ctx.db.insert('alerts', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      orgId: patient.orgId,
      detail: validDetail,
      severity: args.severity,
      status: 'active',
      dangerSigns: args.dangerSigns,
      createdAt: Date.now(),
    })
  },
})

/**
 * Mark alert as resolved.
 * Restricted to clinicians and administrators.
 */
export const resolveAlert = mutation({
  args: { alertId: v.id('alerts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin', 'clinician'])

    const alert = await ctx.db.get(args.alertId)
    if (!alert) {
      throw new Error(`Alert ${args.alertId} not found.`)
    }

    await ctx.db.patch(args.alertId, {
      status: 'resolved',
      resolvedByUserId: user._id,
    })
    return null
  },
})

/**
 * Mark alert as acknowledged.
 * Restricted to clinicians and administrators.
 */
export const acknowledgeAlert = mutation({
  args: { alertId: v.id('alerts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin', 'clinician'])

    const alert = await ctx.db.get(args.alertId)
    if (!alert) {
      throw new Error(`Alert ${args.alertId} not found.`)
    }

    await ctx.db.patch(args.alertId, {
      status: 'acknowledged',
      acknowledgedByUserId: user._id,
    })
    return null
  },
})

