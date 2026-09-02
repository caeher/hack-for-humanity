import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

export const linkClerkInvitation = internalMutation({
  args: {
    invitationId: v.id('organizationInvitations'),
    clerkInvitationId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId)
    if (!invitation) {
      return null
    }

    await ctx.db.patch(args.invitationId, {
      clerkInvitationId: args.clerkInvitationId,
      updatedAt: Date.now(),
    })

    return null
  },
})

export const markInvitationAccepted = internalMutation({
  args: {
    clerkInvitationId: v.optional(v.string()),
    email: v.optional(v.string()),
    orgClerkId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let invitation = null

    if (args.clerkInvitationId) {
      invitation = await ctx.db
        .query('organizationInvitations')
        .withIndex('by_clerkInvitationId', q => q.eq('clerkInvitationId', args.clerkInvitationId))
        .first()
    }

    if (!invitation && args.email && args.orgClerkId) {
      const org = await ctx.db
        .query('organizations')
        .withIndex('by_clerkId', q => q.eq('clerkId', args.orgClerkId!))
        .first()

      if (org) {
        invitation = await ctx.db
          .query('organizationInvitations')
          .withIndex('by_orgId_and_email', q => q.eq('orgId', org._id).eq('email', args.email!))
          .first()
      }
    }

    if (!invitation) {
      return null
    }

    const now = Date.now()
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      updatedAt: now,
    })

    return null
  },
})

export const markInvitationRevoked = internalMutation({
  args: {
    clerkInvitationId: v.optional(v.string()),
    email: v.optional(v.string()),
    orgClerkId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let invitation = null

    if (args.clerkInvitationId) {
      invitation = await ctx.db
        .query('organizationInvitations')
        .withIndex('by_clerkInvitationId', q => q.eq('clerkInvitationId', args.clerkInvitationId))
        .first()
    }

    if (!invitation && args.email && args.orgClerkId) {
      const org = await ctx.db
        .query('organizations')
        .withIndex('by_clerkId', q => q.eq('clerkId', args.orgClerkId!))
        .first()

      if (org) {
        invitation = await ctx.db
          .query('organizationInvitations')
          .withIndex('by_orgId_and_email', q => q.eq('orgId', org._id).eq('email', args.email!))
          .first()
      }
    }

    if (!invitation) {
      return null
    }

    const now = Date.now()
    await ctx.db.patch(invitation._id, {
      status: 'revoked',
      updatedAt: now,
    })

    return null
  },
})
