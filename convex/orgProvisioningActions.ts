'use node'

import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'

function mapRoleToClerkMembership(role: string): string {
  if (role === 'admin') {
    return 'org:admin'
  }
  return 'org:member'
}

async function clerkApiFetch<T>(
  path: string,
  secretKey: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`clerk_api_${response.status}: ${errorText.slice(0, 200)}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const sendClerkInvitation = internalAction({
  args: {
    invitationId: v.id('organizationInvitations'),
    orgClerkId: v.optional(v.string()),
    email: v.string(),
    role: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey || !args.orgClerkId) {
      console.warn(
        '[orgProvisioning] Clerk invitation skipped — CLERK_SECRET_KEY or org clerkId unavailable (demo/local mode).'
      )
      return null
    }

    try {
      const result = await clerkApiFetch<{ id: string }>(
        `/organizations/${args.orgClerkId}/invitations`,
        secretKey,
        {
          method: 'POST',
          body: {
            email_address: args.email,
            role: mapRoleToClerkMembership(args.role),
          },
        }
      )

      await ctx.runMutation(internal.orgProvisioningInternal.linkClerkInvitation, {
        invitationId: args.invitationId,
        clerkInvitationId: result.id,
      })
    } catch (error) {
      console.error('[orgProvisioning] Clerk invitation failed:', error)
    }

    return null
  },
})

export const revokeClerkInvitation = internalAction({
  args: {
    orgClerkId: v.optional(v.string()),
    clerkInvitationId: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey || !args.orgClerkId) {
      return null
    }

    try {
      await clerkApiFetch(
        `/organizations/${args.orgClerkId}/invitations/${args.clerkInvitationId}/revoke`,
        secretKey,
        { method: 'POST', body: {} }
      )
    } catch (error) {
      console.error('[orgProvisioning] Clerk invitation revoke failed:', error)
    }

    return null
  },
})

export const setClerkUserBanned = internalAction({
  args: {
    clerkUserId: v.string(),
    banned: v.boolean(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      return null
    }

    try {
      await clerkApiFetch(`/users/${args.clerkUserId}`, secretKey, {
        method: 'PATCH',
        body: { banned: args.banned },
      })
    } catch (error) {
      console.error('[orgProvisioning] Clerk user ban update failed:', error)
    }

    return null
  },
})
