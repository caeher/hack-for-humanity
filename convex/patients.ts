import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  args: {
    risk: v.optional(v.union(v.literal('Stable'), v.literal('Review'), v.literal('Elevated'))),
  },
  handler: async (ctx, args) => {
    if (args.risk) {
      return await ctx.db
        .query('patients')
        .withIndex('by_risk', q => q.eq('risk', args.risk!))
        .collect()
    }
    return await ctx.db.query('patients').collect()
  },
})

export const getById = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .first()
  },
})

export const create = mutation({
  args: {
    patientId: v.string(),
    name: v.string(),
    procedure: v.string(),
    day: v.number(),
    score: v.number(),
    risk: v.union(v.literal('Stable'), v.literal('Review'), v.literal('Elevated')),
    adherence: v.number(),
    surgeon: v.optional(v.string()),
    caregiverId: v.optional(v.string()),
    caregiverName: v.optional(v.string()),
    surgeryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .first()

    if (existing) {
      throw new Error(`Patient with ID ${args.patientId} already exists.`)
    }

    return await ctx.db.insert('patients', args)
  },
})

export const updateScore = mutation({
  args: {
    patientId: v.string(),
    score: v.number(),
    adherence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .first()

    if (!patient) {
      throw new Error(`Patient ${args.patientId} not found.`)
    }

    await ctx.db.patch(patient._id, {
      score: args.score,
      ...(args.adherence !== undefined ? { adherence: args.adherence } : {}),
    })
  },
})

export const updateRisk = mutation({
  args: {
    patientId: v.string(),
    risk: v.union(v.literal('Stable'), v.literal('Review'), v.literal('Elevated')),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .first()

    if (!patient) {
      throw new Error(`Patient ${args.patientId} not found.`)
    }

    await ctx.db.patch(patient._id, { risk: args.risk })
  },
})
