import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const logs = await ctx.db.query('auditLogs').collect()
    const sorted = logs.sort((a, b) => b.createdAt - a.createdAt)
    if (args.limit) {
      return sorted.slice(0, args.limit)
    }
    return sorted
  },
})

export const logAction = mutation({
  args: {
    time: v.string(),
    actor: v.string(),
    event: v.string(),
    resource: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('auditLogs', {
      ...args,
      createdAt: Date.now(),
    })
  },
})
