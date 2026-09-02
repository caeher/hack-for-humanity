import { v } from 'convex/values'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { mutation, query } from './_generated/server'
import {
  deepLinkResolutionValidator,
  notificationListItemValidator,
} from './lib/validators'
import { requireUser } from './lib/auth'
import { canAccessDeepLink } from './lib/notificationLogic'

/**
 * Paginated notification list for the signed-in recipient.
 */
export const listForMe = query({
  args: {
    paginationOpts: paginationOptsValidator,
    unreadOnly: v.optional(v.boolean()),
  },
  returns: paginationResultValidator(notificationListItemValidator),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const result = await ctx.db
      .query('notifications')
      .withIndex('by_recipientUserId_and_createdAt', q => q.eq('recipientUserId', user._id))
      .order('desc')
      .paginate(args.paginationOpts)

    const page = []

    for (const notification of result.page) {
      if (args.unreadOnly && notification.readAt !== undefined) {
        continue
      }

      const deepLinkAccessible = await canAccessDeepLink(ctx, user, notification)

      page.push({
        _id: notification._id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        body: notification.body,
        deepLinkPath: deepLinkAccessible ? notification.deepLinkPath : undefined,
        deepLinkAccessible,
        readAt: notification.readAt,
        isUnread: notification.readAt === undefined,
        createdAt: notification.createdAt,
        externalDeliveryStatus: notification.externalDeliveryStatus,
      })
    }

    return { ...result, page }
  },
})

/**
 * Live unread count for the header bell badge.
 */
export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx)

    const recent = await ctx.db
      .query('notifications')
      .withIndex('by_recipientUserId_and_createdAt', q => q.eq('recipientUserId', user._id))
      .order('desc')
      .take(100)

    return recent.filter(n => n.readAt === undefined && n.inAppDeliveryStatus === 'delivered').length
  },
})

/**
 * Mark a single notification as read.
 */
export const markRead = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const notification = await ctx.db.get(args.notificationId)

    if (!notification) {
      throw new Error('Notification not found.')
    }

    if (notification.recipientUserId !== user._id) {
      throw new Error('Forbidden: Cannot update another user’s notification.')
    }

    if (notification.readAt === undefined) {
      await ctx.db.patch(notification._id, { readAt: Date.now() })
    }

    return null
  },
})

/**
 * Mark a single notification as unread.
 */
export const markUnread = mutation({
  args: {
    notificationId: v.id('notifications'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const notification = await ctx.db.get(args.notificationId)

    if (!notification) {
      throw new Error('Notification not found.')
    }

    if (notification.recipientUserId !== user._id) {
      throw new Error('Forbidden: Cannot update another user’s notification.')
    }

    if (notification.readAt !== undefined) {
      await ctx.db.patch(notification._id, { readAt: undefined })
    }

    return null
  },
})

/**
 * Mark all notifications as read for the current user.
 */
export const markAllRead = mutation({
  args: {},
  returns: v.object({ markedCount: v.number() }),
  handler: async (ctx) => {
    const { user } = await requireUser(ctx)
    const now = Date.now()

    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_recipientUserId_and_createdAt', q => q.eq('recipientUserId', user._id))
      .order('desc')
      .take(100)

    let markedCount = 0
    for (const notification of unread) {
      if (notification.readAt === undefined) {
        await ctx.db.patch(notification._id, { readAt: now })
        markedCount++
      }
    }

    return { markedCount }
  },
})

/**
 * Resolve whether a deep link is still accessible (revoked consent blocks navigation).
 */
export const resolveDeepLink = query({
  args: {
    notificationId: v.id('notifications'),
  },
  returns: deepLinkResolutionValidator,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const notification = await ctx.db.get(args.notificationId)

    if (!notification) {
      return { accessible: false, reason: 'Notification not found.' }
    }

    if (notification.recipientUserId !== user._id) {
      return { accessible: false, reason: 'Forbidden.' }
    }

    if (!notification.deepLinkPath) {
      return { accessible: false, reason: 'No linked record for this notification.' }
    }

    const accessible = await canAccessDeepLink(ctx, user, notification)

    if (!accessible) {
      return {
        accessible: false,
        reason: 'Access to this record was revoked or expired.',
      }
    }

    return { accessible: true, path: notification.deepLinkPath }
  },
})
