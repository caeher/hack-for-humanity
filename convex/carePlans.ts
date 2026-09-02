import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { carePlanDocValidator } from './lib/validators'
import { requirePatientAccess } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

/**
 * List care plan items for a patient.
 * Bounded to 100 maximum tasks.
 */
export const listByPatient = query({
  args: {
    patientId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(carePlanDocValidator),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100)

    return await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
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
    const task = await ctx.db.get('carePlans', args.taskId)
    if (!task) {
      throw new Error(`Care plan task ${args.taskId} not found.`)
    }

    // Verify ownership on parent patient resource
    await requirePatientAccess(ctx, task.patientId)

    await ctx.db.patch('carePlans', task._id, { completed: args.completed })
    return null
  },
})

/**
 * Add a new item or task to patient care plan.
 */
export const addTask = mutation({
  args: {
    patientId: v.string(),
    title: v.string(),
    category: v.string(),
    targetTime: v.optional(v.string()),
    completed: v.boolean(),
    dayNumber: v.optional(v.number()),
  },
  returns: v.id('carePlans'),
  handler: async (ctx, args) => {
    const validPatientId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validPatientId)

    const validTitle = validateStringLength(args.title, 'Task title', 2, 200)
    const validCategory = validateStringLength(args.category, 'Category', 2, 50)
    const validTargetTime = args.targetTime
      ? validateStringLength(args.targetTime, 'Target time', 1, 50)
      : undefined

    return await ctx.db.insert('carePlans', {
      patientId: validPatientId,
      title: validTitle,
      category: validCategory,
      targetTime: validTargetTime,
      completed: args.completed,
      dayNumber: args.dayNumber,
    })
  },
})
