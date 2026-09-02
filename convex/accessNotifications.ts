import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { accessNotificationDocValidator } from './lib/validators'
import { requireUser } from './lib/auth'

/**
 * List unread and recent access-change notifications for the signed-in user.
 */
export const listForMe = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(accessNotificationDocValidator),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50)

    return await ctx.db
      .query('accessNotifications')
      .withIndex('by_recipientUserId_and_createdAt', q => q.eq('recipientUserId', user._id))
      .order('desc')
      .take(limit)
  },
})

/**
 * Mark a notification as read.
 */
export const markRead = mutation({
  args: {
    notificationId: v.id('accessNotifications'),
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
