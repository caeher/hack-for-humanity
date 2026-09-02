import { QueryCtx, MutationCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import { UserIdentity } from 'convex/server'
import { requireUser, Role } from './auth'

export interface OrgAdminContext {
  identity: UserIdentity
  user: Doc<'users'>
  organization: Doc<'organizations'>
  membership: Doc<'organizationMemberships'>
}

/**
 * Returns the caller's active organization membership for a specific org.
 */
export async function getOrgMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  orgId: Id<'organizations'>
): Promise<Doc<'organizationMemberships'> | null> {
  return await ctx.db
    .query('organizationMemberships')
    .withIndex('by_userId_and_orgId', q => q.eq('userId', userId).eq('orgId', orgId))
    .first()
}

/**
 * Asserts the caller is an active organization administrator for the given org.
 * Cross-organization administration is blocked.
 */
export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<'organizations'>
): Promise<OrgAdminContext> {
  const auth = await requireUser(ctx)
  const organization = await ctx.db.get(orgId)
  if (!organization) {
    throw new Error(`Organization ${orgId} not found.`)
  }

  const membership = await getOrgMembership(ctx, auth.user._id, orgId)
  if (
    !membership ||
    membership.orgRole !== 'admin' ||
    membership.status !== 'active'
  ) {
    throw new Error('Forbidden: Organization admin access required.')
  }

  return { ...auth, organization, membership }
}

/**
 * Returns the caller's primary active admin organization membership.
 */
export async function getCallerAdminOrg(
  ctx: QueryCtx | MutationCtx
): Promise<OrgAdminContext | null> {
  const auth = await requireUser(ctx)
  const memberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_userId', q => q.eq('userId', auth.user._id))
    .collect()

  const adminMembership = memberships.find(
    m => m.orgRole === 'admin' && m.status === 'active'
  )
  if (!adminMembership) {
    return null
  }

  const organization = await ctx.db.get(adminMembership.orgId)
  if (!organization) {
    return null
  }

  return {
    ...auth,
    organization,
    membership: adminMembership,
  }
}

/**
 * Counts active organization administrators (membership + user account active).
 */
export async function countActiveOrgAdmins(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<'organizations'>
): Promise<number> {
  const adminMemberships = await ctx.db
    .query('organizationMemberships')
    .withIndex('by_orgId_and_orgRole', q => q.eq('orgId', orgId).eq('orgRole', 'admin'))
    .collect()

  let count = 0
  for (const membership of adminMemberships) {
    if (membership.status !== 'active') {
      continue
    }
    const user = await ctx.db.get(membership.userId)
    if (user && user.status === 'Active') {
      count += 1
    }
  }
  return count
}

/**
 * Prevents suspension or role demotion of the last active organization administrator.
 */
export async function assertNotLastActiveOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<'organizations'>,
  targetUserId: Id<'users'>,
  options?: { nextRole?: Role; suspending?: boolean }
): Promise<void> {
  const targetMembership = await getOrgMembership(ctx, targetUserId, orgId)
  if (!targetMembership || targetMembership.orgRole !== 'admin') {
    return
  }

  const targetUser = await ctx.db.get(targetUserId)
  if (!targetUser || targetUser.status !== 'Active') {
    return
  }

  const demotingAdmin =
    options?.suspending === true ||
    (options?.nextRole !== undefined && options.nextRole !== 'admin')

  if (!demotingAdmin) {
    return
  }

  const activeAdminCount = await countActiveOrgAdmins(ctx, orgId)
  if (activeAdminCount <= 1) {
    throw new Error(
      'Cannot modify the last active organization administrator. Assign another admin first.'
    )
  }
}

export async function writeOrgAuditLog(
  ctx: MutationCtx,
  args: {
    actorUserId: Id<'users'>
    actorRole: string
    orgId: Id<'organizations'>
    event: string
    targetResource: string
    resourceId?: string
    action: 'create' | 'update' | 'delete'
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
