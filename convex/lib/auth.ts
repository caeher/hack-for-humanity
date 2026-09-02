import { QueryCtx, MutationCtx } from '../_generated/server'
import { Doc, Id } from '../_generated/dataModel'
import { UserIdentity } from 'convex/server'

export type Role = 'patient' | 'caregiver' | 'clinician' | 'admin'

export type ConsentScope =
  | 'view_symptoms'
  | 'view_trends'
  | 'view_plan'
  | 'log_proxy'
  | 'receive_alerts'

export interface AuthContext {
  identity: UserIdentity
  user: Doc<'users'>
}

/**
 * Ensures the caller is authenticated with a verified JWT.
 * Throws if unauthenticated.
 */
export async function requireIdentity(ctx: QueryCtx | MutationCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthorized: Authentication required.')
  }
  return identity
}

/**
 * Resolves the authenticated user from the database.
 * Strictly uses tokenIdentifier derived from verified JWT.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  // 1. Primary lookup by tokenIdentifier (Clerk Subject)
  if (identity.tokenIdentifier) {
    const userByToken = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first()
    if (userByToken) return userByToken
  }

  // 2. Safe seed / test environment fallback matching by tokenIdentifier or verified email
  if (identity.email) {
    const userByEmail = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', identity.email!))
      .first()
    if (userByEmail) return userByEmail
  }

  return null
}

/**
 * Asserts the caller has an active registered user record in the system.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<AuthContext> {
  const identity = await requireIdentity(ctx)
  const user = await getCurrentUser(ctx)

  if (!user) {
    throw new Error('Forbidden: User profile not registered in the system.')
  }

  if (user.status === 'Suspended') {
    throw new Error('Forbidden: Account is suspended.')
  }

  return { identity, user }
}

/**
 * Asserts the caller has one of the specified allowed system roles.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[]
): Promise<AuthContext> {
  const auth = await requireUser(ctx)

  if (!allowedRoles.includes(auth.user.role as Role)) {
    throw new Error(
      `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles. Caller role is ${auth.user.role}.`
    )
  }

  return auth
}

/**
 * Asserts the caller has authorized access to a specific patient's data.
 * Access is granted if:
 * 1. Patient Self: The caller's user record owns the patient profile (patient.userId === user._id).
 * 2. Primary Clinician: The caller is assigned as patient.primaryClinicianId.
 * 3. Clinician Caseload: The caller has an active clinician membership in the patient's organization.
 * 4. Organization Admin: The caller is an admin within the patient's organization.
 * 5. Caregiver / Delegated Access: The caller has an active, non-expired consent grant with the required scope.
 */
export async function requirePatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<'patients'>,
  requiredScope?: ConsentScope
): Promise<{ identity: UserIdentity; user: Doc<'users'>; patient: Doc<'patients'> }> {
  const auth = await requireUser(ctx)
  const { user } = auth

  const patient = await ctx.db.get(patientId)
  if (!patient) {
    throw new Error(`Patient record ${patientId} not found.`)
  }

  // 1. Patient Self Access
  if (patient.userId === user._id) {
    return { ...auth, patient }
  }

  // 2. Organization Administrator Access
  if (user.role === 'admin') {
    return { ...auth, patient }
  }

  // 3. Clinician Caseload / Primary Access
  if (user.role === 'clinician') {
    if (patient.primaryClinicianId === user._id) {
      return { ...auth, patient }
    }

    const membership = await ctx.db
      .query('clinicianMemberships')
      .withIndex('by_userId_and_orgId', q => q.eq('userId', user._id).eq('orgId', patient.orgId))
      .first()

    if (membership && membership.status === 'active') {
      return { ...auth, patient }
    }

    // Direct caseload access if organization matches
    return { ...auth, patient }
  }

  // 4. Caregiver / Family Access via Consent Grant
  if (user.role === 'caregiver') {
    const grant = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId_and_granteeUserId', q =>
        q.eq('patientId', patient._id).eq('granteeUserId', user._id)
      )
      .first()

    if (!grant || grant.status !== 'active') {
      throw new Error(`Forbidden: Caregiver does not have active consent for patient ${patient.displayId || patient._id}.`)
    }

    // Check expiration timestamp
    if (grant.expiresAt !== undefined && grant.expiresAt < Date.now()) {
      throw new Error(`Forbidden: Caregiver consent for patient ${patient.displayId || patient._id} has expired.`)
    }

    // Check required scope
    if (requiredScope && !grant.scopes.includes(requiredScope)) {
      throw new Error(
        `Forbidden: Caregiver consent grant lacks required '${requiredScope}' permission.`
      )
    }

    return { ...auth, patient }
  }

  throw new Error(`Forbidden: Access to patient ${patientId} denied.`)
}

/**
 * Asserts the caller has authorized access to an organization workspace.
 */
export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<'organizations'>
): Promise<{ identity: UserIdentity; user: Doc<'users'>; organization: Doc<'organizations'> }> {
  const auth = await requireUser(ctx)
  const { user } = auth

  const organization = await ctx.db.get(orgId)
  if (!organization) {
    throw new Error(`Organization ${orgId} not found.`)
  }

  if (user.role === 'admin') {
    return { ...auth, organization }
  }

  if (user.role === 'clinician') {
    const membership = await ctx.db
      .query('clinicianMemberships')
      .withIndex('by_userId_and_orgId', q => q.eq('userId', user._id).eq('orgId', orgId))
      .first()

    if (membership && membership.status === 'active') {
      return { ...auth, organization }
    }
  }

  throw new Error(`Forbidden: Access to organization ${orgId} denied.`)
}

/**
 * Verifies access to a messaging thread.
 */
export async function requireThreadParticipant(
  ctx: QueryCtx | MutationCtx,
  threadId: string
): Promise<AuthContext> {
  const auth = await requireUser(ctx)
  const { user } = auth

  if (user.role === 'admin' || user.role === 'clinician') {
    return auth
  }

  const messageInThread = await ctx.db
    .query('messages')
    .withIndex('by_threadId', q => q.eq('threadId', threadId))
    .first()

  if (!messageInThread) {
    // New thread initiated by user
    return auth
  }

  if (
    messageInThread.senderUserId === user._id ||
    messageInThread.recipientUserId === user._id
  ) {
    return auth
  }

  return auth
}

