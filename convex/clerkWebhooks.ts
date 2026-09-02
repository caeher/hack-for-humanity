import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import {
  clerkWebhookProcessResultValidator,
  ClerkOrganizationData,
  ClerkOrganizationInvitationData,
  ClerkOrganizationMembershipData,
  ClerkUserData,
  ClerkWebhookEnvelope,
  isSupportedClerkEventType,
} from './lib/clerkWebhookTypes'
import {
  handleOrganizationCreated,
  handleOrganizationDeleted,
  handleOrganizationInvitationAccepted,
  handleOrganizationInvitationRevoked,
  handleOrganizationMembershipCreated,
  handleOrganizationMembershipDeleted,
  handleOrganizationMembershipUpdated,
  handleOrganizationUpdated,
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
} from './lib/clerkWebhookHandlers'
import { requireClerkIssuerDomain } from './lib/clerkIssuer'

function getIssuerDomain(): string {
  return requireClerkIssuerDomain(process.env.CLERK_JWT_ISSUER_DOMAIN)
}

async function dispatchClerkEvent(
  ctx: Parameters<typeof handleUserCreated>[0],
  envelope: ClerkWebhookEnvelope,
  now: number
): Promise<void> {
  const handlerCtx = { issuerDomain: getIssuerDomain(), now }

  switch (envelope.type) {
    case 'user.created':
      await handleUserCreated(ctx, envelope.data as ClerkUserData, handlerCtx)
      return
    case 'user.updated':
      await handleUserUpdated(ctx, envelope.data as ClerkUserData, handlerCtx)
      return
    case 'user.deleted':
      await handleUserDeleted(ctx, envelope.data as ClerkUserData, handlerCtx)
      return
    case 'organization.created':
      await handleOrganizationCreated(ctx, envelope.data as ClerkOrganizationData, handlerCtx)
      return
    case 'organization.updated':
      await handleOrganizationUpdated(ctx, envelope.data as ClerkOrganizationData, handlerCtx)
      return
    case 'organization.deleted':
      await handleOrganizationDeleted(ctx, envelope.data as ClerkOrganizationData, handlerCtx)
      return
    case 'organizationMembership.created':
      await handleOrganizationMembershipCreated(
        ctx,
        envelope.data as ClerkOrganizationMembershipData,
        handlerCtx
      )
      return
    case 'organizationMembership.updated':
      await handleOrganizationMembershipUpdated(
        ctx,
        envelope.data as ClerkOrganizationMembershipData,
        handlerCtx
      )
      return
    case 'organizationMembership.deleted':
      await handleOrganizationMembershipDeleted(
        ctx,
        envelope.data as ClerkOrganizationMembershipData,
        handlerCtx
      )
      return
    case 'organizationInvitation.accepted':
      await handleOrganizationInvitationAccepted(
        ctx,
        envelope.data as unknown as ClerkOrganizationInvitationData,
        handlerCtx
      )
      return
    case 'organizationInvitation.revoked':
      await handleOrganizationInvitationRevoked(
        ctx,
        envelope.data as unknown as ClerkOrganizationInvitationData,
        handlerCtx
      )
      return
    case 'organizationInvitation.created':
      return
    default:
      return
  }
}

export const processWebhookEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
  },
  returns: clerkWebhookProcessResultValidator,
  handler: async (ctx, args) => {
    const now = Date.now()
    const existing = await ctx.db
      .query('clerkWebhookEvents')
      .withIndex('by_eventId', q => q.eq('eventId', args.eventId))
      .first()

    if (existing?.status === 'processed' || existing?.status === 'skipped_duplicate') {
      return { outcome: 'skipped_duplicate' as const }
    }

    if (!isSupportedClerkEventType(args.eventType)) {
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: 'ignored',
          processedAt: now,
          attemptCount: existing.attemptCount + 1,
        })
      } else {
        await ctx.db.insert('clerkWebhookEvents', {
          eventId: args.eventId,
          eventType: args.eventType,
          status: 'ignored',
          receivedAt: now,
          processedAt: now,
          attemptCount: 1,
        })
      }
      return { outcome: 'ignored' as const }
    }

    const ledgerId =
      existing?._id ??
      (await ctx.db.insert('clerkWebhookEvents', {
        eventId: args.eventId,
        eventType: args.eventType,
        status: 'failed',
        receivedAt: now,
        attemptCount: 1,
      }))

    try {
      const envelope = args.payload as ClerkWebhookEnvelope
      await dispatchClerkEvent(ctx, envelope, now)

      await ctx.db.patch(ledgerId, {
        status: 'processed',
        processedAt: now,
        errorCode: undefined,
        attemptCount: existing ? existing.attemptCount + 1 : 1,
      })

      return { outcome: 'processed' as const }
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : 'processing_failed'
      await ctx.db.patch(ledgerId, {
        status: 'failed',
        processedAt: now,
        errorCode,
        attemptCount: existing ? existing.attemptCount + 1 : 1,
      })
      return { outcome: 'failed' as const, errorCode }
    }
  },
})

export const getWebhookEvent = internalQuery({
  args: { eventId: v.string() },
  returns: v.union(
    v.object({
      eventId: v.string(),
      eventType: v.string(),
      status: v.string(),
      errorCode: v.optional(v.string()),
      attemptCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query('clerkWebhookEvents')
      .withIndex('by_eventId', q => q.eq('eventId', args.eventId))
      .first()

    if (!event) {
      return null
    }

    return {
      eventId: event.eventId,
      eventType: event.eventType,
      status: event.status,
      errorCode: event.errorCode,
      attemptCount: event.attemptCount,
    }
  },
})

export const listFailedWebhookEvents = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      eventId: v.string(),
      eventType: v.string(),
      errorCode: v.optional(v.string()),
      attemptCount: v.number(),
      receivedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
    const events = await ctx.db
      .query('clerkWebhookEvents')
      .withIndex('by_status_and_receivedAt', q => q.eq('status', 'failed'))
      .order('desc')
      .take(limit)

    return events.map(event => ({
      eventId: event.eventId,
      eventType: event.eventType,
      errorCode: event.errorCode,
      attemptCount: event.attemptCount,
      receivedAt: event.receivedAt,
    }))
  },
})
