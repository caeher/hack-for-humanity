import type { MutationCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import {
  buildSourceEventKey,
  createNotification,
  deepLinkForRole,
  sanitizeNotificationBody,
} from './notificationLogic'

export type AccessNotificationType =
  | 'consent_invited'
  | 'consent_accepted'
  | 'consent_granted'
  | 'consent_updated'
  | 'consent_revoked'

const ACCESS_TYPE_LABELS: Record<AccessNotificationType, string> = {
  consent_invited: 'Caregiver invitation',
  consent_accepted: 'Invitation accepted',
  consent_granted: 'Access granted',
  consent_updated: 'Access updated',
  consent_revoked: 'Access revoked',
}

export async function notifyAccessChange(
  ctx: MutationCtx,
  args: {
    recipientUserId: Id<'users'>
    patientId?: Id<'patients'>
    consentGrantId?: Id<'consentGrants'>
    type: AccessNotificationType
    title: string
    message: string
  }
): Promise<void> {
  const recipient = await ctx.db.get(args.recipientUserId)
  const patient = args.patientId ? await ctx.db.get(args.patientId) : null

  const resourceId = args.consentGrantId ?? args.patientId ?? 'access'
  const sourceEventKey = buildSourceEventKey(
    'caregiver_access',
    'consentGrants',
    resourceId,
    args.recipientUserId,
    args.type
  )

  await createNotification(ctx, {
    recipientUserId: args.recipientUserId,
    type: 'caregiver_access',
    priority: args.type === 'consent_revoked' ? 'high' : 'medium',
    title: args.title,
    body: sanitizeNotificationBody(
      `${ACCESS_TYPE_LABELS[args.type]}: ${args.message}`
    ),
    sourceResourceType: 'consentGrants',
    sourceResourceId: String(resourceId),
    sourceEventKey,
    patientId: args.patientId,
    orgId: patient?.orgId,
    deepLinkPath: recipient
      ? deepLinkForRole(recipient.role, 'caregiver-access')
      : '/patient/profile',
    locale: undefined,
    timeZone: patient?.timeZone,
  })
}

export function formatPatientLabel(patient: Doc<'patients'>): string {
  return patient.preferredName ?? patient.displayId
}
