import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  consentGrantDocValidator,
  consentGrantWithGranteeValidator,
  consentScopeValidator,
  granteeRoleValidator,
  pendingInvitationValidator,
} from './lib/validators'
import { requirePatientAccess, requireRole, requireUser } from './lib/auth'
import { validateEmail, validateStringLength } from './lib/businessLogic'
import { formatPatientLabel, notifyAccessChange } from './lib/accessNotificationLogic'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

async function assertCanManageConsent(
  ctx: MutationCtx,
  patientId: Id<'patients'>,
  user: Doc<'users'>
): Promise<Doc<'patients'>> {
  const { patient } = await requirePatientAccess(ctx, patientId)
  if (user.role !== 'admin' && user._id !== patient.userId) {
    throw new Error('Forbidden: Only the patient or an organization admin can manage caregiver access.')
  }
  return patient
}

async function writeConsentAudit(
  ctx: MutationCtx,
  args: {
    actorUserId: Id<'users'>
    actorRole: string
    orgId?: Id<'organizations'>
    patientId: Id<'patients'>
    grantId: Id<'consentGrants'>
    event: string
    action: 'consent_grant' | 'consent_revoke'
  }
): Promise<void> {
  await ctx.db.insert('auditLogs', {
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    orgId: args.orgId,
    patientId: args.patientId,
    event: args.event,
    targetResource: 'consentGrants',
    resourceId: args.grantId,
    action: args.action,
    createdAt: Date.now(),
  })
}

async function resolveOrCreateCaregiverUser(
  ctx: MutationCtx,
  email: string,
  name: string
): Promise<Doc<'users'>> {
  const validEmail = validateEmail(email)
  const validName = validateStringLength(name, 'Name', 2, 100)

  const existing = await ctx.db
    .query('users')
    .withIndex('by_email', q => q.eq('email', validEmail))
    .first()

  if (existing) {
    if (existing.role !== 'caregiver' && existing.role !== 'patient') {
      throw new Error('This email belongs to an account that cannot be added as a caregiver.')
    }
    return existing
  }

  const userId = await ctx.db.insert('users', {
    tokenIdentifier: `invited|${validEmail}`,
    name: validName,
    email: validEmail,
    role: 'caregiver',
    status: 'Invited',
    createdAt: Date.now(),
  })

  const created = await ctx.db.get(userId)
  if (!created) {
    throw new Error('Failed to create caregiver user.')
  }
  return created
}

/**
 * Grant scoped, expiring consent to a caregiver or clinician.
 * Only the patient or an administrator can grant consent.
 */
export const grantConsent = mutation({
  args: {
    patientId: v.id('patients'),
    granteeUserId: v.id('users'),
    granteeRole: granteeRoleValidator,
    scopes: v.array(consentScopeValidator),
    relationship: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
  },
  returns: v.id('consentGrants'),
  handler: async (ctx, args) => {
    const { user } = await requirePatientAccess(ctx, args.patientId)
    const patient = await assertCanManageConsent(ctx, args.patientId, user)

    if (args.scopes.length === 0) {
      throw new Error('Consent grant must contain at least one permission scope.')
    }

    const grantee = await ctx.db.get(args.granteeUserId)
    if (!grantee) {
      throw new Error(`Target user ${args.granteeUserId} not found.`)
    }

    const now = Date.now()
    const expiresAt = args.expiresInDays ? now + args.expiresInDays * 86400000 : undefined
    const validRelationship = args.relationship
      ? validateStringLength(args.relationship, 'Relationship', 2, 50)
      : undefined

    const existing = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId_and_granteeUserId', q =>
        q.eq('patientId', args.patientId).eq('granteeUserId', args.granteeUserId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        granteeRole: args.granteeRole,
        scopes: args.scopes,
        relationship: validRelationship,
        status: 'active',
        grantedAt: now,
        expiresAt,
        invitedAt: existing.invitedAt ?? now,
        acceptedAt: now,
        invitedByUserId: existing.invitedByUserId ?? user._id,
        revokedAt: undefined,
        revokedByUserId: undefined,
      })

      await writeConsentAudit(ctx, {
        actorUserId: user._id,
        actorRole: user.role,
        orgId: patient.orgId,
        patientId: args.patientId,
        grantId: existing._id,
        event: `Updated consent grant for user ${grantee.name || grantee.email}`,
        action: 'consent_grant',
      })

      await notifyAccessChange(ctx, {
        recipientUserId: grantee._id,
        patientId: patient._id,
        consentGrantId: existing._id,
        type: 'consent_updated',
        title: 'Caregiver access updated',
        message: `${formatPatientLabel(patient)} updated what you can view in their recovery workspace.`,
      })

      return existing._id
    }

    const grantId = await ctx.db.insert('consentGrants', {
      patientId: args.patientId,
      granteeUserId: args.granteeUserId,
      granteeRole: args.granteeRole,
      scopes: args.scopes,
      relationship: validRelationship,
      status: 'active',
      grantedAt: now,
      expiresAt,
      invitedAt: now,
      acceptedAt: now,
      invitedByUserId: user._id,
    })

    await writeConsentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: args.patientId,
      grantId,
      event: `Granted consent to ${args.granteeRole} (${grantee.name || grantee.email})`,
      action: 'consent_grant',
    })

    await notifyAccessChange(ctx, {
      recipientUserId: grantee._id,
      patientId: patient._id,
      consentGrantId: grantId,
      type: 'consent_granted',
      title: 'Caregiver access granted',
      message: `${formatPatientLabel(patient)} shared recovery information with you.`,
    })

    return grantId
  },
})

/**
 * Invite a caregiver by email with selected scopes. Creates a pending grant until accepted.
 */
export const inviteCaregiver = mutation({
  args: {
    patientId: v.id('patients'),
    inviteeEmail: v.string(),
    inviteeName: v.string(),
    scopes: v.array(consentScopeValidator),
    relationship: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
  },
  returns: v.id('consentGrants'),
  handler: async (ctx, args) => {
    const { user } = await requirePatientAccess(ctx, args.patientId)
    const patient = await assertCanManageConsent(ctx, args.patientId, user)

    if (args.scopes.length === 0) {
      throw new Error('Select at least one category to share.')
    }

    const grantee = await resolveOrCreateCaregiverUser(ctx, args.inviteeEmail, args.inviteeName)
    const now = Date.now()
    const expiresAt = args.expiresInDays ? now + args.expiresInDays * 86400000 : undefined
    const validRelationship = args.relationship
      ? validateStringLength(args.relationship, 'Relationship', 2, 50)
      : undefined

    const existing = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId_and_granteeUserId', q =>
        q.eq('patientId', args.patientId).eq('granteeUserId', grantee._id)
      )
      .first()

    if (existing?.status === 'active') {
      throw new Error('This caregiver already has active access. Update their permissions instead.')
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        granteeRole: 'caregiver',
        scopes: args.scopes,
        relationship: validRelationship,
        status: 'pending',
        grantedAt: now,
        expiresAt,
        invitedAt: now,
        invitedByUserId: user._id,
        acceptedAt: undefined,
        revokedAt: undefined,
        revokedByUserId: undefined,
      })

      await writeConsentAudit(ctx, {
        actorUserId: user._id,
        actorRole: user.role,
        orgId: patient.orgId,
        patientId: args.patientId,
        grantId: existing._id,
        event: `Re-invited caregiver ${grantee.email}`,
        action: 'consent_grant',
      })

      await notifyAccessChange(ctx, {
        recipientUserId: grantee._id,
        patientId: patient._id,
        consentGrantId: existing._id,
        type: 'consent_invited',
        title: 'Caregiver invitation',
        message: `${formatPatientLabel(patient)} invited you to support their recovery. Review and accept the invitation.`,
      })

      return existing._id
    }

    const grantId = await ctx.db.insert('consentGrants', {
      patientId: args.patientId,
      granteeUserId: grantee._id,
      granteeRole: 'caregiver',
      scopes: args.scopes,
      relationship: validRelationship,
      status: 'pending',
      grantedAt: now,
      expiresAt,
      invitedAt: now,
      invitedByUserId: user._id,
    })

    await writeConsentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: args.patientId,
      grantId,
      event: `Invited caregiver ${grantee.email}`,
      action: 'consent_grant',
    })

    await notifyAccessChange(ctx, {
      recipientUserId: grantee._id,
      patientId: patient._id,
      consentGrantId: grantId,
      type: 'consent_invited',
      title: 'Caregiver invitation',
      message: `${formatPatientLabel(patient)} invited you to support their recovery. Review and accept the invitation.`,
    })

    return grantId
  },
})

/**
 * Caregiver accepts a pending invitation.
 */
export const acceptInvitation = mutation({
  args: {
    consentGrantId: v.id('consentGrants'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['caregiver'])
    const grant = await ctx.db.get(args.consentGrantId)

    if (!grant) {
      throw new Error('Invitation not found.')
    }

    if (grant.granteeUserId !== user._id) {
      throw new Error('Forbidden: This invitation is not addressed to you.')
    }

    if (grant.status !== 'pending') {
      throw new Error('This invitation is no longer pending.')
    }

    const patient = await ctx.db.get(grant.patientId)
    if (!patient) {
      throw new Error('Patient record not found.')
    }

    const now = Date.now()
    await ctx.db.patch(grant._id, {
      status: 'active',
      acceptedAt: now,
      grantedAt: now,
    })

    await writeConsentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: grant.patientId,
      grantId: grant._id,
      event: `Caregiver ${user.email} accepted invitation`,
      action: 'consent_grant',
    })

    if (patient.userId) {
      await notifyAccessChange(ctx, {
        recipientUserId: patient.userId,
        patientId: patient._id,
        consentGrantId: grant._id,
        type: 'consent_accepted',
        title: 'Caregiver invitation accepted',
        message: `${user.name ?? user.email} accepted your caregiver invitation.`,
      })
    }

    return null
  },
})

/**
 * Caregiver declines a pending invitation.
 */
export const declineInvitation = mutation({
  args: {
    consentGrantId: v.id('consentGrants'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['caregiver'])
    const grant = await ctx.db.get(args.consentGrantId)

    if (!grant) {
      throw new Error('Invitation not found.')
    }

    if (grant.granteeUserId !== user._id) {
      throw new Error('Forbidden: This invitation is not addressed to you.')
    }

    if (grant.status !== 'pending') {
      throw new Error('This invitation is no longer pending.')
    }

    const now = Date.now()
    await ctx.db.patch(grant._id, {
      status: 'revoked',
      revokedAt: now,
      revokedByUserId: user._id,
    })

    const patient = await ctx.db.get(grant.patientId)
    if (patient?.userId) {
      await notifyAccessChange(ctx, {
        recipientUserId: patient.userId,
        patientId: patient._id,
        consentGrantId: grant._id,
        type: 'consent_revoked',
        title: 'Caregiver invitation declined',
        message: `${user.name ?? user.email} declined your caregiver invitation.`,
      })
    }

    return null
  },
})

/**
 * Revoke an active consent grant immediately.
 */
export const revokeConsent = mutation({
  args: {
    consentGrantId: v.id('consentGrants'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const grant = await ctx.db.get(args.consentGrantId)
    if (!grant) {
      throw new Error(`Consent grant ${args.consentGrantId} not found.`)
    }

    const { user } = await requirePatientAccess(ctx, grant.patientId)
    const patient = await assertCanManageConsent(ctx, grant.patientId, user)

    const now = Date.now()
    await ctx.db.patch(grant._id, {
      status: 'revoked',
      revokedAt: now,
      revokedByUserId: user._id,
    })

    await writeConsentAudit(ctx, {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: grant.patientId,
      grantId: grant._id,
      event: `Revoked consent grant for user ${grant.granteeUserId}`,
      action: 'consent_revoke',
    })

    await notifyAccessChange(ctx, {
      recipientUserId: grant.granteeUserId,
      patientId: grant.patientId,
      consentGrantId: grant._id,
      type: 'consent_revoked',
      title: 'Caregiver access revoked',
      message: `${formatPatientLabel(patient)} removed your access to their recovery information.`,
    })

    return null
  },
})

/**
 * List all consent grants associated with a patient record.
 */
export const listGrantsByPatient = query({
  args: {
    patientId: v.id('patients'),
  },
  returns: v.array(consentGrantDocValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId)

    return await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(50)
  },
})

/**
 * List consent grants with grantee contact details for patient management UI.
 */
export const listGrantsWithGrantee = query({
  args: {
    patientId: v.id('patients'),
  },
  returns: v.array(consentGrantWithGranteeValidator),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId)

    const grants = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .take(50)

    const results = []
    for (const grant of grants) {
      const grantee = await ctx.db.get(grant.granteeUserId)
      results.push({
        grant,
        granteeName: grantee?.name ?? 'Caregiver',
        granteeEmail: grantee?.email ?? 'unknown',
      })
    }

    return results
  },
})

/**
 * Pending invitations for the signed-in caregiver.
 */
export const listPendingInvitations = query({
  args: {},
  returns: v.array(pendingInvitationValidator),
  handler: async ctx => {
    const { user } = await requireRole(ctx, ['caregiver'])

    const grants = await ctx.db
      .query('consentGrants')
      .withIndex('by_granteeUserId_and_status', q =>
        q.eq('granteeUserId', user._id).eq('status', 'pending')
      )
      .take(20)

    const results = []
    for (const grant of grants) {
      const patient = await ctx.db.get(grant.patientId)
      if (!patient) continue

      let inviterName: string | undefined
      if (grant.invitedByUserId) {
        const inviter = await ctx.db.get(grant.invitedByUserId)
        inviterName = inviter?.name ?? inviter?.email
      }

      results.push({
        grant,
        patientDisplayId: patient.displayId,
        patientName: formatPatientLabel(patient),
        inviterName,
      })
    }

    return results
  },
})

/**
 * List all patient profiles accessible to the calling caregiver.
 */
export const listAccessiblePatients = query({
  args: {},
  returns: v.array(v.object({
    patientId: v.id('patients'),
    displayId: v.string(),
    preferredName: v.optional(v.string()),
    scopes: v.array(consentScopeValidator),
    relationship: v.optional(v.string()),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })),
  handler: async ctx => {
    const { user } = await requireUser(ctx)

    if (user.role !== 'caregiver') {
      return []
    }

    const grants = await ctx.db
      .query('consentGrants')
      .withIndex('by_granteeUserId_and_status', q =>
        q.eq('granteeUserId', user._id).eq('status', 'active')
      )
      .take(50)

    const now = Date.now()
    const activeGrants = grants.filter(g => g.expiresAt === undefined || g.expiresAt > now)

    const results = []
    for (const grant of activeGrants) {
      const patient = await ctx.db.get(grant.patientId)
      if (patient) {
        results.push({
          patientId: patient._id,
          displayId: patient.displayId,
          preferredName: patient.preferredName,
          scopes: grant.scopes,
          relationship: grant.relationship,
          grantedAt: grant.grantedAt,
          expiresAt: grant.expiresAt,
        })
      }
    }

    return results
  },
})
