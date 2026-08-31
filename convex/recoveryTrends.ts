import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listByPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('recoveryTrends')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .collect()
  },
})

export const addTrendPoint = mutation({
  args: {
    patientId: v.string(),
    day: v.string(),
    score: v.number(),
    pain: v.number(),
    mobility: v.number(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('recoveryTrends', args)
  },
})
