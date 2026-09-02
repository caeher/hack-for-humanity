import type { Doc } from '../_generated/dataModel'

export interface ReminderDeliveryContext {
  patient: Doc<'patients'>
  reminder: Doc<'planReminders'>
  nowMs: number
  localTimeHHMM: string
}

export type ReminderSkipReason =
  | 'consent_revoked'
  | 'channel_disabled'
  | 'quiet_hours'
  | 'reminder_revoked'
  | 'reminder_paused'

export type ReminderDeliveryDecision =
  | { deliver: true }
  | { deliver: false; reason: ReminderSkipReason }

const DEFAULT_QUIET_HOURS = { start: '21:00', end: '08:00' }

export function parseTimeToMinutes(time: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  if (!match) {
    throw new Error(`Invalid time format "${time}". Expected HH:MM.`)
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value "${time}".`)
  }
  return hours * 60 + minutes
}

export function isWithinQuietHours(
  localTimeHHMM: string,
  quietHours: { start: string; end: string } = DEFAULT_QUIET_HOURS
): boolean {
  const current = parseTimeToMinutes(localTimeHHMM)
  const start = parseTimeToMinutes(quietHours.start)
  const end = parseTimeToMinutes(quietHours.end)

  if (start === end) return false
  if (start < end) {
    return current >= start && current < end
  }
  return current >= start || current < end
}

export function evaluateReminderDelivery(ctx: ReminderDeliveryContext): ReminderDeliveryDecision {
  if (ctx.reminder.status === 'revoked') {
    return { deliver: false, reason: 'reminder_revoked' }
  }
  if (ctx.reminder.status === 'paused') {
    return { deliver: false, reason: 'reminder_paused' }
  }

  if (ctx.patient.notificationConsentRevokedAt !== undefined) {
    return { deliver: false, reason: 'consent_revoked' }
  }

  const prefs = ctx.patient.communicationPreferences
  if (ctx.reminder.channel === 'email' && prefs && !prefs.emailReminders) {
    return { deliver: false, reason: 'channel_disabled' }
  }
  if (ctx.reminder.channel === 'sms' && prefs && !prefs.smsReminders) {
    return { deliver: false, reason: 'channel_disabled' }
  }

  const quietHours = ctx.patient.quietHours ?? DEFAULT_QUIET_HOURS
  if (isWithinQuietHours(ctx.localTimeHHMM, quietHours)) {
    return { deliver: false, reason: 'quiet_hours' }
  }

  return { deliver: true }
}

export function formatDeliverySkipReason(reason: ReminderSkipReason): string {
  switch (reason) {
    case 'consent_revoked':
      return 'Notification consent was revoked.'
    case 'channel_disabled':
      return 'This reminder channel is turned off in profile preferences.'
    case 'quiet_hours':
      return 'Reminder deferred during quiet hours.'
    case 'reminder_revoked':
      return 'This reminder was revoked.'
    case 'reminder_paused':
      return 'This reminder is paused.'
    default: {
      const _exhaustive: never = reason
      return _exhaustive
    }
  }
}
