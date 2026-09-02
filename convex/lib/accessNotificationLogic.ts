import type { MutationCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'

export type AccessNotificationType =
  | 'consent_invited'
  | 'consent_accepted'
  | 'consent_granted'
  | 'consent_updated'
  | 'consent_revoked'

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
  await ctx.db.insert('accessNotifications', {
    recipientUserId: args.recipientUserId,
    patientId: args.patientId,
    consentGrantId: args.consentGrantId,
    type: args.type,
    title: args.title,
    message: args.message,
    createdAt: Date.now(),
  })
}

export function formatPatientLabel(patient: Doc<'patients'>): string {
  return patient.preferredName ?? patient.displayId
}
