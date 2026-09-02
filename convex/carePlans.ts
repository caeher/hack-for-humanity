import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  carePlanAdherenceSummaryValidator,
  carePlanCategoryValidator,
  carePlanCompletionStatusValidator,
  carePlanDocValidator,
  carePlanEventDocValidator,
} from './lib/validators'
import { requireClinician, requirePatientAccess, requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import {
  buildAdherenceSummary,
  canPatientUpdateCompletion,
  completionStatusToCompleted,
  completionStatusToEventType,
  validateMedicationInstruction,
} from './lib/carePlanLogic'
import { getActiveCaregiverGrant, redactCarePlanForCaregiver } from './lib/caregiverAccess'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

async function recordCarePlanEvent(
  ctx: MutationCtx,
  args: {
    patientId: Id<'patients'>
    carePlanId?: Id<'carePlans'>
    actorUserId: Id<'users'>
    actorRole: string
    eventType: Doc<'carePlanEvents'>['eventType']
    summary: string
    previousStatus?: string
    newStatus?: string
    orgId: Id<'organizations'>
  }
) {
  const now = Date.now()
  await ctx.db.insert('carePlanEvents', {
    patientId: args.patientId,
    carePlanId: args.carePlanId,
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    eventType: args.eventType,
    summary: args.summary,
    previousStatus: args.previousStatus,
    newStatus: args.newStatus,
    createdAt: now,
  })

  await ctx.db.insert('auditLogs', {
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    orgId: args.orgId,
    patientId: args.patientId,
    event: args.summary,
    targetResource: 'carePlans',
    resourceId: args.carePlanId,
    action: args.eventType === 'created' ? 'create' : 'update',
    createdAt: now,
  })
}

/**
 * List care plan items for a patient.
 * Bounded to 100 maximum tasks.
 */
export const listByPatient = query({
  args: {
    patientId: v.id('patients'),
    limit: v.optional(v.number()),
  },
  returns: v.array(carePlanDocValidator),
  handler: async (ctx, args) => {
    const { user } = await requirePatientAccess(ctx, args.patientId, 'view_plan')

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)

    const tasks = await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(limit)

    if (user.role !== 'caregiver') {
      return tasks
    }

    const grant = await getActiveCaregiverGrant(ctx, args.patientId, user._id, Date.now())
    if (!grant) {
      throw new Error('Forbidden: Caregiver does not have active consent for this patient.')
    }

    return tasks.map(task => redactCarePlanForCaregiver(task, grant.scopes))
  },
})

/**
 * Neutral adherence summary — no punitive scoring language.
 */
export const getAdherenceSummary = query({
  args: { patientId: v.id('patients') },
  returns: carePlanAdherenceSummaryValidator,
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_plan')
    const items = await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(100)
    return buildAdherenceSummary(items)
  },
})

/**
 * Recent plan change history visible to authorized viewers.
 */
export const listEvents = query({
  args: {
    patientId: v.id('patients'),
    limit: v.optional(v.number()),
  },
  returns: v.array(carePlanEventDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId, 'view_plan')
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100)
    return await ctx.db
      .query('carePlanEvents')
      .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .take(limit)
  },
})

/**
 * Clinician-only: create a clinician-authored plan item.
 */
export const createItem = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    title: v.string(),
    description: v.optional(v.string()),
    category: carePlanCategoryValidator,
    medicationInstruction: v.optional(v.string()),
    targetTime: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    dayNumber: v.optional(v.number()),
    allowPatientCompletion: v.optional(v.boolean()),
  },
  returns: v.id('carePlans'),
  handler: async (ctx, args) => {
    const { user } = await requireClinician(ctx)
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    const validTitle = validateStringLength(args.title, 'Task title', 2, 200)
    const validDescription = args.description
      ? validateStringLength(args.description, 'Description', 1, 500)
      : undefined
    const validTargetTime = args.targetTime
      ? validateStringLength(args.targetTime, 'Target time', 1, 50)
      : undefined
    const validMedicationInstruction = args.medicationInstruction
      ? validateStringLength(args.medicationInstruction, 'Medication instruction', 2, 500)
      : undefined

    validateMedicationInstruction(args.category, validMedicationInstruction)

    const now = Date.now()
    const carePlanId = await ctx.db.insert('carePlans', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      assignedByUserId: user._id,
      title: validTitle,
      description: validDescription,
      category: args.category,
      medicationInstruction: validMedicationInstruction,
      targetTime: validTargetTime,
      scheduledDate: args.scheduledDate,
      completionStatus: 'pending',
      completed: false,
      allowPatientCompletion: args.allowPatientCompletion ?? true,
      isClinicianAuthored: true,
      dayNumber: args.dayNumber,
      createdAt: now,
      updatedAt: now,
      updatedByUserId: user._id,
    })

    await recordCarePlanEvent(ctx, {
      patientId: args.patientId,
      carePlanId,
      actorUserId: user._id,
      actorRole: user.role,
      eventType: 'created',
      summary: `Clinician added plan item: ${validTitle}`,
      newStatus: 'pending',
      orgId: patient.orgId,
    })

    return carePlanId
  },
})

/**
 * Clinician-only: materially update a clinical plan item.
 */
export const updateItem = mutation({
  args: {
    taskId: v.id('carePlans'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(carePlanCategoryValidator),
    medicationInstruction: v.optional(v.string()),
    targetTime: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    dayNumber: v.optional(v.number()),
    allowPatientCompletion: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireClinician(ctx)

    const task = await ctx.db.get(args.taskId)
    if (!task) {
      throw new Error(`Care plan task ${args.taskId} not found.`)
    }

    const { patient } = await requirePatientAccess(ctx, task.patientId)

    const category = args.category ?? task.category
    const medicationInstruction =
      args.medicationInstruction !== undefined
        ? validateStringLength(args.medicationInstruction, 'Medication instruction', 2, 500)
        : task.medicationInstruction

    validateMedicationInstruction(category, medicationInstruction)

    const now = Date.now()
    const patch: Partial<Doc<'carePlans'>> = {
      updatedAt: now,
      updatedByUserId: user._id,
    }

    if (args.title !== undefined) {
      patch.title = validateStringLength(args.title, 'Task title', 2, 200)
    }
    if (args.description !== undefined) {
      patch.description = validateStringLength(args.description, 'Description', 1, 500)
    }
    if (args.category !== undefined) patch.category = args.category
    if (args.medicationInstruction !== undefined) patch.medicationInstruction = medicationInstruction
    if (args.targetTime !== undefined) {
      patch.targetTime = validateStringLength(args.targetTime, 'Target time', 1, 50)
    }
    if (args.scheduledDate !== undefined) patch.scheduledDate = args.scheduledDate
    if (args.dayNumber !== undefined) patch.dayNumber = args.dayNumber
    if (args.allowPatientCompletion !== undefined) {
      patch.allowPatientCompletion = args.allowPatientCompletion
    }

    await ctx.db.patch(args.taskId, patch)

    await recordCarePlanEvent(ctx, {
      patientId: task.patientId,
      carePlanId: task._id,
      actorUserId: user._id,
      actorRole: user.role,
      eventType: 'updated',
      summary: `Clinician updated plan item: ${patch.title ?? task.title}`,
      orgId: patient.orgId,
    })

    return null
  },
})

/**
 * Patient/caregiver: update completion status (complete, skip, unable, reopen).
 */
export const updateCompletionStatus = mutation({
  args: {
    taskId: v.id('carePlans'),
    completionStatus: carePlanCompletionStatusValidator,
    statusNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const task = await ctx.db.get(args.taskId)
    if (!task) {
      throw new Error(`Care plan task ${args.taskId} not found.`)
    }

    const { patient } = await requirePatientAccess(ctx, task.patientId, 'log_proxy')

    if (!canPatientUpdateCompletion(task)) {
      throw new Error('This plan item cannot be updated by patients or caregivers.')
    }

    const validNote = args.statusNote
      ? validateStringLength(args.statusNote, 'Status note', 1, 300)
      : undefined

    const now = Date.now()
    const completed = completionStatusToCompleted(args.completionStatus)

    await ctx.db.patch(task._id, {
      completionStatus: args.completionStatus,
      statusNote: validNote,
      completed,
      completedAt: completed ? now : undefined,
      completedByUserId: completed ? user._id : undefined,
      updatedAt: now,
      updatedByUserId: user._id,
    })

    const eventType = completionStatusToEventType(args.completionStatus)
    await recordCarePlanEvent(ctx, {
      patientId: task.patientId,
      carePlanId: task._id,
      actorUserId: user._id,
      actorRole: user.role,
      eventType,
      summary: `Marked "${task.title}" as ${args.completionStatus.replace(/_/g, ' ')}`,
      previousStatus: task.completionStatus,
      newStatus: args.completionStatus,
      orgId: patient.orgId,
    })

    return null
  },
})

/**
 * @deprecated Use updateCompletionStatus. Kept for backward compatibility.
 */
export const toggleTask = mutation({
  args: {
    taskId: v.id('carePlans'),
    completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const task = await ctx.db.get(args.taskId)
    if (!task) {
      throw new Error(`Care plan task ${args.taskId} not found.`)
    }

    await requirePatientAccess(ctx, task.patientId, 'log_proxy')

    const completionStatus = args.completed ? 'completed' : 'pending'
    const now = Date.now()

    await ctx.db.patch(task._id, {
      completed: args.completed,
      completionStatus,
      completedAt: args.completed ? now : undefined,
      completedByUserId: args.completed ? user._id : undefined,
      updatedAt: now,
      updatedByUserId: user._id,
    })

    return null
  },
})

/**
 * @deprecated Use createItem (clinician-only). Patients cannot create clinical plan items.
 */
export const addTask = mutation({
  args: {
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    title: v.string(),
    category: carePlanCategoryValidator,
    targetTime: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    dayNumber: v.optional(v.number()),
  },
  returns: v.id('carePlans'),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['clinician', 'admin'])
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    const validTitle = validateStringLength(args.title, 'Task title', 2, 200)
    const validTargetTime = args.targetTime
      ? validateStringLength(args.targetTime, 'Target time', 1, 50)
      : undefined

    const completionStatus = args.completed ? 'completed' : 'pending'
    const now = Date.now()
    const carePlanId = await ctx.db.insert('carePlans', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      assignedByUserId: user._id,
      title: validTitle,
      category: args.category,
      targetTime: validTargetTime,
      completionStatus,
      completed: args.completed ?? false,
      allowPatientCompletion: true,
      isClinicianAuthored: true,
      dayNumber: args.dayNumber,
      createdAt: now,
      updatedAt: now,
      updatedByUserId: user._id,
    })

    await recordCarePlanEvent(ctx, {
      patientId: args.patientId,
      carePlanId,
      actorUserId: user._id,
      actorRole: user.role,
      eventType: 'created',
      summary: `Added plan item: ${validTitle}`,
      newStatus: completionStatus,
      orgId: patient.orgId,
    })

    return carePlanId
  },
})
