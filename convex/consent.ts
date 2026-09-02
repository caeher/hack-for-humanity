import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  consentGrantDocValidator,
  consentScopeValidator,
  granteeRoleValidator,
} from './lib/validators'
import { requirePatientAccess, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

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

    // Only patient self or admin can grant consent
    if (user.role !== 'admin' && user._id !== (await ctx.db.get(args.patientId))?.userId) {
      throw new Error('Forbidden: Only the patient or an organization admin can grant access.')
    }

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

    // Check for existing grant to update or replace
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
        revokedAt: undefined,
        revokedByUserId: undefined,
      })

      await ctx.db.insert('auditLogs', {
        actorUserId: user._id,
        actorRole: user.role,
        patientId: args.patientId,
        event: `Updated consent grant for user ${grantee.name || grantee.email}`,
        targetResource: 'consentGrants',
        resourceId: existing._id,
        action: 'consent_grant',
        createdAt: now,
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
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      patientId: args.patientId,
      event: `Granted consent to ${args.granteeRole} (${grantee.name || grantee.email})`,
      targetResource: 'consentGrants',
      resourceId: grantId,
      action: 'consent_grant',
      createdAt: now,
    })

    return grantId
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

    // Only patient self or admin can revoke consent
    const patient = await ctx.db.get(grant.patientId)
    if (user.role !== 'admin' && user._id !== patient?.userId) {
      throw new Error('Forbidden: Only the patient or an administrator can revoke consent.')
    }

    const now = Date.now()
    await ctx.db.patch(grant._id, {
      status: 'revoked',
      revokedAt: now,
      revokedByUserId: user._id,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      patientId: grant.patientId,
      event: `Revoked consent grant for user ${grant.granteeUserId}`,
      targetResource: 'consentGrants',
      resourceId: grant._id,
      action: 'consent_revoke',
      createdAt: now,
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
