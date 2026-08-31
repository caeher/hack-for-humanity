import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  args: {
    status: v.optional(
      v.union(v.literal('active'), v.literal('acknowledged'), v.literal('resolved'))
    ),
    severity: v.optional(v.union(v.literal('High'), v.literal('Medium'), v.literal('Low'))),
  },
  handler: async (ctx, args) => {
    const alerts = args.status
      ? await ctx.db
          .query('alerts')
          .withIndex('by_status', q => q.eq('status', args.status!))
          .collect()
      : await ctx.db.query('alerts').collect()

    if (args.severity) {
      return alerts.filter(a => a.severity === args.severity)
    }

    return alerts.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const createAlert = mutation({
  args: {
    patientId: v.optional(v.string()),
    patientName: v.string(),
    detail: v.string(),
    severity: v.union(v.literal('High'), v.literal('Medium'), v.literal('Low')),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('alerts', {
      ...args,
      status: 'active',
      createdAt: Date.now(),
      timeAgo: 'Just now',
    })
  },
})

export const resolveAlert = mutation({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { status: 'resolved' })
  },
})

export const acknowledgeAlert = mutation({
  args: { alertId: v.id('alerts') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, { status: 'acknowledged' })
  },
})
