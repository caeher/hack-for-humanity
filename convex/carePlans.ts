import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { carePlanCategoryValidator, carePlanDocValidator } from './lib/validators'
import { requirePatientAccess, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

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
    await requirePatientAccess(ctx, args.patientId, 'view_plan')

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)

    return await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(limit)
  },
})

/**
 * Toggle care plan task completion status.
 * Verifies caller has access to the parent patient record before patching.
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

    // Verify access on parent patient resource
    await requirePatientAccess(ctx, task.patientId, 'log_proxy')

    const now = Date.now()
    await ctx.db.patch(task._id, {
      completed: args.completed,
      completedAt: args.completed ? now : undefined,
      completedByUserId: args.completed ? user._id : undefined,
    })

    return null
  },
})

/**
 * Add a new pacing item or task to patient care plan.
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
    const { user } = await requirePatientAccess(ctx, args.patientId)

    const validTitle = validateStringLength(args.title, 'Task title', 2, 200)
    const validTargetTime = args.targetTime
      ? validateStringLength(args.targetTime, 'Target time', 1, 50)
      : undefined

    const now = Date.now()
    return await ctx.db.insert('carePlans', {
      patientId: args.patientId,
      episodeId: args.episodeId,
      assignedByUserId: user._id,
      title: validTitle,
      category: args.category,
      targetTime: validTargetTime,
      completed: args.completed ?? false,
      dayNumber: args.dayNumber,
      createdAt: now,
    })
  },
})

