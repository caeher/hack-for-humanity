import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listByThread = query({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_threadId', q => q.eq('threadId', args.threadId))
      .collect()

    return messages.sort((a, b) => a.createdAt - b.createdAt)
  },
})

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderRole: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    recipientId: v.optional(v.string()),
    content: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('messages', {
      ...args,
      createdAt: Date.now(),
      read: false,
    })
  },
})

export const markRead = mutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query('messages')
      .withIndex('by_threadId', q => q.eq('threadId', args.threadId))
      .filter(q => q.eq(q.field('read'), false))
      .collect()

    for (const msg of unread) {
      await ctx.db.patch(msg._id, { read: true })
    }
  },
})
