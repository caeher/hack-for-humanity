import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  alertDocValidator,
  alertSeverityValidator,
  alertStatusValidator,
} from './lib/validators'
import { requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

/**
 * List clinical safety alerts.
 * Uses composite indexes to avoid in-memory filtering.
 * Restricted to clinicians and administrators.
 */
export const list = query({
  args: {
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
    patientId: v.optional(v.string()),
    patientName: v.string(),
    detail: v.string(),
    severity: alertSeverityValidator,
  },
  returns: v.id('alerts'),
  handler: async (ctx, args) => {
    await requireUser(ctx)

    const validPatientName = validateStringLength(args.patientName, 'Patient name', 2, 100)
    const validDetail = validateStringLength(args.detail, 'Alert detail', 2, 500)
    const validPatientId = args.patientId
      ? validateStringLength(args.patientId, 'Patient ID', 1, 64)
      : undefined

    return await ctx.db.insert('alerts', {
      patientId: validPatientId,
      patientName: validPatientName,
      detail: validDetail,
      severity: args.severity,
      status: 'active',
      createdAt: Date.now(),
      timeAgo: 'Just now',
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
    await requireRole(ctx, ['admin', 'clinician'])

    const alert = await ctx.db.get('alerts', args.alertId)
    if (!alert) {
      throw new Error(`Alert ${args.alertId} not found.`)
    }

    await ctx.db.patch('alerts', args.alertId, { status: 'resolved' })
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
    await requireRole(ctx, ['admin', 'clinician'])

    const alert = await ctx.db.get('alerts', args.alertId)
    if (!alert) {
      throw new Error(`Alert ${args.alertId} not found.`)
    }

    await ctx.db.patch('alerts', args.alertId, { status: 'acknowledged' })
    return null
  },
})
