import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listByPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .collect()
  },
})

export const getLatest = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .first()
  },
})

export const submitCheckIn = mutation({
  args: {
    patientId: v.string(),
    date: v.string(),
    painScore: v.number(),
    sleepScore: v.number(),
    mobilityScore: v.number(),
    emotionalScore: v.number(),
    symptomQuality: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('checkIns', {
      ...args,
      createdAt: Date.now(),
    })
  },
})
