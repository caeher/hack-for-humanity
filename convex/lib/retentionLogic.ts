import { QueryCtx, MutationCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'

export const STATUTORY_RETENTION_DAYS = {
  ADULT_CLINICAL: 2555, // 7 years
  AUDIT_LOG_MINIMUM: 365, // 1 year minimum
  AUDIT_LOG_STANDARD: 2555, // 7 years standard
  EPHEMERAL_NOTIFICATIONS: 90, // 90 days for read notifications
  ORPHAN_ATTACHMENTS: 30, // 30 days for abandoned uploads
}

/**
 * Checks if a patient or their organization is currently subject to an active legal/clinical hold.
 * If true, all statutory retention purging and patient-initiated right-to-be-forgotten
 * deletion requests MUST be rejected/blocked.
 */
export async function isPatientUnderLegalHold(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<'patients'>,
  orgId?: Id<'organizations'>
): Promise<{ isBlocked: boolean; holdReason?: string }> {
  // 1. Check patient-specific active holds
  const patientHold = await ctx.db
    .query('legalHolds')
    .withIndex('by_patientId_and_status', q =>
      q.eq('patientId', patientId).eq('status', 'active')
    )
    .first()

  if (patientHold) {
    return {
      isBlocked: true,
      holdReason: `Active ${patientHold.holdType} hold: ${patientHold.reason}`,
    }
  }

  // 2. Resolve orgId if not provided
  let effectiveOrgId = orgId
  if (!effectiveOrgId) {
    const patient = await ctx.db.get(patientId)
    effectiveOrgId = patient?.orgId
  }

  // 3. Check organization-wide active holds
  if (effectiveOrgId) {
    const orgHolds = await ctx.db
      .query('legalHolds')
      .withIndex('by_orgId_and_status', q =>
        q.eq('orgId', effectiveOrgId!).eq('status', 'active')
      )
      .collect()

    const orgWideHold = orgHolds.find(h => h.patientId === undefined)
    if (orgWideHold) {
      return {
        isBlocked: true,
        holdReason: `Active organization-wide ${orgWideHold.holdType} hold: ${orgWideHold.reason}`,
      }
    }
  }

  return { isBlocked: false }
}

/**
 * Computes statutory retention deadline for a given record.
 * Handles adult 7-year rule and pediatric rule (age of majority 18 + 7 years = age 25).
 */
export function calculateRetentionDeadline(params: {
  recordCreatedAt: number
  isPediatric?: boolean
  patientAgeBand?: string
  retentionDays?: number
}): number {
  const ONE_DAY_MS = 86400000

  // Pediatric patients (13-17) require retention until age 25
  if (params.isPediatric || params.patientAgeBand === '13-17') {
    // Retain for at least 12 years from adolescent record creation (13 + 12 = 25)
    return params.recordCreatedAt + 12 * 365 * ONE_DAY_MS
  }

  const days = params.retentionDays ?? STATUTORY_RETENTION_DAYS.ADULT_CLINICAL
  return params.recordCreatedAt + days * ONE_DAY_MS
}
