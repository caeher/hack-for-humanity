import { QueryCtx, MutationCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import { requireClinician, requireRole } from './auth'

export interface ClinicianOrgContext {
  user: Doc<'users'>
  orgId: Id<'organizations'>
  organization: Doc<'organizations'>
  clinicianMembership: Doc<'clinicianMemberships'> | null
}

/**
 * Resolves the caller's active clinician organization membership.
 * Clinicians must belong to exactly one active org caseload workspace.
 */
export async function getClinicianOrgContext(
  ctx: QueryCtx | MutationCtx
): Promise<ClinicianOrgContext | null> {
  const { user } = await requireRole(ctx, ['clinician', 'admin'])

  if (user.role === 'admin') {
    const orgMembership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .collect()

    const activeAdmin = orgMembership.find(m => m.orgRole === 'admin' && m.status === 'active')
    if (!activeAdmin) {
      return null
    }

    const organization = await ctx.db.get(activeAdmin.orgId)
    if (!organization) {
      return null
    }

    const clinicianMembership = await ctx.db
      .query('clinicianMemberships')
      .withIndex('by_userId_and_orgId', q =>
        q.eq('userId', user._id).eq('orgId', activeAdmin.orgId)
      )
      .first()

    return {
      user,
      orgId: activeAdmin.orgId,
      organization,
      clinicianMembership: clinicianMembership ?? null,
    }
  }

  const memberships = await ctx.db
    .query('clinicianMemberships')
    .withIndex('by_userId', q => q.eq('userId', user._id))
    .collect()

  const activeMembership = memberships.find(m => m.status === 'active')
  if (!activeMembership) {
    return null
  }

  const organization = await ctx.db.get(activeMembership.orgId)
  if (!organization) {
    return null
  }

  return {
    user,
    orgId: activeMembership.orgId,
    organization,
    clinicianMembership: activeMembership,
  }
}

/**
 * Asserts the caller is an active clinician or org admin with caseload access to the org.
 */
export async function requireClinicianOrg(
  ctx: QueryCtx | MutationCtx,
  orgId?: Id<'organizations'>
): Promise<ClinicianOrgContext> {
  await requireClinician(ctx)
  const context = await getClinicianOrgContext(ctx)

  if (!context) {
    throw new Error('Forbidden: No active clinician organization membership found.')
  }

  if (orgId !== undefined && context.orgId !== orgId) {
    throw new Error('Forbidden: Cross-organization caseload access denied.')
  }

  return context
}

/**
 * Asserts an alert belongs to the caller's organization caseload.
 */
export async function requireAlertOrgAccess(
  ctx: QueryCtx | MutationCtx,
  alertId: Id<'alerts'>
): Promise<{ context: ClinicianOrgContext; alert: Doc<'alerts'> }> {
  const context = await requireClinicianOrg(ctx)
  const alert = await ctx.db.get(alertId)

  if (!alert) {
    throw new Error(`Alert ${alertId} not found.`)
  }

  if (alert.orgId !== context.orgId) {
    throw new Error('Forbidden: Alert is outside your organization caseload.')
  }

  return { context, alert }
}
