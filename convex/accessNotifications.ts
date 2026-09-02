import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { accessNotificationDocValidator } from './lib/validators'
import { requireUser } from './lib/auth'

/**
 * @deprecated Use notifications.listForMe — kept for backward compatibility.
 */
export const listForMe = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(accessNotificationDocValidator),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50)

    const items = await ctx.db
      .query('notifications')
      .withIndex('by_recipientUserId_and_createdAt', q => q.eq('recipientUserId', user._id))
      .order('desc')
      .take(limit)

    return items
      .filter(n => n.type === 'caregiver_access')
      .map(n => ({
        _id: n._id as unknown as import('./_generated/dataModel').Id<'accessNotifications'>,
        _creationTime: n._creationTime,
        recipientUserId: n.recipientUserId,
        patientId: n.patientId,
        consentGrantId: n.sourceResourceType === 'consentGrants'
          ? (n.sourceResourceId as import('./_generated/dataModel').Id<'consentGrants'>)
          : undefined,
        type: mapCaregiverAccessSubtype(n.body),
        title: n.title,
        message: n.body,
        readAt: n.readAt,
        createdAt: n.createdAt,
      }))
  },
})

function mapCaregiverAccessSubtype(
  body: string
): 'consent_invited' | 'consent_accepted' | 'consent_granted' | 'consent_updated' | 'consent_revoked' {
  if (body.includes('revoked')) return 'consent_revoked'
  if (body.includes('invitation') || body.includes('invited')) return 'consent_invited'
  if (body.includes('accepted')) return 'consent_accepted'
  if (body.includes('updated')) return 'consent_updated'
  return 'consent_granted'
}

/**
 * @deprecated Use notifications.markRead.
 */
export const markRead = mutation({
  args: {
    notificationId: v.id('accessNotifications'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const notification = await ctx.db.get(
      args.notificationId as unknown as import('./_generated/dataModel').Id<'notifications'>
    )

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
