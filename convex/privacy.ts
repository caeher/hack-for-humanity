import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requirePatientAccess, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import {
  privacyRequestDocValidator,
  privacyRequestStatusValidator,
} from './lib/validators'
import {
  compilePatientExportPayload,
  executePatientAnonymization,
} from './lib/privacyLogic'
import { isPatientUnderLegalHold } from './lib/retentionLogic'

/**
 * Initiate an export of all patient health and recovery data.
 * Adheres to GDPR Art. 20 and HIPAA right of access.
 */
export const requestExport = mutation({
  args: {
    patientId: v.id('patients'),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    requestId: v.id('privacyRequests'),
    status: privacyRequestStatusValidator,
  }),
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId)

    const validReason = args.reason
      ? validateStringLength(args.reason, 'Export reason', 2, 250)
      : undefined

    const now = Date.now()
    const verificationCode = `EXP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Compile export payload
    const exportPayload = await compilePatientExportPayload(ctx, args.patientId)

    const requestId = await ctx.db.insert('privacyRequests', {
      patientId: args.patientId,
      orgId: patient.orgId,
      requestedByUserId: user._id,
      requestType: 'export',
      status: 'completed',
      verificationCode,
      reason: validReason,
      requestedAt: now,
      processedAt: now,
      resultSummary: 'Export archive compiled successfully',
      exportPayload,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: args.patientId,
      event: `Patient data export completed (code ${verificationCode})`,
      targetResource: 'privacyRequests',
      resourceId: requestId,
      action: 'export',
      result: 'success',
      createdAt: now,
    })

    return {
      requestId,
      status: 'completed' as const,
    }
  },
})

/**
 * Retrieve the latest compiled export for a patient.
 */
export const getLatestExport = query({
  args: {
    patientId: v.id('patients'),
  },
  returns: v.union(privacyRequestDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requirePatientAccess(ctx, args.patientId)

    const latest = await ctx.db
      .query('privacyRequests')
      .withIndex('by_patientId_and_status', q =>
        q.eq('patientId', args.patientId).eq('status', 'completed')
      )
      .order('desc')
      .first()

    return latest
  },
})

/**
 * Request account and data deletion (GDPR Right to be Forgotten / HIPAA discharge).
 * Evaluates active legal holds: if under legal hold, request is rejected and logged.
 * Returns a verification challenge code for confirmation.
 */
export const requestDeletion = mutation({
  args: {
    patientId: v.id('patients'),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    requestId: v.id('privacyRequests'),
    verificationCode: v.string(),
    isBlocked: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { user, patient } = await requirePatientAccess(ctx, args.patientId)

    const validReason = args.reason
      ? validateStringLength(args.reason, 'Deletion reason', 2, 250)
      : undefined

    const now = Date.now()

    // 1. Check legal hold
    const holdCheck = await isPatientUnderLegalHold(ctx, args.patientId, patient.orgId)
    if (holdCheck.isBlocked) {
      const blockedId = await ctx.db.insert('privacyRequests', {
        patientId: args.patientId,
        orgId: patient.orgId,
        requestedByUserId: user._id,
        requestType: 'deletion',
        status: 'rejected',
        verificationCode: 'BLOCKED',
        reason: validReason,
        requestedAt: now,
        processedAt: now,
        failureReason: holdCheck.holdReason,
        legalHoldBlocked: true,
      })

      await ctx.db.insert('auditLogs', {
        actorUserId: user._id,
        actorRole: user.role,
        orgId: patient.orgId,
        patientId: args.patientId,
        event: `Deletion request rejected due to active legal hold: ${holdCheck.holdReason}`,
        targetResource: 'privacyRequests',
        resourceId: blockedId,
        action: 'delete',
        result: 'denied',
        createdAt: now,
      })

      return {
        requestId: blockedId,
        verificationCode: 'BLOCKED',
        isBlocked: true,
        message: `Deletion request blocked: ${holdCheck.holdReason}`,
      }
    }

    // 2. Generate identity verification challenge
    const verificationCode = `CONFIRM-DELETE-${patient.displayId}`

    const requestId = await ctx.db.insert('privacyRequests', {
      patientId: args.patientId,
      orgId: patient.orgId,
      requestedByUserId: user._id,
      requestType: 'deletion',
      status: 'pending',
      verificationCode,
      reason: validReason,
      requestedAt: now,
      legalHoldBlocked: false,
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: args.patientId,
      event: `Initiated deletion request (challenge issued: ${verificationCode})`,
      targetResource: 'privacyRequests',
      resourceId: requestId,
      action: 'delete',
      result: 'success',
      createdAt: now,
    })

    return {
      requestId,
      verificationCode,
      isBlocked: false,
      message: 'Deletion challenge issued. Submit verification code to confirm.',
    }
  },
})

/**
 * Confirm deletion request with verification challenge code.
 * Executes irreversible anonymization of PII and revokes all third-party consent.
 */
export const confirmDeletion = mutation({
  args: {
    requestId: v.id('privacyRequests'),
    verificationCode: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    anonymizedDisplayId: v.string(),
  }),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) {
      throw new Error('Privacy request not found.')
    }

    if (request.requestType !== 'deletion' || request.status !== 'pending') {
      throw new Error('Invalid or already processed deletion request.')
    }

    const { user } = await requirePatientAccess(ctx, request.patientId)

    if (args.verificationCode.trim() !== request.verificationCode) {
      throw new Error('Invalid verification challenge code.')
    }

    const now = Date.now()

    // Execute anonymization
    const { anonymizedDisplayId } = await executePatientAnonymization(
      ctx,
      request.patientId,
      user._id,
      user.role
    )

    await ctx.db.patch(args.requestId, {
      status: 'completed',
      processedAt: now,
      resultSummary: `Patient record anonymized as ${anonymizedDisplayId}`,
    })

    return {
      success: true,
      anonymizedDisplayId,
    }
  },
})

/**
 * List privacy requests for a patient or organization.
 */
export const listPrivacyRequests = query({
  args: {
    patientId: v.optional(v.id('patients')),
    orgId: v.optional(v.id('organizations')),
  },
  returns: v.array(privacyRequestDocValidator),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    if (args.patientId) {
      await requirePatientAccess(ctx, args.patientId)
      return await ctx.db
        .query('privacyRequests')
        .withIndex('by_patientId_and_status', q => q.eq('patientId', args.patientId!))
        .order('desc')
        .take(50)
    }

    if (args.orgId && (user.role === 'admin' || user.role === 'clinician')) {
      return await ctx.db
        .query('privacyRequests')
        .withIndex('by_orgId_and_status', q => q.eq('orgId', args.orgId!))
        .order('desc')
        .take(50)
    }

    return await ctx.db
      .query('privacyRequests')
      .withIndex('by_requestedByUserId', q => q.eq('requestedByUserId', user._id))
      .order('desc')
      .take(50)
  },
})
