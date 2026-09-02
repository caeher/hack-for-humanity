import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  roleValidator,
  syncUserResultValidator,
  userDocValidator,
  userStatusValidator,
} from './lib/validators'
import { requireIdentity, requireRole, getCurrentUser } from './lib/auth'
import { validateEmail, validateStringLength } from './lib/businessLogic'

const roleHomes: Record<string, string> = {
  patient: '/patient/dashboard',
  caregiver: '/caregiver/dashboard',
  clinician: '/clinician/dashboard',
  admin: '/admin/dashboard',
}

/**
 * List users in the organization.
 * Restricted to administrators and clinicians.
 */
export const list = query({
  args: {
    role: v.optional(roleValidator),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(userDocValidator), v.array(userDocValidator)),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin', 'clinician'])

    if (args.role) {
      const q = ctx.db.query('users').withIndex('by_role', q => q.eq('role', args.role!))
      if (args.paginationOpts) {
        return await q.paginate(args.paginationOpts)
      }
      return await q.take(50)
    }

    const q = ctx.db.query('users')
    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }
    return await q.take(50)
  },
})

/**
 * Retrieve current authenticated user profile.
 */
export const getMe = query({
  args: {},
  returns: v.union(userDocValidator, v.null()),
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    return await getCurrentUser(ctx)
  },
})

/**
 * Synchronize the current Clerk authenticated session with the Convex database.
 * Handles:
 * 1. Matching existing Active users (updates lastActive, tokenIdentifier, clerkId).
 * 2. Claiming pending invitations for Invited users (transitions status to Active).
 * 3. Blocking Suspended accounts.
 * 4. Auto-provisioning new self-registered users with patient profiles.
 */
export const syncCurrentUser = mutation({
  args: {
    name: v.optional(v.string()),
  },
  returns: syncUserResultValidator,
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)

    // 1. Primary lookup by tokenIdentifier
    let existingUser = await ctx.db
      .query('users')
      .withIndex('by_tokenIdentifier', q => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .first()

    // 2. Secondary lookup by Clerk user ID / subject
    if (!existingUser && identity.subject) {
      existingUser = await ctx.db
        .query('users')
        .withIndex('by_clerkId', q => q.eq('clerkId', identity.subject))
        .first()
    }

    // 3. Fallback lookup by email (e.g. for invited users)
    if (!existingUser && identity.email) {
      existingUser = await ctx.db
        .query('users')
        .withIndex('by_email', q => q.eq('email', identity.email!))
        .first()
    }

    const now = Date.now()

    // Handle existing user
    if (existingUser) {
      if (existingUser.status === 'Suspended') {
        throw new Error('Forbidden: Account is suspended.')
      }

      const updates: {
        lastActive: string
        tokenIdentifier?: string
        clerkId?: string
        name?: string
        status?: 'Active'
      } = {
        lastActive: 'Just now',
      }

      if (existingUser.tokenIdentifier !== identity.tokenIdentifier) {
        updates.tokenIdentifier = identity.tokenIdentifier
      }
      if (identity.subject && existingUser.clerkId !== identity.subject) {
        updates.clerkId = identity.subject
      }
      if (args.name && args.name.trim() !== '' && existingUser.name !== args.name) {
        updates.name = args.name
      }

      // Claim pending invitation
      if (existingUser.status === 'Invited') {
        updates.status = 'Active'

        await ctx.db.patch(existingUser._id, updates)

        await ctx.db.insert('auditLogs', {
          actorUserId: existingUser._id,
          actorRole: existingUser.role,
          event: `Claimed invitation and activated profile (${existingUser.email})`,
          targetResource: 'users',
          resourceId: existingUser._id,
          action: 'update',
          createdAt: now,
        })
      } else {
        await ctx.db.patch(existingUser._id, updates)
      }

      const updated = (await ctx.db.get(existingUser._id))!
      return {
        user: updated,
        isNew: false,
        role: updated.role,
        status: updated.status,
        authorizedHome: roleHomes[updated.role] || '/patient/dashboard',
      }
    }

    // Provision brand new self-registered patient user
    const resolvedName =
      args.name?.trim() ||
      identity.name ||
      identity.givenName ||
      (identity.email ? identity.email.split('@')[0] : 'New User')
    const resolvedEmail = identity.email || `${identity.subject || 'user'}@cri-recovery.local`

    const newUserId = await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      clerkId: identity.subject || undefined,
      name: resolvedName,
      email: resolvedEmail,
      role: 'patient',
      status: 'Active',
      lastActive: 'Just now',
      createdAt: now,
    })

    const newUser = (await ctx.db.get(newUserId))!

    // Resolve default organization to associate initial patient profile
    const defaultOrg = await ctx.db.query('organizations').first()
    if (defaultOrg) {
      const displayId = `P-${Math.floor(1000 + Math.random() * 9000)}`
      await ctx.db.insert('patients', {
        userId: newUser._id,
        orgId: defaultOrg._id,
        displayId,
        preferredName: resolvedName.split(' ')[0],
        status: 'Active',
        notes: 'Self-registered patient recovery profile.',
        createdAt: now,
      })
    }

    // Record audit trail
    await ctx.db.insert('auditLogs', {
      actorUserId: newUser._id,
      actorRole: newUser.role,
      event: `Self-registered new patient user (${newUser.email})`,
      targetResource: 'users',
      resourceId: newUser._id,
      action: 'create',
      createdAt: now,
    })

    return {
      user: newUser,
      isNew: true,
      role: newUser.role,
      status: newUser.status,
      authorizedHome: '/patient/dashboard',
    }
  },
})

/**
 * Get user profile by email address.
 * Caller must be authenticated.
 */
export const getByEmail = query({
  args: { email: v.string() },
  returns: v.union(userDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireIdentity(ctx)
    const validEmail = validateEmail(args.email)
    return await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', validEmail))
      .first()
  },
})

/**
 * Invite a new user to the platform.
 * Restricted to administrators.
 */
export const inviteUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: roleValidator,
    orgId: v.optional(v.id('organizations')),
  },
  returns: v.id('users'),
  handler: async (ctx, args) => {
    const { user: adminUser } = await requireRole(ctx, ['admin'])

    const validName = validateStringLength(args.name, 'Name', 2, 100)
    const validEmail = validateEmail(args.email)

    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', q => q.eq('email', validEmail))
      .first()

    if (existing) {
      throw new Error(`User with email ${validEmail} already exists.`)
    }

    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      tokenIdentifier: `invited|${validEmail}`,
      name: validName,
      email: validEmail,
      role: args.role,
      status: 'Invited',
      createdAt: now,
    })

    // Record audit trail
    await ctx.db.insert('auditLogs', {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      orgId: args.orgId,
      event: `Invited new ${args.role} user (${validEmail})`,
      targetResource: 'users',
      resourceId: userId,
      action: 'create',
      createdAt: now,
    })

    return userId
  },
})

/**
 * Update user status or role.
 * Restricted to administrators.
 */
export const updateStatus = mutation({
  args: {
    userId: v.id('users'),
    status: userStatusValidator,
    role: v.optional(roleValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user: adminUser } = await requireRole(ctx, ['admin'])

    const targetUser = await ctx.db.get(args.userId)
    if (!targetUser) {
      throw new Error(`User ${args.userId} not found.`)
    }

    const updates: { status: 'Active' | 'Invited' | 'Suspended'; role?: 'patient' | 'caregiver' | 'clinician' | 'admin' } = {
      status: args.status,
    }
    if (args.role) {
      updates.role = args.role
    }

    await ctx.db.patch(args.userId, updates)

    await ctx.db.insert('auditLogs', {
      actorUserId: adminUser._id,
      actorRole: adminUser.role,
      event: `Updated status to ${args.status}${args.role ? ` and role to ${args.role}` : ''} for ${targetUser.email}`,
      targetResource: 'users',
      resourceId: args.userId,
      action: 'update',
      createdAt: Date.now(),
    })

    return null
  },
})

