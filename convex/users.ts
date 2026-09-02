import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { roleValidator, userDocValidator } from './lib/validators'
import { requireIdentity, requireRole, getCurrentUser } from './lib/auth'
import { validateEmail, validateStringLength } from './lib/businessLogic'

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
    await requireIdentity(ctx)
    return await getCurrentUser(ctx)
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
      name: validName,
      email: validEmail,
      role: args.role,
      status: 'Invited',
      createdAt: now,
    })

    // Record audit trail
    await ctx.db.insert('auditLogs', {
      time: 'Just now',
      actor: adminUser.name || 'Admin',
      event: `Invited new ${args.role} user (${validEmail})`,
      resource: validEmail,
      createdAt: now,
    })

    return userId
  },
})
