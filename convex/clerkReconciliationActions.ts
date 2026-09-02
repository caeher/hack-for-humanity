'use node'

import { v } from 'convex/values'
import { internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { requireClerkIssuerDomain } from './lib/clerkIssuer'

interface ClerkApiUser {
  id: string
  first_name: string | null
  last_name: string | null
  banned: boolean
  email_addresses: Array<{ id: string; email_address: string }>
  primary_email_address_id: string | null
  public_metadata: Record<string, unknown>
  updated_at: number
}

interface ClerkApiOrganization {
  id: string
  name: string
  slug: string
  updated_at: number
}

interface ClerkListResponse<T> {
  data: T[]
  total_count: number
}

const reconciliationSummaryValidator = v.object({
  scannedUsers: v.number(),
  repairedUsers: v.number(),
  scannedOrganizations: v.number(),
  repairedOrganizations: v.number(),
  driftDetected: v.number(),
  dryRun: v.boolean(),
})

async function clerkApiFetch<T>(path: string, secretKey: string): Promise<T> {
  const response = await fetch(`https://api.clerk.com/v1${path}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`clerk_api_${response.status}`)
  }

  return (await response.json()) as T
}

export const reconcileFromClerk = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    userLimit: v.optional(v.number()),
  },
  returns: reconciliationSummaryValidator,
  handler: async (ctx, args) => {
    const secretKey = process.env.CLERK_SECRET_KEY
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured for reconciliation.')
    }

    const dryRun = args.dryRun ?? false
    const userLimit = Math.min(Math.max(args.userLimit ?? 100, 1), 500)
    const issuerDomain = requireClerkIssuerDomain(process.env.CLERK_JWT_ISSUER_DOMAIN)

    const usersResponse = await clerkApiFetch<ClerkListResponse<ClerkApiUser>>(
      `/users?limit=${userLimit}`,
      secretKey
    )
    const orgsResponse = await clerkApiFetch<ClerkListResponse<ClerkApiOrganization>>(
      '/organizations?limit=100',
      secretKey
    )

    let repairedUsers = 0
    let driftDetected = 0

    for (const clerkUser of usersResponse.data) {
      const repairResult: { repaired: boolean } = await ctx.runMutation(
        internal.clerkReconciliation.repairUserDrift,
        {
          dryRun,
          issuerDomain,
          clerkUser: {
            id: clerkUser.id,
            first_name: clerkUser.first_name,
            last_name: clerkUser.last_name,
            banned: clerkUser.banned,
            email_addresses: clerkUser.email_addresses,
            primary_email_address_id: clerkUser.primary_email_address_id,
            public_metadata: clerkUser.public_metadata,
            updated_at: clerkUser.updated_at,
          },
        }
      )

      if (repairResult.repaired) {
        repairedUsers += 1
      } else {
        const hasDrift = await ctx.runQuery(internal.clerkReconciliation.detectUserDrift, {
          clerkUserId: clerkUser.id,
        })
        if (hasDrift) {
          driftDetected += 1
        }
      }
    }

    let repairedOrganizations = 0
    for (const clerkOrg of orgsResponse.data) {
      const repairResult: { repaired: boolean } = await ctx.runMutation(
        internal.clerkReconciliation.repairOrganizationDrift,
        {
          dryRun,
          clerkOrg: {
            id: clerkOrg.id,
            name: clerkOrg.name,
            slug: clerkOrg.slug,
            updated_at: clerkOrg.updated_at,
          },
        }
      )

      if (repairResult.repaired) {
        repairedOrganizations += 1
      }
    }

    return {
      scannedUsers: usersResponse.data.length,
      repairedUsers,
      scannedOrganizations: orgsResponse.data.length,
      repairedOrganizations,
      driftDetected,
      dryRun,
    }
  },
})
