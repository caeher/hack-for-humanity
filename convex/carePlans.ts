import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listByPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .collect()
  },
})

export const toggleTask = mutation({
  args: {
    taskId: v.id('carePlans'),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, { completed: args.completed })
  },
})

export const addTask = mutation({
  args: {
    patientId: v.string(),
    title: v.string(),
    category: v.string(),
    targetTime: v.optional(v.string()),
    completed: v.boolean(),
    dayNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('carePlans', args)
  },
})
