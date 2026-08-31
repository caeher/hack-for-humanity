import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  args: {
    role: v.optional(
      v.union(
        v.literal('patient'),
        v.literal('caregiver'),
        v.literal('clinician'),
        v.literal('admin')
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.role) {
      return await ctx.db
        .query('users')
        .withIndex('by_role', q => q.eq('role', args.role!))
        .collect()
    }
    return await ctx.db.query('users').collect()
  },
})

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', args.email))
      .first()
  },
})

export const inviteUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', args.email))
      .first()

    if (existing) {
      throw new Error(`User with email ${args.email} already exists.`)
    }

    const userId = await ctx.db.insert('users', {
      ...args,
      status: 'Invited',
      createdAt: Date.now(),
    })

    // Add audit entry
    await ctx.db.insert('auditLogs', {
      time: 'Just now',
      actor: 'Admin',
      event: `Invited new ${args.role} user (${args.email})`,
      resource: args.email,
      createdAt: Date.now(),
    })

    return userId
  },
})
