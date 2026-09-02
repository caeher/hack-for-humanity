import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { buildDisplayName, buildTokenIdentifier, getPrimaryEmail } from './lib/clerkWebhookTypes'

export const detectUserDrift = internalQuery({
  args: { clerkUserId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', args.clerkUserId))
      .first()
    return existing === null
  },
})

export const repairUserDrift = internalMutation({
  args: {
    dryRun: v.boolean(),
    issuerDomain: v.string(),
    clerkUser: v.object({
      id: v.string(),
      first_name: v.union(v.string(), v.null()),
      last_name: v.union(v.string(), v.null()),
      banned: v.boolean(),
      email_addresses: v.array(
        v.object({
          id: v.string(),
          email_address: v.string(),
        })
      ),
      primary_email_address_id: v.union(v.string(), v.null()),
      public_metadata: v.any(),
      updated_at: v.number(),
    }),
  },
  returns: v.object({ repaired: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkId', q => q.eq('clerkId', args.clerkUser.id))
      .first()

    const email =
      getPrimaryEmail({
        id: args.clerkUser.id,
        first_name: args.clerkUser.first_name,
        last_name: args.clerkUser.last_name,
        email_addresses: args.clerkUser.email_addresses,
        primary_email_address_id: args.clerkUser.primary_email_address_id,
      }) ?? `${args.clerkUser.id}@cri-recovery.local`

    if (existing) {
      const expectedName = buildDisplayName({
        id: args.clerkUser.id,
        first_name: args.clerkUser.first_name,
        last_name: args.clerkUser.last_name,
        email_addresses: args.clerkUser.email_addresses,
        primary_email_address_id: args.clerkUser.primary_email_address_id,
      })

      const needsRepair =
        existing.email !== email ||
        existing.name !== expectedName ||
        existing.tokenIdentifier !== buildTokenIdentifier(args.issuerDomain, args.clerkUser.id)

      if (!needsRepair) {
        return { repaired: false }
      }

      if (!args.dryRun) {
        await ctx.db.patch(existing._id, {
          email,
          name: expectedName,
          tokenIdentifier: buildTokenIdentifier(args.issuerDomain, args.clerkUser.id),
          status: args.clerkUser.banned ? 'Suspended' : existing.status,
          clerkUpdatedAt: args.clerkUser.updated_at,
        })
      }

      return { repaired: true }
    }

    if (args.dryRun) {
      return { repaired: true }
    }

    await ctx.db.insert('users', {
      tokenIdentifier: buildTokenIdentifier(args.issuerDomain, args.clerkUser.id),
      clerkId: args.clerkUser.id,
      name: buildDisplayName({
        id: args.clerkUser.id,
        first_name: args.clerkUser.first_name,
        last_name: args.clerkUser.last_name,
        email_addresses: args.clerkUser.email_addresses,
        primary_email_address_id: args.clerkUser.primary_email_address_id,
      }),
      email,
      role: 'patient',
      status: args.clerkUser.banned ? 'Suspended' : 'Active',
      createdAt: Date.now(),
      clerkUpdatedAt: args.clerkUser.updated_at,
    })

    return { repaired: true }
  },
})

export const repairOrganizationDrift = internalMutation({
  args: {
    dryRun: v.boolean(),
    clerkOrg: v.object({
      id: v.string(),
      name: v.string(),
      slug: v.string(),
      updated_at: v.number(),
    }),
  },
  returns: v.object({ repaired: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('organizations')
      .withIndex('by_clerkId', q => q.eq('clerkId', args.clerkOrg.id))
      .first()

    if (existing) {
      const needsRepair = existing.name !== args.clerkOrg.name || existing.slug !== args.clerkOrg.slug
      if (!needsRepair) {
        return { repaired: false }
      }

      if (!args.dryRun) {
        await ctx.db.patch(existing._id, {
          name: args.clerkOrg.name,
          slug: args.clerkOrg.slug,
          clerkUpdatedAt: args.clerkOrg.updated_at,
        })
      }

      return { repaired: true }
    }

    if (args.dryRun) {
      return { repaired: true }
    }

    await ctx.db.insert('organizations', {
      clerkId: args.clerkOrg.id,
      name: args.clerkOrg.name,
      slug: args.clerkOrg.slug,
      retentionPolicyDays: 2555,
      autoEscalateAlerts: true,
      primaryContactEmail: `org-${args.clerkOrg.slug}@cri-recovery.local`,
      createdAt: Date.now(),
      clerkUpdatedAt: args.clerkOrg.updated_at,
    })

    return { repaired: true }
  },
})
