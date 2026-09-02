import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { patientDocValidator, riskValidator } from './lib/validators'
import { requirePatientAccess, requireRole, requireUser } from './lib/auth'
import {
  validateAdherence,
  validateScore,
  validateStringLength,
} from './lib/businessLogic'

/**
 * List patients across caseload.
 * - Clinicians and Admins can view all patients or filter by risk.
 * - Caregivers can only view patients assigned to them.
 */
export const list = query({
  args: {
    risk: v.optional(riskValidator),
    paginationOpts: v.optional(paginationOptsValidator),
  },
  returns: v.union(paginationResultValidator(patientDocValidator), v.array(patientDocValidator)),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    // Caregivers only see their assigned patients
    if (user.role === 'caregiver') {
      const allPatients = await ctx.db.query('patients').take(50)
      const assigned = allPatients.filter(
        p =>
          p.caregiverName?.toLowerCase() === user.name.toLowerCase() ||
          p.caregiverId === user._id ||
          p.caregiverId === user.email
      )
      return args.risk ? assigned.filter(p => p.risk === args.risk) : assigned
    }

    // Clinicians & Admins
    if (user.role === 'clinician' || user.role === 'admin') {
      if (args.risk) {
        const q = ctx.db
          .query('patients')
          .withIndex('by_risk', q => q.eq('risk', args.risk!))
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

    // Patients see their own record
    const patientRecord = await ctx.db
      .query('patients')
      .take(50)
    return patientRecord.filter(p => p.name.toLowerCase() === user.name.toLowerCase())
  },
})

/**
 * Retrieve patient by patient ID with authorization check.
 */
export const getById = query({
  args: { patientId: v.string() },
  returns: v.union(patientDocValidator, v.null()),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    return await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
      .first()
  },
})

/**
 * Register a new patient profile.
 * Restricted to clinicians and administrators.
 */
export const create = mutation({
  args: {
    patientId: v.string(),
    name: v.string(),
    procedure: v.string(),
    day: v.number(),
    score: v.number(),
    risk: riskValidator,
    adherence: v.number(),
    surgeon: v.optional(v.string()),
    caregiverId: v.optional(v.string()),
    caregiverName: v.optional(v.string()),
    surgeryDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id('patients'),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin', 'clinician'])

    const patientId = validateStringLength(args.patientId, 'Patient ID', 1, 64)
    const name = validateStringLength(args.name, 'Patient Name', 2, 100)
    const procedure = validateStringLength(args.procedure, 'Procedure/Context', 2, 200)
    validateScore(args.score, 0, 100)
    validateAdherence(args.adherence)

    const existing = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', patientId))
      .first()

    if (existing) {
      throw new Error(`Patient with ID ${patientId} already exists.`)
    }

    return await ctx.db.insert('patients', {
      ...args,
      patientId,
      name,
      procedure,
    })
  },
})

/**
 * Update tracked symptom score and recovery adherence.
 */
export const updateScore = mutation({
  args: {
    patientId: v.string(),
    score: v.number(),
    adherence: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    await requirePatientAccess(ctx, validId)

    validateScore(args.score, 0, 100)
    if (args.adherence !== undefined) {
      validateAdherence(args.adherence)
    }

    const patient = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
      .first()

    if (!patient) {
      throw new Error(`Patient ${validId} not found.`)
    }

    await ctx.db.patch('patients', patient._id, {
      score: args.score,
      ...(args.adherence !== undefined ? { adherence: args.adherence } : {}),
    })

    return null
  },
})

/**
 * Update patient triage risk tier.
 * Restricted to clinicians and administrators.
 */
export const updateRisk = mutation({
  args: {
    patientId: v.string(),
    risk: riskValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, ['admin', 'clinician'])

    const validId = validateStringLength(args.patientId, 'patientId', 1, 64)
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', validId))
      .first()

    if (!patient) {
      throw new Error(`Patient ${validId} not found.`)
    }

    await ctx.db.patch('patients', patient._id, { risk: args.risk })
    return null
  },
})
