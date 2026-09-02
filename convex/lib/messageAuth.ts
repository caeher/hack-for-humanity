import { QueryCtx, MutationCtx } from '../_generated/server'
import { Doc } from '../_generated/dataModel'
import { AuthContext, requirePatientAccess, requireUser } from './auth'

export type ThreadAccessMode = 'view' | 'send'

export interface ThreadAccessContext extends AuthContext {
  thread: Doc<'messageThreads'>
  patient: Doc<'patients'>
}

async function getThreadByExternalId(
  ctx: QueryCtx | MutationCtx,
  threadId: string
): Promise<Doc<'messageThreads'> | null> {
  return await ctx.db
    .query('messageThreads')
    .withIndex('by_externalThreadId', q => q.eq('externalThreadId', threadId))
    .first()
}

async function assertSecureMessagingEnabled(
  ctx: QueryCtx | MutationCtx,
  orgId: Doc<'organizations'>['_id']
): Promise<void> {
  const organization = await ctx.db.get(orgId)
  if (!organization) {
    throw new Error('Organization not found.')
  }

  if (!organization.featureFlags?.secureMessaging) {
    throw new Error('Secure messaging is not enabled for this organization.')
  }
}

/**
 * Verifies live authorization for a care-team messaging thread.
 * Access is re-evaluated on every request so revoked consent takes effect immediately.
 */
export async function requireThreadAccess(
  ctx: QueryCtx | MutationCtx,
  threadId: string,
  mode: ThreadAccessMode
): Promise<ThreadAccessContext> {
  const auth = await requireUser(ctx)
  const thread = await getThreadByExternalId(ctx, threadId)

  if (!thread) {
    throw new Error('Thread not found.')
  }

  if (thread.status !== 'active') {
    throw new Error('This conversation thread is no longer active.')
  }

  await assertSecureMessagingEnabled(ctx, thread.orgId)

  const patient = await ctx.db.get(thread.patientId)
  if (!patient) {
    throw new Error('Patient record not found for thread.')
  }

  const requiredScope = mode === 'send' ? 'send_messages' : 'view_messages'

  if (patient.userId === auth.user._id) {
    return { ...auth, thread, patient }
  }

  if (auth.user.role === 'caregiver') {
    await requirePatientAccess(ctx, thread.patientId, requiredScope)
    return { ...auth, thread, patient }
  }

  if (auth.user.role === 'clinician') {
    await requirePatientAccess(ctx, thread.patientId)
    return { ...auth, thread, patient }
  }

  if (auth.user.role === 'admin') {
    const membership = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_userId_and_orgId', q =>
        q.eq('userId', auth.user._id).eq('orgId', thread.orgId)
      )
      .first()

    if (!membership || membership.orgRole !== 'admin' || membership.status !== 'active') {
      throw new Error('Forbidden: Admin access to this thread is denied.')
    }

    return { ...auth, thread, patient }
  }

  throw new Error('Forbidden: You are not authorized to access this conversation.')
}

/**
 * Returns thread summaries the caller may access, filtered by live consent and caseload rules.
 */
export async function listAccessibleThreadDocs(
  ctx: QueryCtx,
  user: Doc<'users'>
): Promise<Doc<'messageThreads'>[]> {
  if (user.role === 'patient') {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    if (!patient) {
      return []
    }

    await assertSecureMessagingEnabled(ctx, patient.orgId)

    return await ctx.db
      .query('messageThreads')
      .withIndex('by_patientId_and_status', q =>
        q.eq('patientId', patient._id).eq('status', 'active')
      )
      .order('desc')
      .take(50)
  }

  if (user.role === 'caregiver') {
    const grants = await ctx.db
      .query('consentGrants')
      .withIndex('by_granteeUserId_and_status', q =>
        q.eq('granteeUserId', user._id).eq('status', 'active')
      )
      .take(50)

    const now = Date.now()
    const threads: Doc<'messageThreads'>[] = []

    for (const grant of grants) {
      if (grant.expiresAt !== undefined && grant.expiresAt < now) {
        continue
      }
      if (!grant.scopes.includes('view_messages')) {
        continue
      }

      const patientThreads = await ctx.db
        .query('messageThreads')
        .withIndex('by_patientId_and_status', q =>
          q.eq('patientId', grant.patientId).eq('status', 'active')
        )
        .take(10)

      threads.push(...patientThreads)
    }

    return threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  }

  if (user.role === 'clinician') {
    const memberships = await ctx.db
      .query('clinicianMemberships')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .take(20)

    const activeOrgIds = memberships
      .filter(m => m.status === 'active')
      .map(m => m.orgId)

    const threads: Doc<'messageThreads'>[] = []

    for (const orgId of activeOrgIds) {
      await assertSecureMessagingEnabled(ctx, orgId)

      const orgThreads = await ctx.db
        .query('messageThreads')
        .withIndex('by_orgId_and_lastMessageAt', q => q.eq('orgId', orgId))
        .order('desc')
        .take(50)

      for (const thread of orgThreads) {
        if (thread.status !== 'active') {
          continue
        }

        try {
          await requirePatientAccess(ctx, thread.patientId)
          threads.push(thread)
        } catch {
          // Clinician not on this patient's caseload
        }
      }
    }

    return threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  }

  if (user.role === 'admin') {
    const memberships = await ctx.db
      .query('organizationMemberships')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .take(20)

    const threads: Doc<'messageThreads'>[] = []

    for (const membership of memberships) {
      if (membership.orgRole !== 'admin' || membership.status !== 'active') {
        continue
      }

      await assertSecureMessagingEnabled(ctx, membership.orgId)

      const orgThreads = await ctx.db
        .query('messageThreads')
        .withIndex('by_orgId_and_lastMessageAt', q => q.eq('orgId', membership.orgId))
        .order('desc')
        .take(50)

      threads.push(...orgThreads.filter(t => t.status === 'active'))
    }

    return threads.sort((a, b) => b.lastMessageAt - a.lastMessageAt)
  }

  return []
}
