import { MutationCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import {
  buildDisplayName,
  buildTokenIdentifier,
  ClerkOrganizationData,
  ClerkOrganizationInvitationData,
  ClerkOrganizationMembershipData,
  ClerkUserData,
  getPrimaryEmail,
  mapMembershipClinicalRole,
  mapUserRoleFromClerk,
} from './clerkWebhookTypes'

export interface ClerkWebhookHandlerContext {
  issuerDomain: string
  now: number
}

async function getSystemActorUserId(ctx: MutationCtx): Promise<Id<'users'>> {
  const admin = await ctx.db
    .query('users')
    .withIndex('by_role', q => q.eq('role', 'admin'))
    .first()

  if (admin) {
    return admin._id
  }

  const fallback = await ctx.db.query('users').first()
  if (!fallback) {
    throw new Error('system_actor_unavailable')
  }

  return fallback._id
}

async function writeWebhookAuditLog(
  ctx: MutationCtx,
  args: {
    actorUserId: Id<'users'>
    actorRole: string
    event: string
    targetResource: string
    resourceId?: string
    action: 'create' | 'update' | 'delete'
    orgId?: Id<'organizations'>
    now: number
  }
): Promise<void> {
  await ctx.db.insert('auditLogs', {
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    orgId: args.orgId,
    event: args.event,
    targetResource: args.targetResource,
    resourceId: args.resourceId,
    action: args.action,
    createdAt: args.now,
  })
}

async function findUserByClerkId(
  ctx: MutationCtx,
  clerkUserId: string
): Promise<Doc<'users'> | null> {
  return await ctx.db
    .query('users')
    .withIndex('by_clerkId', q => q.eq('clerkId', clerkUserId))
    .first()
}

async function findOrganizationByClerkId(
  ctx: MutationCtx,
  clerkOrgId: string
): Promise<Doc<'organizations'> | null> {
  return await ctx.db
    .query('organizations')
    .withIndex('by_clerkId', q => q.eq('clerkId', clerkOrgId))
    .first()
}

function shouldApplyUpdate(
  existingUpdatedAt: number | undefined,
  incomingUpdatedAt: number | undefined
): boolean {
  if (incomingUpdatedAt === undefined) {
    return true
  }
  if (existingUpdatedAt === undefined) {
    return true
  }
  return incomingUpdatedAt >= existingUpdatedAt
}

export async function handleUserCreated(
  ctx: MutationCtx,
  userData: ClerkUserData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const existing = await findUserByClerkId(ctx, userData.id)
  if (existing) {
    return
  }

  const email = getPrimaryEmail(userData) ?? `${userData.id}@cri-recovery.local`
  const existingByEmail = await ctx.db
    .query('users')
    .withIndex('by_email', q => q.eq('email', email))
    .first()

  const role = mapUserRoleFromClerk(userData.public_metadata)
  const status = userData.banned ? 'Suspended' : existingByEmail?.status === 'Invited' ? 'Active' : 'Active'
  const actorUserId = existingByEmail?._id ?? (await getSystemActorUserId(ctx))

  if (existingByEmail) {
    await ctx.db.patch(existingByEmail._id, {
      clerkId: userData.id,
      tokenIdentifier: buildTokenIdentifier(handlerCtx.issuerDomain, userData.id),
      name: buildDisplayName(userData),
      email,
      role: existingByEmail.role,
      status,
      clerkUpdatedAt: userData.updated_at,
    })

    await writeWebhookAuditLog(ctx, {
      actorUserId,
      actorRole: existingByEmail.role,
      event: 'Clerk webhook linked invited user profile',
      targetResource: 'users',
      resourceId: existingByEmail._id,
      action: 'update',
      now: handlerCtx.now,
    })
    return
  }

  const userId = await ctx.db.insert('users', {
    tokenIdentifier: buildTokenIdentifier(handlerCtx.issuerDomain, userData.id),
    clerkId: userData.id,
    name: buildDisplayName(userData),
    email,
    role,
    status,
    createdAt: handlerCtx.now,
    clerkUpdatedAt: userData.updated_at,
  })

  await writeWebhookAuditLog(ctx, {
    actorUserId: await getSystemActorUserId(ctx),
    actorRole: 'system',
    event: 'Clerk webhook created user profile',
    targetResource: 'users',
    resourceId: userId,
    action: 'create',
    now: handlerCtx.now,
  })
}

export async function handleUserUpdated(
  ctx: MutationCtx,
  userData: ClerkUserData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const existing = await findUserByClerkId(ctx, userData.id)
  if (!existing) {
    await handleUserCreated(ctx, userData, handlerCtx)
    return
  }

  if (!shouldApplyUpdate(existing.clerkUpdatedAt, userData.updated_at)) {
    return
  }

  const email = getPrimaryEmail(userData) ?? existing.email
  const status = userData.banned || userData.deleted ? 'Suspended' : existing.status === 'Invited' ? 'Active' : existing.status

  await ctx.db.patch(existing._id, {
    tokenIdentifier: buildTokenIdentifier(handlerCtx.issuerDomain, userData.id),
    name: buildDisplayName(userData),
    email,
    status,
    clerkUpdatedAt: userData.updated_at,
  })

  await writeWebhookAuditLog(ctx, {
    actorUserId: existing._id,
    actorRole: existing.role,
    event: 'Clerk webhook updated user profile',
    targetResource: 'users',
    resourceId: existing._id,
    action: 'update',
    now: handlerCtx.now,
  })
}

export async function handleUserDeleted(
  ctx: MutationCtx,
  userData: ClerkUserData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const existing = await findUserByClerkId(ctx, userData.id)
  if (!existing) {
    return
  }

  if (!shouldApplyUpdate(existing.clerkUpdatedAt, userData.updated_at)) {
    return
  }

  await ctx.db.patch(existing._id, {
    status: 'Suspended',
    clerkUpdatedAt: userData.updated_at ?? handlerCtx.now,
  })

  await writeWebhookAuditLog(ctx, {
    actorUserId: existing._id,
    actorRole: existing.role,
    event: 'Clerk webhook suspended deleted user profile',
    targetResource: 'users',
    resourceId: existing._id,
    action: 'update',
    now: handlerCtx.now,
  })
}

export async function handleOrganizationCreated(
  ctx: MutationCtx,
  orgData: ClerkOrganizationData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const existing = await findOrganizationByClerkId(ctx, orgData.id)
  if (existing) {
    return
  }

  const existingBySlug = await ctx.db
    .query('organizations')
    .withIndex('by_slug', q => q.eq('slug', orgData.slug))
    .first()

  if (existingBySlug) {
    await ctx.db.patch(existingBySlug._id, {
      clerkId: orgData.id,
      name: orgData.name,
      clerkUpdatedAt: orgData.updated_at,
    })
    return
  }

  const orgId = await ctx.db.insert('organizations', {
    clerkId: orgData.id,
    name: orgData.name,
    slug: orgData.slug,
    retentionPolicyDays: 2555,
    autoEscalateAlerts: true,
    primaryContactEmail: `org-${orgData.slug}@cri-recovery.local`,
    createdAt: handlerCtx.now,
    clerkUpdatedAt: orgData.updated_at,
  })

  const actorUserId = await getSystemActorUserId(ctx)
  await writeWebhookAuditLog(ctx, {
    actorUserId,
    actorRole: 'system',
    event: 'Clerk webhook created organization workspace',
    targetResource: 'organizations',
    resourceId: orgId,
    action: 'create',
    orgId,
    now: handlerCtx.now,
  })
}

export async function handleOrganizationUpdated(
  ctx: MutationCtx,
  orgData: ClerkOrganizationData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const existing = await findOrganizationByClerkId(ctx, orgData.id)
  if (!existing) {
    await handleOrganizationCreated(ctx, orgData, handlerCtx)
    return
  }

  if (!shouldApplyUpdate(existing.clerkUpdatedAt, orgData.updated_at)) {
    return
  }

  await ctx.db.patch(existing._id, {
    name: orgData.name,
    slug: orgData.slug,
    clerkUpdatedAt: orgData.updated_at,
  })
}

export async function handleOrganizationDeleted(
  ctx: MutationCtx,
  orgData: ClerkOrganizationData,
  _handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const existing = await findOrganizationByClerkId(ctx, orgData.id)
  if (!existing) {
    return
  }

  const memberships = await ctx.db
    .query('clinicianMemberships')
    .withIndex('by_orgId', q => q.eq('orgId', existing._id))
    .take(200)

  for (const membership of memberships) {
    if (membership.status !== 'inactive') {
      await ctx.db.patch(membership._id, { status: 'inactive' })
    }
  }
}

async function ensureOrganizationForMembership(
  ctx: MutationCtx,
  membershipData: ClerkOrganizationMembershipData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<Doc<'organizations'>> {
  const existing = await findOrganizationByClerkId(ctx, membershipData.organization.id)
  if (existing) {
    return existing
  }

  await handleOrganizationCreated(ctx, membershipData.organization, handlerCtx)
  const created = await findOrganizationByClerkId(ctx, membershipData.organization.id)
  if (!created) {
    throw new Error('organization_provision_failed')
  }
  return created
}

export async function handleOrganizationMembershipCreated(
  ctx: MutationCtx,
  membershipData: ClerkOrganizationMembershipData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const organization = await ensureOrganizationForMembership(ctx, membershipData, handlerCtx)
  const clerkUserId = membershipData.public_user_data.user_id

  let user = await findUserByClerkId(ctx, clerkUserId)
  if (!user) {
    const placeholderUser: ClerkUserData = {
      id: clerkUserId,
      first_name: membershipData.public_user_data.first_name ?? null,
      last_name: membershipData.public_user_data.last_name ?? null,
      email_addresses: membershipData.public_user_data.identifier
        ? [{ id: 'primary', email_address: membershipData.public_user_data.identifier }]
        : [],
      public_metadata: {},
      updated_at: membershipData.updated_at,
    }
    await handleUserCreated(ctx, placeholderUser, handlerCtx)
    user = await findUserByClerkId(ctx, clerkUserId)
  }

  if (!user) {
    throw new Error('membership_user_unavailable')
  }

  const mappedRole = mapUserRoleFromClerk(undefined, membershipData.role)
  if (user.role !== mappedRole) {
    await ctx.db.patch(user._id, { role: mappedRole })
  }

  const existingOrgMembership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_userId_and_orgId', q => q.eq('userId', user._id).eq('orgId', organization._id))
    .first()

  if (existingOrgMembership) {
    await ctx.db.patch(existingOrgMembership._id, {
      orgRole: mappedRole,
      status: 'active',
      clerkMembershipId: membershipData.id,
    })
  } else {
    await ctx.db.insert('organizationMemberships', {
      userId: user._id,
      orgId: organization._id,
      orgRole: mappedRole,
      status: 'active',
      clerkMembershipId: membershipData.id,
      joinedAt: handlerCtx.now,
    })
  }

  const existingMembership = await ctx.db
    .query('clinicianMemberships')
    .withIndex('by_userId_and_orgId', q => q.eq('userId', user._id).eq('orgId', organization._id))
    .first()

  if (existingMembership) {
    await ctx.db.patch(existingMembership._id, {
      clinicalRole: mapMembershipClinicalRole(membershipData.role),
      status: 'active',
    })
    return
  }

  await ctx.db.insert('clinicianMemberships', {
    userId: user._id,
    orgId: organization._id,
    clinicalRole: mapMembershipClinicalRole(membershipData.role),
    status: 'active',
    joinedAt: handlerCtx.now,
  })

  await writeWebhookAuditLog(ctx, {
    actorUserId: user._id,
    actorRole: mappedRole,
    event: 'Clerk webhook created organization membership',
    targetResource: 'clinicianMemberships',
    resourceId: membershipData.id,
    action: 'create',
    orgId: organization._id,
    now: handlerCtx.now,
  })
}

export async function handleOrganizationMembershipUpdated(
  ctx: MutationCtx,
  membershipData: ClerkOrganizationMembershipData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  await handleOrganizationMembershipCreated(ctx, membershipData, handlerCtx)
}

export async function handleOrganizationMembershipDeleted(
  ctx: MutationCtx,
  membershipData: ClerkOrganizationMembershipData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const organization = await findOrganizationByClerkId(ctx, membershipData.organization.id)
  const user = await findUserByClerkId(ctx, membershipData.public_user_data.user_id)

  if (!organization || !user) {
    return
  }

  const existingMembership = await ctx.db
    .query('clinicianMemberships')
    .withIndex('by_userId_and_orgId', q => q.eq('userId', user._id).eq('orgId', organization._id))
    .first()

  if (!existingMembership) {
    return
  }

  await ctx.db.patch(existingMembership._id, { status: 'inactive' })

  const orgMembership = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_userId_and_orgId', q => q.eq('userId', user._id).eq('orgId', organization._id))
    .first()

  if (orgMembership) {
    await ctx.db.patch(orgMembership._id, { status: 'inactive' })
  }

  await writeWebhookAuditLog(ctx, {
    actorUserId: user._id,
    actorRole: user.role,
    event: 'Clerk webhook deactivated organization membership',
    targetResource: 'clinicianMemberships',
    resourceId: existingMembership._id,
    action: 'update',
    orgId: organization._id,
    now: handlerCtx.now,
  })
}

export async function handleOrganizationInvitationAccepted(
  ctx: MutationCtx,
  invitationData: ClerkOrganizationInvitationData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const invitation = await ctx.db
    .query('organizationInvitations')
    .withIndex('by_clerkInvitationId', q => q.eq('clerkInvitationId', invitationData.id))
    .first()

  if (invitation) {
    await ctx.db.patch(invitation._id, {
      status: 'accepted',
      updatedAt: handlerCtx.now,
    })
    return
  }

  const org = await findOrganizationByClerkId(ctx, invitationData.organization_id)
  if (!org) {
    return
  }

  const byEmail = await ctx.db
    .query('organizationInvitations')
    .withIndex('by_orgId_and_email', q =>
      q.eq('orgId', org._id).eq('email', invitationData.email_address)
    )
    .first()

  if (byEmail && byEmail.status === 'pending') {
    await ctx.db.patch(byEmail._id, {
      status: 'accepted',
      clerkInvitationId: invitationData.id,
      updatedAt: handlerCtx.now,
    })
  }
}

export async function handleOrganizationInvitationRevoked(
  ctx: MutationCtx,
  invitationData: ClerkOrganizationInvitationData,
  handlerCtx: ClerkWebhookHandlerContext
): Promise<void> {
  const invitation = await ctx.db
    .query('organizationInvitations')
    .withIndex('by_clerkInvitationId', q => q.eq('clerkInvitationId', invitationData.id))
    .first()

  if (invitation) {
    await ctx.db.patch(invitation._id, {
      status: 'revoked',
      updatedAt: handlerCtx.now,
    })
    return
  }

  const org = await findOrganizationByClerkId(ctx, invitationData.organization_id)
  if (!org) {
    return
  }

  const byEmail = await ctx.db
    .query('organizationInvitations')
    .withIndex('by_orgId_and_email', q =>
      q.eq('orgId', org._id).eq('email', invitationData.email_address)
    )
    .first()

  if (byEmail && byEmail.status === 'pending') {
    await ctx.db.patch(byEmail._id, {
      status: 'revoked',
      clerkInvitationId: invitationData.id,
      updatedAt: handlerCtx.now,
    })
  }
}
