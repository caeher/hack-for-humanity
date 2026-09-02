import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  planReminderDocValidator,
  reminderChannelValidator,
  reminderStatusValidator,
} from './lib/validators'
import { requireClinician, requirePatientAccess, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import { evaluateReminderDelivery, formatDeliverySkipReason } from './lib/reminderLogic'

/**
 * List reminders for a patient.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    status: v.optional(reminderStatusValidator),
  },
  returns: v.array(planReminderDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_plan')

    const reminders = await ctx.db
      .query('planReminders')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(50)

    if (!args.status) return reminders
    return reminders.filter(reminder => reminder.status === args.status)
  },
})

/**
 * Create a plan reminder. Patients may create personal reminders; clinicians may link to plan items.
 */
export const create = mutation({
  args: {
    patientId: v.id('patients'),
    carePlanId: v.optional(v.id('carePlans')),
    title: v.string(),
    channel: reminderChannelValidator,
    scheduledTime: v.string(),
    timeZone: v.optional(v.string()),
  },
  returns: v.id('planReminders'),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const { patient } = await requirePatientAccess(ctx, args.patientId, 'log_proxy')

    if (user.role === 'caregiver' && patient.userId !== user._id) {
      // Caregivers with log_proxy can add supportive reminders
    } else if (user.role === 'patient' && patient.userId !== user._id) {
      throw new Error('Forbidden: Cannot create reminders for another patient.')
    }

    const validTitle = validateStringLength(args.title, 'Reminder title', 2, 200)
    const validTime = validateStringLength(args.scheduledTime, 'Scheduled time', 4, 8)
    const timeZone = args.timeZone ?? patient.timeZone ?? 'America/Los_Angeles'

    const now = Date.now()
    const reminderId = await ctx.db.insert('planReminders', {
      patientId: args.patientId,
      carePlanId: args.carePlanId,
      title: validTitle,
      channel: args.channel,
      scheduledTime: validTime,
      timeZone,
      status: 'active',
      createdByUserId: user._id,
      createdByRole: user.role,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Created reminder: ${validTitle}`,
      targetResource: 'planReminders',
      resourceId: reminderId,
      action: 'create',
      createdAt: now,
    })

    return reminderId
  },
})

/**
 * Clinician: create a reminder tied to a care plan item.
 */
export const createForPlanItem = mutation({
  args: {
    carePlanId: v.id('carePlans'),
    channel: reminderChannelValidator,
    scheduledTime: v.string(),
  },
  returns: v.id('planReminders'),
  handler: async (ctx, args) => {
    const { user } = await requireClinician(ctx)

    const planItem = await ctx.db.get(args.carePlanId)
    if (!planItem) {
      throw new Error(`Care plan item ${args.carePlanId} not found.`)
    }

    const { patient } = await requirePatientAccess(ctx, planItem.patientId)
    const validTime = validateStringLength(args.scheduledTime, 'Scheduled time', 4, 8)
    const now = Date.now()

    const reminderId = await ctx.db.insert('planReminders', {
      patientId: planItem.patientId,
      carePlanId: planItem._id,
      title: planItem.title,
      channel: args.channel,
      scheduledTime: validTime,
      timeZone: patient.timeZone ?? 'America/Los_Angeles',
      status: 'active',
      createdByUserId: user._id,
      createdByRole: user.role,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Clinician scheduled reminder for plan item: ${planItem.title}`,
      targetResource: 'planReminders',
      resourceId: reminderId,
      action: 'create',
      createdAt: now,
    })

    return reminderId
  },
})

/**
 * Pause or revoke a reminder.
 */
export const updateStatus = mutation({
  args: {
    reminderId: v.id('planReminders'),
    status: reminderStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const reminder = await ctx.db.get(args.reminderId)
    if (!reminder) {
      throw new Error(`Reminder ${args.reminderId} not found.`)
    }

    const { patient } = await requirePatientAccess(ctx, reminder.patientId, 'log_proxy')

    const now = Date.now()
    await ctx.db.patch(reminder._id, {
      status: args.status,
      revokedAt: args.status === 'revoked' ? now : reminder.revokedAt,
      updatedAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Reminder "${reminder.title}" set to ${args.status}`,
      targetResource: 'planReminders',
      resourceId: reminder._id,
      action: 'update',
      createdAt: now,
    })

    return null
  },
})

/**
 * Evaluate whether a reminder may be delivered now (consent, quiet hours, revocation).
 */
export const evaluateDelivery = query({
  args: {
    reminderId: v.id('planReminders'),
    localTimeHHMM: v.string(),
    nowMs: v.number(),
  },
  returns: v.object({
    deliver: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId)
    if (!reminder) {
      throw new Error(`Reminder ${args.reminderId} not found.`)
    }

    const { patient } = await requirePatientAccess(ctx, reminder.patientId, 'view_plan')

    const decision = evaluateReminderDelivery({
      patient,
      reminder,
      nowMs: args.nowMs,
      localTimeHHMM: args.localTimeHHMM,
    })

    if (decision.deliver) {
      return { deliver: true }
    }

    return {
      deliver: false,
      reason: formatDeliverySkipReason(decision.reason),
    }
  },
})
