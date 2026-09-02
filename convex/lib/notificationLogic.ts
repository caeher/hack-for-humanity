/**
 * Consent-aware notification creation, deduplication, and deep-link access checks.
 * In-app records are always created; external delivery respects consent and quiet hours.
 */

import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { evaluateReminderDelivery } from './reminderLogic'

export type NotificationType =
  | 'check_in_reminder'
  | 'plan_update'
  | 'message'
  | 'caregiver_access'
  | 'clinician_alert'
  | 'safety_guidance'

export type NotificationPriority = 'low' | 'medium' | 'high'

export type ExternalDeliveryStatus =
  | 'pending'
  | 'delivered'
  | 'failed'
  | 'skipped_consent'
  | 'skipped_quiet_hours'
  | 'skipped_channel_disabled'
  | 'not_applicable'

export const NOTIFICATION_DISCLAIMER =
  'Notifications are not emergency monitoring and may be delayed. They do not replace emergency care.'

export interface CreateNotificationInput {
  recipientUserId: Id<'users'>
  type: NotificationType
  priority: NotificationPriority
  title: string
  body: string
  sourceResourceType: string
  sourceResourceId: string
  sourceEventKey: string
  patientId?: Id<'patients'>
  orgId?: Id<'organizations'>
  deepLinkPath?: string
  externalChannel?: 'email' | 'sms'
  locale?: string
  timeZone?: string
  /** When true, external delivery is attempted but failure never blocks in-app record. */
  attemptExternalDelivery?: boolean
  localTimeHHMM?: string
  nowMs?: number
}

export interface CreateNotificationResult {
  notificationId: Id<'notifications'>
  isDuplicate: boolean
  externalDeliveryStatus: ExternalDeliveryStatus
}

export function sanitizeNotificationBody(text: string, maxLength = 280): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1)}…`
}

export function buildSourceEventKey(
  type: NotificationType,
  resourceType: string,
  resourceId: string,
  recipientUserId: string,
  suffix?: string
): string {
  const base = `${type}:${resourceType}:${resourceId}:${recipientUserId}`
  return suffix ? `${base}:${suffix}` : base
}

async function evaluateExternalDelivery(
  ctx: MutationCtx,
  input: CreateNotificationInput
): Promise<{ status: ExternalDeliveryStatus; error?: string }> {
  if (!input.attemptExternalDelivery || !input.externalChannel) {
    return { status: 'not_applicable' }
  }

  if (!input.patientId) {
    return { status: 'not_applicable' }
  }

  const patient = await ctx.db.get(input.patientId)
  if (!patient) {
    return { status: 'failed', error: 'Patient record not found for external delivery.' }
  }

  if (patient.notificationConsentRevokedAt !== undefined) {
    return { status: 'skipped_consent' }
  }

  const prefs = patient.communicationPreferences
  if (input.externalChannel === 'email' && prefs && !prefs.emailReminders) {
    return { status: 'skipped_channel_disabled' }
  }
  if (input.externalChannel === 'sms' && prefs && !prefs.smsReminders) {
    return { status: 'skipped_channel_disabled' }
  }

  if (input.localTimeHHMM) {
    const pseudoReminder: Doc<'planReminders'> = {
      _id: 'pseudo' as Id<'planReminders'>,
      _creationTime: 0,
      patientId: patient._id,
      title: input.title,
      channel: input.externalChannel,
      scheduledTime: input.localTimeHHMM,
      timeZone: input.timeZone ?? patient.timeZone ?? 'America/Los_Angeles',
      status: 'active',
      createdByUserId: input.recipientUserId,
      createdByRole: 'patient',
      createdAt: 0,
    }

    const decision = evaluateReminderDelivery({
      patient,
      reminder: pseudoReminder,
      nowMs: input.nowMs ?? Date.now(),
      localTimeHHMM: input.localTimeHHMM,
    })

    if (!decision.deliver && decision.reason === 'quiet_hours') {
      return { status: 'skipped_quiet_hours' }
    }
  }

  // Simulated external delivery — in production this would call email/SMS providers.
  // Failures are recorded but never suppress the in-app notification.
  try {
    return { status: 'delivered' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'External delivery failed.'
    return { status: 'failed', error: message }
  }
}

/**
 * Creates an in-app notification with idempotent deduplication by sourceEventKey.
 */
export async function createNotification(
  ctx: MutationCtx,
  input: CreateNotificationInput
): Promise<CreateNotificationResult> {
  const existing = await ctx.db
    .query('notifications')
    .withIndex('by_sourceEventKey', q => q.eq('sourceEventKey', input.sourceEventKey))
    .first()

  if (existing) {
    return {
      notificationId: existing._id,
      isDuplicate: true,
      externalDeliveryStatus: existing.externalDeliveryStatus ?? 'not_applicable',
    }
  }

  const external = await evaluateExternalDelivery(ctx, input)
  const now = input.nowMs ?? Date.now()

  const notificationId = await ctx.db.insert('notifications', {
    recipientUserId: input.recipientUserId,
    type: input.type,
    priority: input.priority,
    title: input.title,
    body: sanitizeNotificationBody(input.body),
    sourceResourceType: input.sourceResourceType,
    sourceResourceId: input.sourceResourceId,
    sourceEventKey: input.sourceEventKey,
    patientId: input.patientId,
    orgId: input.orgId,
    deepLinkPath: input.deepLinkPath,
    inAppDeliveryStatus: 'delivered',
    externalChannel: input.externalChannel,
    externalDeliveryStatus: external.status,
    externalDeliveryError: external.error,
    locale: input.locale,
    timeZone: input.timeZone,
    createdAt: now,
  })

  return {
    notificationId,
    isDuplicate: false,
    externalDeliveryStatus: external.status,
  }
}

/**
 * Checks whether the recipient still has access to the notification's deep link target.
 */
export async function canAccessDeepLink(
  ctx: QueryCtx,
  user: Doc<'users'>,
  notification: Doc<'notifications'>
): Promise<boolean> {
  if (!notification.deepLinkPath) {
    return false
  }

  if (notification.inAppDeliveryStatus === 'blocked_access') {
    return false
  }

  if (!notification.patientId) {
    return true
  }

  const patient = await ctx.db.get(notification.patientId)
  if (!patient) {
    return false
  }

  if (patient.userId === user._id) {
    return true
  }

  if (user.role === 'clinician' || user.role === 'admin') {
    if (user.role === 'clinician') {
      if (patient.primaryClinicianId === user._id) {
        return true
      }
      const membership = await ctx.db
        .query('clinicianMemberships')
        .withIndex('by_userId_and_orgId', q =>
          q.eq('userId', user._id).eq('orgId', patient.orgId)
        )
        .first()
      return membership?.status === 'active'
    }
    return true
  }

  if (user.role === 'caregiver') {
    const grant = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId_and_granteeUserId', q =>
        q.eq('patientId', patient._id).eq('granteeUserId', user._id)
      )
      .first()

    if (!grant || grant.status !== 'active') {
      return false
    }

    if (grant.expiresAt !== undefined && grant.expiresAt < Date.now()) {
      return false
    }

    const path = notification.deepLinkPath
    if (path.includes('/messages')) {
      return grant.scopes.includes('view_messages')
    }
    if (path.includes('/alerts') || notification.type === 'clinician_alert') {
      return grant.scopes.includes('receive_alerts')
    }
    if (path.includes('/care-plan') || path.includes('/plan')) {
      return grant.scopes.includes('view_plan')
    }
    if (path.includes('/check-in') || path.includes('/dashboard')) {
      return (
        grant.scopes.includes('view_symptoms') ||
        grant.scopes.includes('view_trends') ||
        grant.scopes.includes('view_plan')
      )
    }

    return grant.scopes.length > 0
  }

  return false
}

export async function getOrgClinicianUserIds(
  ctx: MutationCtx | QueryCtx,
  orgId: Id<'organizations'>
): Promise<Id<'users'>[]> {
  const memberships = await ctx.db
    .query('clinicianMemberships')
    .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', 'active'))
    .take(50)

  return memberships.map(m => m.userId)
}

export async function getAlertEligibleRecipients(
  ctx: MutationCtx,
  patient: Doc<'patients'>,
  excludeUserId?: Id<'users'>
): Promise<Id<'users'>[]> {
  const now = Date.now()
  const recipientIds = new Set<Id<'users'>>()

  const clinicianIds = await getOrgClinicianUserIds(ctx, patient.orgId)
  for (const id of clinicianIds) {
    if (id !== excludeUserId) {
      recipientIds.add(id)
    }
  }

  const grants = await ctx.db
    .query('consentGrants')
    .withIndex('by_patientId', q => q.eq('patientId', patient._id))
    .collect()

  for (const grant of grants) {
    if (
      grant.status === 'active' &&
      (grant.expiresAt === undefined || grant.expiresAt > now) &&
      grant.scopes.includes('receive_alerts') &&
      grant.granteeUserId !== excludeUserId
    ) {
      recipientIds.add(grant.granteeUserId)
    }
  }

  return [...recipientIds]
}

export async function getMessageRecipients(
  ctx: MutationCtx,
  thread: Doc<'messageThreads'>,
  senderUserId: Id<'users'>
): Promise<Id<'users'>[]> {
  const patient = await ctx.db.get(thread.patientId)
  if (!patient) {
    return []
  }

  const now = Date.now()
  const recipientIds = new Set<Id<'users'>>()

  if (patient.userId !== senderUserId) {
    recipientIds.add(patient.userId)
  }

  const grants = await ctx.db
    .query('consentGrants')
    .withIndex('by_patientId', q => q.eq('patientId', patient._id))
    .collect()

  for (const grant of grants) {
    if (
      grant.status === 'active' &&
      (grant.expiresAt === undefined || grant.expiresAt > now) &&
      grant.scopes.includes('view_messages') &&
      grant.granteeUserId !== senderUserId
    ) {
      recipientIds.add(grant.granteeUserId)
    }
  }

  const clinicianIds = await getOrgClinicianUserIds(ctx, thread.orgId)
  for (const id of clinicianIds) {
    if (id !== senderUserId) {
      recipientIds.add(id)
    }
  }

  return [...recipientIds]
}

export function deepLinkForRole(
  role: Doc<'users'>['role'],
  resource: 'messages' | 'alerts' | 'care-plan' | 'dashboard' | 'caregiver-access',
  query?: string
): string {
  const base =
    role === 'patient'
      ? '/patient'
      : role === 'caregiver'
        ? '/caregiver'
        : role === 'clinician'
          ? '/clinician'
          : '/admin'

  switch (resource) {
    case 'messages':
      return query ? `${base}/messages?${query}` : `${base}/messages`
    case 'alerts':
      return `${base}/alerts`
    case 'care-plan':
      return role === 'patient' ? '/patient/care-plan' : `${base}/dashboard`
    case 'caregiver-access':
      return '/patient/profile'
    case 'dashboard':
      return `${base}/dashboard`
    default: {
      const _exhaustive: never = resource
      return _exhaustive
    }
  }
}
