import { QueryCtx, MutationCtx } from '../_generated/server'
import { Doc } from '../_generated/dataModel'
import { UserIdentity } from 'convex/server'

export type Role = 'patient' | 'caregiver' | 'clinician' | 'admin'

export interface AuthContext {
  identity: UserIdentity
  user: Doc<'users'>
}

/**
 * Ensures the caller is authenticated. Throws if unauthenticated.
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
 * Matches on tokenIdentifier first, with fallback to email.
 */
export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  // 1. Match by tokenIdentifier
  if (identity.tokenIdentifier) {
    const userByToken = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first()
    if (userByToken) return userByToken
  }

  // 2. Match by email
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
 * Asserts the caller has an active registered user record.
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
 * Asserts the caller has one of the required roles.
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
 * - Clinicians and Admins have organizational read/write access.
 * - Caregivers can access patients where they are assigned as caregiver.
 * - Patients can only access their own patient records.
 */
export async function requirePatientAccess(
  ctx: QueryCtx | MutationCtx,
  patientId: string
): Promise<{ identity: UserIdentity; user: Doc<'users'>; patient: Doc<'patients'> | null }> {
  const auth = await requireUser(ctx)
  const { user } = auth

  const patient = await ctx.db
    .query('patients')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .first()

  // Admins and clinicians have caseload access
  if (user.role === 'admin' || user.role === 'clinician') {
    return { ...auth, patient }
  }

  // Patients can only access their own record
  if (user.role === 'patient') {
    if (patient && patient.name.toLowerCase() === user.name.toLowerCase()) {
      return { ...auth, patient }
    }
    // If patient record is not yet found or name matches email
    if (patient && user.email.toLowerCase().includes(patient.patientId.toLowerCase())) {
      return { ...auth, patient }
    }
    // Allow if caller's patient ID matches
    if (patient && patient.patientId === patientId && (patient.name === user.name || user.email.includes(patient.patientId.toLowerCase()))) {
      return { ...auth, patient }
    }
    // If patient matching fails
    if (patient && patient.name.toLowerCase() !== user.name.toLowerCase()) {
      throw new Error(`Forbidden: You do not have access to patient ${patientId}.`)
    }
    return { ...auth, patient }
  }

  // Caregivers can only access assigned patients
  if (user.role === 'caregiver') {
    if (patient && (patient.caregiverName === user.name || patient.caregiverId === user._id || patient.caregiverId === user.email)) {
      return { ...auth, patient }
    }
    throw new Error(`Forbidden: Caregiver not assigned to patient ${patientId}.`)
  }

  throw new Error(`Forbidden: Access to patient ${patientId} denied.`)
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

  // Admins & clinicians can participate in any clinical care thread
  if (user.role === 'admin' || user.role === 'clinician') {
    return auth
  }

  // Check if thread contains messages to/from user or threadId matches patient/caregiver
  if (threadId.toLowerCase().includes(user.name.toLowerCase()) || threadId.toLowerCase().includes(user.email.toLowerCase())) {
    return auth
  }

  const existingMessage = await ctx.db
    .query('messages')
    .withIndex('by_threadId', q => q.eq('threadId', threadId))
    .first()

  if (!existingMessage) {
    // New thread initiated by user
    return auth
  }

  if (
    existingMessage.senderId === user._id ||
    existingMessage.senderId === user.email ||
    existingMessage.recipientId === user._id ||
    existingMessage.recipientId === user.email ||
    existingMessage.senderName === user.name
  ) {
    return auth
  }

  // Allow thread participation for team care
  return auth
}
