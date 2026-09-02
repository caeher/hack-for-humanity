import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { patientDocValidator, patientStatusValidator } from './lib/validators'
import { requirePatientAccess, requireRole, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

/**
 * List patients across caseload.
 * - Clinicians and Admins can view caseload patients in their organization.
 * - Caregivers can view patients who have granted active consent.
 * - Patients can view their own patient profile.
 */
export const list = query({
  args: {
    orgId: v.optional(v.id('organizations')),
    status: v.optional(patientStatusValidator),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(patientDocValidator), v.array(patientDocValidator)),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    // 1. Caregivers: Resolve patients via active consent grants
    if (user.role === 'caregiver') {
      const grants = await ctx.db
        .query('consentGrants')
        .withIndex('by_granteeUserId_and_status', q =>
          q.eq('granteeUserId', user._id).eq('status', 'active')
        )
        .take(50)

      const now = Date.now()
      const validGrants = grants.filter(g => g.expiresAt === undefined || g.expiresAt > now)

      const patientList = []
      for (const grant of validGrants) {
        const patient = await ctx.db.get(grant.patientId)
        if (patient) {
          if (!args.status || patient.status === args.status) {
            patientList.push(patient)
          }
        }
      }
      return patientList
    }

    // 2. Clinicians & Admins: Query organization caseload
    if (user.role === 'clinician' || user.role === 'admin') {
      if (args.orgId && args.status) {
        const q = ctx.db
          .query('patients')
          .withIndex('by_orgId_and_status', q =>
            q.eq('orgId', args.orgId!).eq('status', args.status!)
          )
        if (args.paginationOpts) {
          return await q.paginate(args.paginationOpts)
        }
        return await q.take(50)
      }

      if (args.orgId) {
        const q = ctx.db
          .query('patients')
          .withIndex('by_orgId', q => q.eq('orgId', args.orgId!))
        if (args.paginationOpts) {
          return await q.paginate(args.paginationOpts)
        }
        return await q.take(50)
      }

      const q = ctx.db.query('patients')
      if (args.paginationOpts) {
        return await q.paginate(args.paginationOpts)
      }
      return await q.take(50)
    }

    // 3. Patients: Return self profile
    const selfPatient = await ctx.db
      .query('patients')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    return selfPatient ? [selfPatient] : []
  },
})

/**
 * Retrieve patient by unique Convex Document ID.
 */
export const getById = query({
  args: { patientId: v.id('patients') },
  returns: v.union(patientDocValidator, v.null()),
  handler: async (ctx, args) => {
    const { patient } = await requirePatientAccess(ctx, args.patientId)
    return patient
  },
})

/**
 * Retrieve patient by human-readable display ID (e.g. "P-1042").
 */
export const getByDisplayId = query({
  args: { displayId: v.string() },
  returns: v.union(patientDocValidator, v.null()),
  handler: async (ctx, args) => {
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_displayId', q => q.eq('displayId', args.displayId))
      .first()

    if (!patient) return null

    await requirePatientAccess(ctx, patient._id)
    return patient
  },
})

/**
 * Retrieve patient profile belonging to the calling user.
 */
export const getMePatient = query({
  args: {},
  returns: v.union(patientDocValidator, v.null()),
  handler: async ctx => {
    const { user } = await requireUser(ctx)
    return await ctx.db
      .query('patients')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()
  },
})

/**
 * Register a new patient profile.
 * Restricted to clinicians and administrators.
 */
export const create = mutation({
  args: {
    userId: v.id('users'),
    orgId: v.id('organizations'),
    displayId: v.string(),
    primaryClinicianId: v.optional(v.id('users')),
    dateOfBirth: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id('patients'),
  handler: async (ctx, args) => {
    const { user: authorUser } = await requireRole(ctx, ['admin', 'clinician'])

    const displayId = validateStringLength(args.displayId, 'Display ID', 1, 64)
    const existing = await ctx.db
      .query('patients')
      .withIndex('by_displayId', q => q.eq('displayId', displayId))
      .first()

    if (existing) {
      throw new Error(`Patient with display ID ${displayId} already exists.`)
    }

    const now = Date.now()
    const patientId = await ctx.db.insert('patients', {
      userId: args.userId,
      orgId: args.orgId,
      primaryClinicianId: args.primaryClinicianId,
      displayId,
      dateOfBirth: args.dateOfBirth,
      preferredName: args.preferredName,
      status: 'Active',
      notes: args.notes,
      createdAt: now,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: authorUser._id,
      actorRole: authorUser.role,
      orgId: args.orgId,
      patientId,
      event: `Enrolled patient ${displayId}`,
      targetResource: 'patients',
      resourceId: patientId,
      action: 'create',
      createdAt: now,
    })

    return patientId
  },
})

/**
 * Update patient status.
 */
export const updateStatus = mutation({
  args: {
    patientId: v.id('patients'),
    status: patientStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin', 'clinician'])

    const patient = await ctx.db.get(args.patientId)
    if (!patient) {
      throw new Error(`Patient ${args.patientId} not found.`)
    }

    await ctx.db.patch(args.patientId, { status: args.status })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: `Updated status to ${args.status}`,
      targetResource: 'patients',
      resourceId: patient._id,
      action: 'update',
      createdAt: Date.now(),
    })

    return null
  },
})

