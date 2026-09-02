import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  messageWithSenderValidator,
  messageThreadSummaryValidator,
  sendMessageResultValidator,
} from './lib/validators'
import { requireUser } from './lib/auth'
import { listAccessibleThreadDocs, requireThreadAccess } from './lib/messageAuth'
import {
  buildMessagePreview,
  countUnreadMessages,
  evaluateMessageSafety,
  markThreadMessagesRead,
  writeMessageAuditLog,
} from './lib/messageLogic'
import { sanitizeInput, validateStringLength } from './lib/businessLogic'

/**
 * List care-team conversation threads accessible to the authenticated caller.
 */
export const listThreads = query({
  args: {},
  returns: v.array(messageThreadSummaryValidator),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx)
    const threads = await listAccessibleThreadDocs(ctx, user)

    const summaries = []

    for (const thread of threads) {
      const patient = await ctx.db.get(thread.patientId)
      if (!patient) {
        continue
      }

      const unreadCount = await countUnreadMessages(ctx, thread.externalThreadId, user._id)

      summaries.push({
        threadId: thread.externalThreadId,
        title: thread.title,
        patientId: thread.patientId,
        patientDisplayId: patient.displayId,
        lastMessageAt: thread.lastMessageAt,
        lastMessagePreview: thread.lastMessagePreview,
        unreadCount,
        status: thread.status,
      })
    }

    return summaries.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  },
})

/**
 * List messages in a conversation thread with cursor-based pagination.
 */
export const listByThread = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(messageWithSenderValidator),
  handler: async (ctx, args) => {
    const validThreadId = validateStringLength(args.threadId, 'Thread ID', 1, 100)
    const { user } = await requireThreadAccess(ctx, validThreadId, 'view')

    const page = await ctx.db
      .query('messages')
      .withIndex('by_threadId_and_createdAt', q => q.eq('threadId', validThreadId))
      .order('desc')
      .paginate(args.paginationOpts)

    const enrichedPage = []

    for (const message of page.page) {
      const sender = await ctx.db.get(message.senderUserId)
      enrichedPage.push({
        _id: message._id,
        _creationTime: message._creationTime,
        threadId: message.threadId,
        senderUserId: message.senderUserId,
        senderName: sender?.name ?? sender?.email ?? 'Care team member',
        senderRole: sender?.role ?? 'clinician',
        content: message.content,
        clientMessageId: message.clientMessageId,
        safetyStatus: message.safetyStatus,
        createdAt: message.createdAt,
        isMine: message.senderUserId === user._id,
      })
    }

    return {
      ...page,
      page: enrichedPage,
    }
  },
})

/**
 * Send a message within a care team thread.
 * Sender identity is derived server-side. Supports idempotent retries via clientMessageId.
 */
export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    content: v.string(),
    clientMessageId: v.optional(v.string()),
  },
  returns: sendMessageResultValidator,
  handler: async (ctx, args) => {
    const validThreadId = validateStringLength(args.threadId, 'Thread ID', 1, 100)
    const { user, thread, patient } = await requireThreadAccess(ctx, validThreadId, 'send')

    const sanitizedContent = sanitizeInput(args.content)
    const validContent = validateStringLength(sanitizedContent, 'Message content', 1, 4000)

    if (args.clientMessageId) {
      const validClientMessageId = validateStringLength(
        args.clientMessageId,
        'Client message ID',
        8,
        128
      )

      const existing = await ctx.db
        .query('messages')
        .withIndex('by_threadId_and_clientMessageId', q =>
          q.eq('threadId', validThreadId).eq('clientMessageId', validClientMessageId)
        )
        .first()

      if (existing) {
        return {
          messageId: existing._id,
          clientMessageId: validClientMessageId,
          isDuplicate: true,
        }
      }
    }

    const now = Date.now()

    const safety = await evaluateMessageSafety(ctx, {
      content: validContent,
      patient,
      episodeId: thread.episodeId,
      actorUserId: user._id,
      actorRole: user.role,
      now,
    })

    const messageId = await ctx.db.insert('messages', {
      threadId: validThreadId,
      senderUserId: user._id,
      patientId: patient._id,
      orgId: thread.orgId,
      content: validContent,
      clientMessageId: args.clientMessageId,
      safetyStatus: safety.safetyStatus,
      safetySeverity: safety.safetySeverity,
      createdAt: now,
      read: false,
    })

    await ctx.db.patch(thread._id, {
      lastMessageAt: now,
      lastMessagePreview: buildMessagePreview(validContent),
    })

    await writeMessageAuditLog(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: thread.orgId,
      patientId: patient._id,
      threadId: validThreadId,
      messageId,
      action: 'create',
      now,
    })

    return {
      messageId,
      clientMessageId: args.clientMessageId,
      isDuplicate: false,
      safetyGuidance: safety.guidance,
    }
  },
})

/**
 * Mark messages from other participants as read for the current user.
 */
export const markRead = mutation({
  args: { threadId: v.string() },
  returns: v.object({ markedCount: v.number() }),
  handler: async (ctx, args) => {
    const validThreadId = validateStringLength(args.threadId, 'Thread ID', 1, 100)
    const { user, thread, patient } = await requireThreadAccess(ctx, validThreadId, 'view')

    const now = Date.now()
    const markedCount = await markThreadMessagesRead(ctx, {
      threadId: validThreadId,
      userId: user._id,
      now,
    })

    if (markedCount > 0) {
      await writeMessageAuditLog(ctx, {
        actorUserId: user._id,
        actorRole: user.role,
        orgId: thread.orgId,
        patientId: patient._id,
        threadId: validThreadId,
        action: 'read',
        now,
      })
    }

    return { markedCount }
  },
})

/**
 * Return aggregate unread counts across accessible threads.
 */
export const getUnreadSummary = query({
  args: {},
  returns: v.object({
    totalUnread: v.number(),
    threadCount: v.number(),
  }),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx)
    const threads = await listAccessibleThreadDocs(ctx, user)

    let totalUnread = 0

    for (const thread of threads) {
      totalUnread += await countUnreadMessages(ctx, thread.externalThreadId, user._id)
    }

    return {
      totalUnread,
      threadCount: threads.length,
    }
  },
})
