import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { messageDocValidator } from './lib/validators'
import { requireThreadParticipant } from './lib/auth'
import { sanitizeInput, validateStringLength } from './lib/businessLogic'

/**
 * List messages in a conversation thread.
 * Enforces participant authorization and uses index-based ordering.
 */
export const listByThread = query({
  args: {
    threadId: v.string(),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(messageDocValidator), v.array(messageDocValidator)),
  handler: async (ctx, args) => {
    const validThreadId = validateStringLength(args.threadId, 'Thread ID', 1, 100)
    await requireThreadParticipant(ctx, validThreadId)

    const q = ctx.db
      .query('messages')
      .withIndex('by_threadId_and_createdAt', q => q.eq('threadId', validThreadId))

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }
    return await q.take(100)
  },
})

/**
 * Send a message within a care team or patient thread.
 * Sender identity and role are derived securely server-side.
 */
export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    content: v.string(),
    recipientId: v.optional(v.string()),
  },
  returns: v.id('messages'),
  handler: async (ctx, args) => {
    const validThreadId = validateStringLength(args.threadId, 'Thread ID', 1, 100)
    const { user } = await requireThreadParticipant(ctx, validThreadId)

    const sanitizedContent = sanitizeInput(args.content)
    const validContent = validateStringLength(sanitizedContent, 'Message content', 1, 4000)

    const now = Date.now()
    const timestamp = new Date(now).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })

    return await ctx.db.insert('messages', {
      threadId: validThreadId,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      recipientId: args.recipientId,
      content: validContent,
      timestamp,
      createdAt: now,
      read: false,
    })
  },
})

/**
 * Mark unread messages in a thread as read.
 * Uses index by_threadId_and_read to eliminate table scans.
 */
export const markRead = mutation({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const validThreadId = validateStringLength(args.threadId, 'Thread ID', 1, 100)
    await requireThreadParticipant(ctx, validThreadId)

    const unread = await ctx.db
      .query('messages')
      .withIndex('by_threadId_and_read', q =>
        q.eq('threadId', validThreadId).eq('read', false)
      )
      .take(100)

    for (const msg of unread) {
      await ctx.db.patch('messages', msg._id, { read: true })
    }

    return null
  },
})
