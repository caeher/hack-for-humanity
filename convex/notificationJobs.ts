import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import {
  buildSourceEventKey,
  createNotification,
  deepLinkForRole,
  sanitizeNotificationBody,
} from './lib/notificationLogic'
import { evaluateReminderDelivery } from './lib/reminderLogic'

/**
 * Processes active plan reminders and creates check-in reminder notifications.
 * External delivery may be skipped by consent/quiet hours; in-app record is always created.
 */
export const processDueReminders = internalMutation({
  args: {},
  returns: v.object({
    processed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const nowMs = Date.now()
    const dateKey = new Date(nowMs).toISOString().slice(0, 10)
    const localTimeHHMM = new Date(nowMs).toISOString().slice(11, 16)
    const allPatients = await ctx.db.query('patients').take(50)
    let processed = 0
    let skipped = 0

    for (const patient of allPatients) {
      const reminders = await ctx.db
        .query('planReminders')
        .withIndex('by_patientId_and_status', q =>
          q.eq('patientId', patient._id).eq('status', 'active')
        )
        .take(20)

      for (const reminder of reminders) {
        if (reminder.scheduledTime !== localTimeHHMM) {
          continue
        }

        const patientUser = await ctx.db.get(patient.userId)
        if (!patientUser) {
          skipped++
          continue
        }

        const delivery = evaluateReminderDelivery({
          patient,
          reminder,
          nowMs,
          localTimeHHMM,
        })

        const sourceEventKey = buildSourceEventKey(
          'check_in_reminder',
          'planReminders',
          reminder._id,
          patient.userId,
          dateKey
        )

        const result = await createNotification(ctx, {
          recipientUserId: patient.userId,
          type: 'check_in_reminder',
          priority: 'medium',
          title: 'Recovery check-in reminder',
          body: sanitizeNotificationBody(`Reminder: ${reminder.title}. Log your daily check-in when ready.`),
          sourceResourceType: 'planReminders',
          sourceResourceId: reminder._id,
          sourceEventKey,
          patientId: patient._id,
          orgId: patient.orgId,
          deepLinkPath: deepLinkForRole(patientUser.role, 'dashboard'),
          externalChannel: reminder.channel,
          attemptExternalDelivery: delivery.deliver,
          localTimeHHMM,
          timeZone: reminder.timeZone,
          nowMs,
        })

        if (result.isDuplicate) {
          skipped++
        } else {
          processed++
        }
      }
    }

    return { processed, skipped }
  },
})
