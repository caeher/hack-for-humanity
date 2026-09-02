import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import { Id } from './_generated/dataModel'
import {
  orgInvitationDocValidator,
  orgUserSummaryValidator,
  roleValidator,
} from './lib/validators'
import {
  assertNotLastActiveOrgAdmin,
  getOrgMembership,
  requireOrgAdmin,
  writeOrgAuditLog,
} from './lib/orgAuth'
import { validateEmail, validateStringLength } from './lib/businessLogic'

/**
 * List organization members with their membership records.
 * Restricted to organization administrators.
 */
export const listOrgUsers = query({
  args: { orgId: v.id('organizations') },
  returns: v.array(orgUserSummaryValidator),
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.orgId)

    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
      .collect()

    const results = []
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId)
      if (user) {
        results.push({ user, membership })
      }
    }

    results.sort((a, b) => a.user.name.localeCompare(b.user.name))
    return results
  },
})

/**
 * List pending and recent organization invitations.
 */
export const listInvitations = query({
  args: { orgId: v.id('organizations') },
  returns: v.array(orgInvitationDocValidator),
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.orgId)

    const invitations = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_orgId', q => q.eq('orgId', args.orgId))
      .collect()

    return invitations.sort((a, b) => b.createdAt - a.createdAt)
  },
})

/**
 * Invite a user to the organization.
 * Creates Convex records and schedules Clerk invitation when configured.
 */
export const inviteUser = mutation({
  args: {
    orgId: v.id('organizations'),
    name: v.string(),
    email: v.string(),
    role: roleValidator,
  },
  returns: v.id('organizationInvitations'),
  handler: async (ctx, args) => {
    const { user: adminUser, organization } = await requireOrgAdmin(ctx, args.orgId)

    const validName = validateStringLength(args.name, 'Name', 2, 100)
    const validEmail = validateEmail(args.email)

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', validEmail))
      .first()

    if (existingUser) {
      const existingMembership = await getOrgMembership(ctx, existingUser._id, args.orgId)
      if (existingMembership && existingMembership.status === 'active') {
        throw new Error(`User ${validEmail} is already an active member of this organization.`)
      }
    }

    const pendingInvite = await ctx.db
      .query('organizationInvitations')
      .withIndex('by_orgId_and_email', q => q.eq('orgId', args.orgId).eq('email', validEmail))
      .first()

    if (pendingInvite && pendingInvite.status === 'pending') {
      throw new Error(`A pending invitation already exists for ${validEmail}.`)
    }

    const now = Date.now()
    const invitationId = await ctx.db.insert('organizationInvitations', {
      orgId: args.orgId,
      email: validEmail,
      name: validName,
      role: args.role,
      status: 'pending',
      invitedByUserId: adminUser._id,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      createdAt: now,
    })

    let memberUserId: Id<'users'>
    if (!existingUser) {
      memberUserId = await ctx.db.insert('users', {
        tokenIdentifier: `invited|${validEmail}`,
        name: validName,
        email: validEmail,
        role: args.role,
        status: 'Invited',
        createdAt: now,
      })
    } else {
      memberUserId = existingUser._id
    }

    const existingMembership = await getOrgMembership(ctx, memberUserId, args.orgId)
    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        orgRole: args.role,
        status: 'invited',
      })
    } else {
      await ctx.db.insert('organizationMemberships', {
        userId: memberUserId,
        orgId: args.orgId,
        orgRole: args.role,
        status: 'invited',
        joinedAt: now,
      })
    }

    await writeOrgAuditLog(ctx, {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Invited ${args.role} (${validEmail}) to ${organization.name}`,
      targetResource: 'organizationInvitations',
      resourceId: invitationId,
      action: 'create',
      now,
    })

    await ctx.scheduler.runAfter(0, internal.orgProvisioningActions.sendClerkInvitation, {
      invitationId,
      orgClerkId: organization.clerkId,
      email: validEmail,
      role: args.role,
    })

    return invitationId
  },
})

/**
 * Resend a pending organization invitation.
 */
export const resendInvitation = mutation({
  args: {
    orgId: v.id('organizations'),
    invitationId: v.id('organizationInvitations'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: adminUser, organization } = await requireOrgAdmin(ctx, args.orgId)

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation || invitation.orgId !== args.orgId) {
      throw new Error('Invitation not found in this organization.')
    }
    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be resent.')
    }

    const now = Date.now()
    await ctx.db.patch(args.invitationId, {
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      updatedAt: now,
    })

    await writeOrgAuditLog(ctx, {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Resent invitation to ${invitation.email}`,
      targetResource: 'organizationInvitations',
      resourceId: args.invitationId,
      action: 'update',
      now,
    })

    await ctx.scheduler.runAfter(0, internal.orgProvisioningActions.sendClerkInvitation, {
      invitationId: args.invitationId,
      orgClerkId: organization.clerkId,
      email: invitation.email,
      role: invitation.role,
    })

    return null
  },
})

/**
 * Cancel a pending organization invitation.
 */
export const cancelInvitation = mutation({
  args: {
    orgId: v.id('organizations'),
    invitationId: v.id('organizationInvitations'),
    confirmationEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: adminUser } = await requireOrgAdmin(ctx, args.orgId)

    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation || invitation.orgId !== args.orgId) {
      throw new Error('Invitation not found in this organization.')
    }
    if (invitation.status !== 'pending') {
      throw new Error('Only pending invitations can be cancelled.')
    }

    if (args.confirmationEmail.trim().toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error('Confirmation email does not match the invitation recipient.')
    }

    const now = Date.now()
    await ctx.db.patch(args.invitationId, {
      status: 'revoked',
      updatedAt: now,
    })

    await writeOrgAuditLog(ctx, {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Cancelled invitation for ${invitation.email}`,
      targetResource: 'organizationInvitations',
      resourceId: args.invitationId,
      action: 'delete',
      now,
    })

    if (invitation.clerkInvitationId) {
      await ctx.scheduler.runAfter(0, internal.orgProvisioningActions.revokeClerkInvitation, {
        orgClerkId: (await ctx.db.get(args.orgId))?.clerkId,
        clerkInvitationId: invitation.clerkInvitationId,
      })
    }

    return null
  },
})

/**
 * Suspend a user account within the organization.
 */
export const suspendUser = mutation({
  args: {
    orgId: v.id('organizations'),
    userId: v.id('users'),
    confirmationEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: adminUser } = await requireOrgAdmin(ctx, args.orgId)

    const targetMembership = await getOrgMembership(ctx, args.userId, args.orgId)
    if (!targetMembership || targetMembership.status !== 'active') {
      throw new Error('User is not an active member of this organization.')
    }

    const targetUser = await ctx.db.get(args.userId)
    if (!targetUser) {
      throw new Error('User not found.')
    }

    if (args.confirmationEmail.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      throw new Error('Confirmation email does not match the target user.')
    }

    await assertNotLastActiveOrgAdmin(ctx, args.orgId, args.userId, { suspending: true })

    const now = Date.now()
    await ctx.db.patch(args.userId, { status: 'Suspended' })

    await writeOrgAuditLog(ctx, {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Suspended user account ${targetUser.email}`,
      targetResource: 'users',
      resourceId: args.userId,
      action: 'update',
      now,
    })

    if (targetUser.clerkId) {
      await ctx.scheduler.runAfter(0, internal.orgProvisioningActions.setClerkUserBanned, {
        clerkUserId: targetUser.clerkId,
        banned: true,
      })
    }

    return null
  },
})

/**
 * Reactivate a suspended user account within the organization.
 */
export const reactivateUser = mutation({
  args: {
    orgId: v.id('organizations'),
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: adminUser } = await requireOrgAdmin(ctx, args.orgId)

    const targetMembership = await getOrgMembership(ctx, args.userId, args.orgId)
    if (!targetMembership) {
      throw new Error('User is not a member of this organization.')
    }

    const targetUser = await ctx.db.get(args.userId)
    if (!targetUser) {
      throw new Error('User not found.')
    }

    const now = Date.now()
    await ctx.db.patch(args.userId, { status: 'Active' })

    if (targetMembership.status === 'inactive') {
      await ctx.db.patch(targetMembership._id, { status: 'active' })
    }

    await writeOrgAuditLog(ctx, {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Reactivated user account ${targetUser.email}`,
      targetResource: 'users',
      resourceId: args.userId,
      action: 'update',
      now,
    })

    if (targetUser.clerkId) {
      await ctx.scheduler.runAfter(0, internal.orgProvisioningActions.setClerkUserBanned, {
        clerkUserId: targetUser.clerkId,
        banned: false,
      })
    }

    return null
  },
})

/**
 * Change a user's organization role. Takes effect immediately and is audited.
 */
export const changeUserRole = mutation({
  args: {
    orgId: v.id('organizations'),
    userId: v.id('users'),
    role: roleValidator,
    confirmationEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: adminUser } = await requireOrgAdmin(ctx, args.orgId)

    const targetMembership = await getOrgMembership(ctx, args.userId, args.orgId)
    if (!targetMembership || targetMembership.status !== 'active') {
      throw new Error('User is not an active member of this organization.')
    }

    const targetUser = await ctx.db.get(args.userId)
    if (!targetUser) {
      throw new Error('User not found.')
    }

    if (args.confirmationEmail.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      throw new Error('Confirmation email does not match the target user.')
    }

    await assertNotLastActiveOrgAdmin(ctx, args.orgId, args.userId, { nextRole: args.role })

    const now = Date.now()
    await ctx.db.patch(targetMembership._id, { orgRole: args.role })
    await ctx.db.patch(args.userId, { role: args.role })

    await writeOrgAuditLog(ctx, {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Changed role for ${targetUser.email} from ${targetMembership.orgRole} to ${args.role}`,
      targetResource: 'users',
      resourceId: args.userId,
      action: 'update',
      now,
    })

    return null
  },
})
