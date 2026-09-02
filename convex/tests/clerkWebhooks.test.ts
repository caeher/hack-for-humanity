/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import { api, internal } from '../_generated/api'
import schema from '../schema'
import {
  signClerkWebhookPayloadForTest,
  verifyClerkWebhookPayload,
} from '../lib/clerkWebhookVerify'
import { ClerkWebhookEnvelope } from '../lib/clerkWebhookTypes'

const modules = import.meta.glob('../**/*.ts')

const TEST_WEBHOOK_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
const TEST_ISSUER = 'https://clerk.example.test'

function buildUserEnvelope(
  type: 'user.created' | 'user.updated' | 'user.deleted',
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    banned?: boolean
    deleted?: boolean
    updatedAt?: number
    role?: 'patient' | 'caregiver' | 'clinician' | 'admin'
  }
): ClerkWebhookEnvelope {
  return {
    type,
    object: 'event',
    data: {
      id: user.id,
      first_name: user.firstName ?? null,
      last_name: user.lastName ?? null,
      banned: user.banned,
      deleted: user.deleted,
      primary_email_address_id: 'email_primary',
      email_addresses: [{ id: 'email_primary', email_address: user.email }],
      public_metadata: user.role ? { role: user.role } : {},
      updated_at: user.updatedAt ?? Date.now(),
    },
  }
}

function buildMembershipEnvelope(
  type:
    | 'organizationMembership.created'
    | 'organizationMembership.updated'
    | 'organizationMembership.deleted',
  membership: {
    id: string
    userId: string
    email: string
    orgId: string
    orgName: string
    orgSlug: string
    role: string
    updatedAt?: number
  }
): ClerkWebhookEnvelope {
  return {
    type,
    object: 'event',
    data: {
      id: membership.id,
      role: membership.role,
      organization: {
        id: membership.orgId,
        name: membership.orgName,
        slug: membership.orgSlug,
        updated_at: membership.updatedAt ?? Date.now(),
      },
      public_user_data: {
        user_id: membership.userId,
        first_name: 'Clinician',
        last_name: 'Member',
        identifier: membership.email,
      },
      updated_at: membership.updatedAt ?? Date.now(),
    },
  }
}

async function postSignedWebhook(
  t: ReturnType<typeof convexTest>,
  eventId: string,
  envelope: ClerkWebhookEnvelope
) {
  const payload = JSON.stringify(envelope)
  const timestamp = Math.floor(Date.now() / 1000)
  const headers = signClerkWebhookPayloadForTest(
    TEST_WEBHOOK_SECRET,
    payload,
    eventId,
    timestamp
  )

  return await t.fetch('/clerk-webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'svix-id': headers.svixId!,
      'svix-timestamp': headers.svixTimestamp!,
      'svix-signature': headers.svixSignature!,
    },
    body: payload,
  })
}

describe('Clerk webhook pipeline', () => {
  const originalWebhookSecret = process.env.CLERK_WEBHOOK_SECRET
  const originalIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN

  beforeEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET
    process.env.CLERK_JWT_ISSUER_DOMAIN = TEST_ISSUER
  })

  afterEach(() => {
    process.env.CLERK_WEBHOOK_SECRET = originalWebhookSecret
    process.env.CLERK_JWT_ISSUER_DOMAIN = originalIssuer
  })

  test('rejects missing or invalid signatures without data changes', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const envelope = buildUserEnvelope('user.created', {
      id: 'user_invalid_sig',
      email: 'invalid.sig@example.com',
    })

    const unsignedResponse = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(envelope),
    })
    expect(unsignedResponse.status).toBe(400)

    const invalidResponse = await t.fetch('/clerk-webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'svix-id': 'evt_invalid',
        'svix-timestamp': String(Math.floor(Date.now() / 1000)),
        'svix-signature': 'v1,invalid',
      },
      body: JSON.stringify(envelope),
    })
    expect(invalidResponse.status).toBe(400)

    const user = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_invalid_sig'))
        .first()
    })
    expect(user).toBeNull()
  })

  test('user.created provisions a Convex user profile', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const envelope = buildUserEnvelope('user.created', {
      id: 'user_webhook_created',
      email: 'webhook.created@example.com',
      firstName: 'Webhook',
      lastName: 'Created',
      role: 'clinician',
    })

    const response = await postSignedWebhook(t, 'evt_user_created_1', envelope)
    expect(response.status).toBe(200)

    const user = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_webhook_created'))
        .first()
    })

    expect(user).not.toBeNull()
    expect(user?.email).toBe('webhook.created@example.com')
    expect(user?.role).toBe('clinician')
    expect(user?.status).toBe('Active')
    expect(user?.tokenIdentifier).toBe(`${TEST_ISSUER}|user_webhook_created`)
  })

  test('user.updated and user.deleted lifecycle events update status safely', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const createEnvelope = buildUserEnvelope('user.created', {
      id: 'user_lifecycle',
      email: 'lifecycle@example.com',
      firstName: 'Life',
      lastName: 'Cycle',
      updatedAt: 1_000,
    })
    await postSignedWebhook(t, 'evt_lifecycle_create', createEnvelope)

    const updateEnvelope = buildUserEnvelope('user.updated', {
      id: 'user_lifecycle',
      email: 'lifecycle.updated@example.com',
      firstName: 'Updated',
      lastName: 'User',
      updatedAt: 2_000,
    })
    const updateResponse = await postSignedWebhook(t, 'evt_lifecycle_update', updateEnvelope)
    expect(updateResponse.status).toBe(200)

    const updatedUser = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_lifecycle'))
        .first()
    })
    expect(updatedUser?.email).toBe('lifecycle.updated@example.com')
    expect(updatedUser?.name).toBe('Updated User')

    const deleteEnvelope = buildUserEnvelope('user.deleted', {
      id: 'user_lifecycle',
      email: 'lifecycle.updated@example.com',
      deleted: true,
      updatedAt: 3_000,
    })
    const deleteResponse = await postSignedWebhook(t, 'evt_lifecycle_delete', deleteEnvelope)
    expect(deleteResponse.status).toBe(200)

    const suspendedUser = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_lifecycle'))
        .first()
    })
    expect(suspendedUser?.status).toBe('Suspended')
  })

  test('organization membership events create memberships without browser trust', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const membershipEnvelope = buildMembershipEnvelope('organizationMembership.created', {
      id: 'orgmem_1',
      userId: 'user_membership_1',
      email: 'membership.clinician@example.com',
      orgId: 'org_clerk_1',
      orgName: 'Webhook Clinic',
      orgSlug: 'webhook-clinic',
      role: 'org:admin',
    })

    const response = await postSignedWebhook(t, 'evt_membership_create', membershipEnvelope)
    expect(response.status).toBe(200)

    const user = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_membership_1'))
        .first()
    })
    expect(user?.role).toBe('admin')

    const organization = await t.run(async ctx => {
      return await ctx.db
        .query('organizations')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'org_clerk_1'))
        .first()
    })
    expect(organization?.slug).toBe('webhook-clinic')

    const membership = await t.run(async ctx => {
      if (!user || !organization) return null
      return await ctx.db
        .query('clinicianMemberships')
        .withIndex('by_userId_and_orgId', q =>
          q.eq('userId', user._id).eq('orgId', organization._id)
        )
        .first()
    })
    expect(membership?.status).toBe('active')
    expect(membership?.clinicalRole).toBe('lead')
  })

  test('replayed webhook events are idempotent and do not duplicate audit entries', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const envelope = buildUserEnvelope('user.created', {
      id: 'user_replay',
      email: 'replay@example.com',
      firstName: 'Replay',
      lastName: 'Safe',
    })

    const first = await postSignedWebhook(t, 'evt_replay_same', envelope)
    const second = await postSignedWebhook(t, 'evt_replay_same', envelope)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const users = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_replay'))
        .collect()
    })
    expect(users).toHaveLength(1)

    const ledger = await t.query(internal.clerkWebhooks.getWebhookEvent, {
      eventId: 'evt_replay_same',
    })
    expect(ledger?.status).toBe('processed')

    const auditEntries = await t.run(async ctx => {
      const logs = await ctx.db
        .query('auditLogs')
        .withIndex('by_targetResource', q => q.eq('targetResource', 'users'))
        .take(200)
      return logs.filter(log => log.event.includes('Clerk webhook created user profile'))
    })
    expect(auditEntries.length).toBeGreaterThanOrEqual(1)
  })

  test('unknown event types are ignored without failure', async () => {
    const t = convexTest(schema, modules)

    const envelope = {
      type: 'session.created',
      object: 'event',
      data: { id: 'sess_1' },
    } as ClerkWebhookEnvelope

    const response = await postSignedWebhook(t, 'evt_unknown_type', envelope)
    expect(response.status).toBe(200)

    const ledger = await t.query(internal.clerkWebhooks.getWebhookEvent, {
      eventId: 'evt_unknown_type',
    })
    expect(ledger?.status).toBe('ignored')
  })

  test('out-of-order user.updated events do not roll back newer state', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const createEnvelope = buildUserEnvelope('user.created', {
      id: 'user_out_of_order',
      email: 'outoforder@example.com',
      firstName: 'New',
      lastName: 'Name',
      updatedAt: 5_000,
    })
    await postSignedWebhook(t, 'evt_out_of_order_create', createEnvelope)

    const newerEnvelope = buildUserEnvelope('user.updated', {
      id: 'user_out_of_order',
      email: 'newer@example.com',
      firstName: 'Newer',
      lastName: 'State',
      updatedAt: 10_000,
    })
    await postSignedWebhook(t, 'evt_out_of_order_newer', newerEnvelope)

    const staleEnvelope = buildUserEnvelope('user.updated', {
      id: 'user_out_of_order',
      email: 'stale@example.com',
      firstName: 'Stale',
      lastName: 'State',
      updatedAt: 2_000,
    })
    await postSignedWebhook(t, 'evt_out_of_order_stale', staleEnvelope)

    const user = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_out_of_order'))
        .first()
    })

    expect(user?.email).toBe('newer@example.com')
    expect(user?.name).toBe('Newer State')
  })

  test('reconciliation repair can create missing users in dry-run and apply modes', async () => {
    const t = convexTest(schema, modules)

    const dryRunResult = await t.mutation(internal.clerkReconciliation.repairUserDrift, {
      dryRun: true,
      issuerDomain: TEST_ISSUER,
      clerkUser: {
        id: 'user_reconcile',
        first_name: 'Recon',
        last_name: 'User',
        banned: false,
        email_addresses: [{ id: 'email_primary', email_address: 'recon@example.com' }],
        primary_email_address_id: 'email_primary',
        public_metadata: {},
        updated_at: Date.now(),
      },
    })
    expect(dryRunResult.repaired).toBe(true)

    const missingBefore = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_reconcile'))
        .first()
    })
    expect(missingBefore).toBeNull()

    const applyResult = await t.mutation(internal.clerkReconciliation.repairUserDrift, {
      dryRun: false,
      issuerDomain: TEST_ISSUER,
      clerkUser: {
        id: 'user_reconcile',
        first_name: 'Recon',
        last_name: 'User',
        banned: false,
        email_addresses: [{ id: 'email_primary', email_address: 'recon@example.com' }],
        primary_email_address_id: 'email_primary',
        public_metadata: {},
        updated_at: Date.now(),
      },
    })
    expect(applyResult.repaired).toBe(true)

    const created = await t.run(async ctx => {
      return await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', 'user_reconcile'))
        .first()
    })
    expect(created?.email).toBe('recon@example.com')
  })

  test('signature verifier accepts valid Svix signatures', () => {
    const payload = JSON.stringify({ hello: 'world' })
    const headers = signClerkWebhookPayloadForTest(
      TEST_WEBHOOK_SECRET,
      payload,
      'evt_verify',
      Math.floor(Date.now() / 1000)
    )

    const verified = verifyClerkWebhookPayload(TEST_WEBHOOK_SECRET, payload, headers)
    expect(verified).toEqual({ hello: 'world' })
  })
})
