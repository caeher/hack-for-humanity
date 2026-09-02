import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  alertSeverityValidator,
  alertStatusValidator,
  clinicalAlertViewValidator,
} from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import { requireAlertOrgAccess, requireClinicianOrg } from './lib/clinicianAuth'
import { validateStringLength } from './lib/businessLogic'
import {
  formatAlertFreshness,
  isAlertVisibleInQueue,
  resolveAlertProvenance,
} from './lib/caseloadLogic'

import { MutationCtx } from './_generated/server'
import { Id } from './_generated/dataModel'

async function writeAlertAudit(
  ctx: MutationCtx,
  args: {
    actorUserId: Id<'users'>
    actorRole: string
    orgId: Id<'organizations'>
    patientId: Id<'patients'>
    alertId: Id<'alerts'>
    event: string
    action: 'update' | 'safety_acknowledgement'
    now: number
  }
): Promise<void> {
  await ctx.db.insert('auditLogs', {
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    orgId: args.orgId,
    patientId: args.patientId,
    event: args.event,
    targetResource: 'alerts',
    resourceId: args.alertId,
    action: args.action,
    createdAt: args.now,
  })
}

/**
 * List clinical alerts scoped to the caller's organization caseload.
 */
export const list = query({
  args: {
    status: v.optional(alertStatusValidator),
    severity: v.optional(alertSeverityValidator),
    unassignedOnly: v.optional(v.boolean()),
    includeResolved: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(clinicalAlertViewValidator),
  handler: async (ctx, args) => {
    const { orgId } = await requireClinicianOrg(ctx)
    const now = Date.now()

    let queryBuilder
    if (args.status) {
      queryBuilder = ctx.db
        .query('alerts')
        .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', args.status!))
    } else {
      queryBuilder = ctx.db
        .query('alerts')
        .withIndex('by_orgId_and_createdAt', q => q.eq('orgId', orgId))
        .order('desc')
    }

    const page: Array<{
      alert: import('./_generated/dataModel').Doc<'alerts'>
      patientDisplayId: string
      patientName: string
      assignedToName: string | null
      isUnassigned: boolean
      freshnessLabel: string
      provenance: ReturnType<typeof resolveAlertProvenance>
    }> = []

    let cursor = args.paginationOpts.cursor
    let isDone = false

    while (page.length < args.paginationOpts.numItems && !isDone) {
      const batch = await queryBuilder.paginate({
        numItems: args.paginationOpts.numItems,
        cursor,
      })

      for (const alert of batch.page) {
        if (!args.includeResolved && alert.status === 'resolved') {
          continue
        }
        if (!isAlertVisibleInQueue(alert, now)) {
          continue
        }
        if (args.severity && alert.severity !== args.severity) {
          continue
        }
        if (args.unassignedOnly && alert.assignedToUserId) {
          continue
        }

        const patient = await ctx.db.get(alert.patientId)
        if (!patient) {
          continue
        }

        const patientUser = await ctx.db.get(patient.userId)
        const assignee = alert.assignedToUserId
          ? await ctx.db.get(alert.assignedToUserId)
          : null

        page.push({
          alert,
          patientDisplayId: patient.displayId,
          patientName: patient.preferredName ?? patientUser?.name ?? patient.displayId,
          assignedToName: assignee?.name ?? null,
          isUnassigned: !alert.assignedToUserId,
          freshnessLabel: formatAlertFreshness(alert.createdAt, now),
          provenance: resolveAlertProvenance(alert),
        })
      }

      cursor = batch.continueCursor
      isDone = batch.isDone
      if (batch.page.length === 0) {
        isDone = true
      }
    }

    return {
      page,
      continueCursor: isDone ? '' : (cursor ?? ''),
      isDone,
    }
  },
})

/**
 * List clinical alerts for a specific patient (clinician workspace).
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    includeResolved: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(clinicalAlertViewValidator),
  handler: async (ctx, args) => {
    const { patient } = await requirePatientAccess(ctx, args.patientId, 'view_plan')
    const limit = Math.min(args.limit ?? 20, 50)

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_patientId', q => q.eq('patientId', patient._id))
      .order('desc')
      .take(limit)

    const filtered = args.includeResolved
      ? alerts
      : alerts.filter(alert => alert.status !== 'resolved')

    const views = []
    for (const alert of filtered) {
      const assignedTo = alert.assignedToUserId
        ? await ctx.db.get(alert.assignedToUserId)
        : null
      const patientUser = await ctx.db.get(patient.userId)

      views.push({
        alert,
        patientDisplayId: patient.displayId,
        patientName: patient.preferredName ?? patientUser?.name ?? patient.displayId,
        assignedToName: assignedTo?.name ?? null,
        isUnassigned: !alert.assignedToUserId,
        freshnessLabel: formatAlertFreshness(alert.createdAt, Date.now()),
        provenance: resolveAlertProvenance(alert),
      })
    }

    return views
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
 * Mark alert as resolved with audit trail.
 */
export const resolveAlert = mutation({
  args: {
    alertId: v.id('alerts'),
    resolutionNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { context, alert } = await requireAlertOrgAccess(ctx, args.alertId)
    const now = Date.now()

    await ctx.db.patch(args.alertId, {
      status: 'resolved',
      resolvedByUserId: context.user._id,
      resolvedAt: now,
      updatedAt: now,
    })

    await writeAlertAudit(ctx, {
      actorUserId: context.user._id,
      actorRole: context.user.role,
      orgId: alert.orgId,
      patientId: alert.patientId,
      alertId: alert._id,
      event: args.resolutionNote
        ? `Resolved alert: ${args.resolutionNote}`
        : 'Resolved clinical alert',
      action: 'update',
      now,
    })

    return null
  },
})

/**
 * Mark alert as acknowledged with audit trail.
 */
export const acknowledgeAlert = mutation({
  args: { alertId: v.id('alerts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { context, alert } = await requireAlertOrgAccess(ctx, args.alertId)
    const now = Date.now()

    await ctx.db.patch(args.alertId, {
      status: 'acknowledged',
      acknowledgedByUserId: context.user._id,
      acknowledgedAt: now,
      updatedAt: now,
    })

    await writeAlertAudit(ctx, {
      actorUserId: context.user._id,
      actorRole: context.user.role,
      orgId: alert.orgId,
      patientId: alert.patientId,
      alertId: alert._id,
      event: 'Acknowledged clinical alert',
      action: 'safety_acknowledgement',
      now,
    })

    return null
  },
})

/**
 * Assign alert to a clinician within the same organization.
 */
export const assignAlert = mutation({
  args: {
    alertId: v.id('alerts'),
    assigneeUserId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { context, alert } = await requireAlertOrgAccess(ctx, args.alertId)
    const now = Date.now()

    const assigneeMembership = await ctx.db
      .query('clinicianMemberships')
      .withIndex('by_userId_and_orgId', q =>
        q.eq('userId', args.assigneeUserId).eq('orgId', context.orgId)
      )
      .first()

    if (!assigneeMembership || assigneeMembership.status !== 'active') {
      throw new Error('Assignee must be an active clinician in your organization.')
    }

    const assignee = await ctx.db.get(args.assigneeUserId)
    if (!assignee) {
      throw new Error('Assignee user not found.')
    }

    await ctx.db.patch(args.alertId, {
      assignedToUserId: args.assigneeUserId,
      updatedAt: now,
    })

    await writeAlertAudit(ctx, {
      actorUserId: context.user._id,
      actorRole: context.user.role,
      orgId: alert.orgId,
      patientId: alert.patientId,
      alertId: alert._id,
      event: `Assigned alert to ${assignee.name}`,
      action: 'update',
      now,
    })

    return null
  },
})

/**
 * Snooze an alert with documented reason until a future timestamp.
 */
export const snoozeAlert = mutation({
  args: {
    alertId: v.id('alerts'),
    snoozeUntil: v.number(),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { context, alert } = await requireAlertOrgAccess(ctx, args.alertId)
    const now = Date.now()
    const reason = validateStringLength(args.reason, 'Snooze reason', 5, 500)

    if (args.snoozeUntil <= now) {
      throw new Error('Snooze until must be in the future.')
    }

    await ctx.db.patch(args.alertId, {
      status: 'snoozed',
      snoozedUntil: args.snoozeUntil,
      snoozeReason: reason,
      updatedAt: now,
    })

    await writeAlertAudit(ctx, {
      actorUserId: context.user._id,
      actorRole: context.user.role,
      orgId: alert.orgId,
      patientId: alert.patientId,
      alertId: alert._id,
      event: `Snoozed alert until ${new Date(args.snoozeUntil).toISOString()}: ${reason}`,
      action: 'update',
      now,
    })

    return null
  },
})

/**
 * Priority alerts preview for dashboard cards (top active items).
 */
export const listPriority = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(clinicalAlertViewValidator),
  handler: async (ctx, args) => {
    const { orgId } = await requireClinicianOrg(ctx)
    const now = Date.now()
    const limit = Math.min(args.limit ?? 5, 20)

    const alerts = await ctx.db
      .query('alerts')
      .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', 'active'))
      .order('desc')
      .take(limit * 3)

    const views = []
    for (const alert of alerts) {
      if (!isAlertVisibleInQueue(alert, now)) {
        continue
      }
      const patient = await ctx.db.get(alert.patientId)
      if (!patient) {
        continue
      }
      const patientUser = await ctx.db.get(patient.userId)
      const assignee = alert.assignedToUserId
        ? await ctx.db.get(alert.assignedToUserId)
        : null

      views.push({
        alert,
        patientDisplayId: patient.displayId,
        patientName: patient.preferredName ?? patientUser?.name ?? patient.displayId,
        assignedToName: assignee?.name ?? null,
        isUnassigned: !alert.assignedToUserId,
        freshnessLabel: formatAlertFreshness(alert.createdAt, now),
        provenance: resolveAlertProvenance(alert),
      })

      if (views.length >= limit) {
        break
      }
    }

    return views
  },
})
