import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import { getActiveCaregiverGrant } from './lib/caregiverAccess'
import { validateDateString } from './lib/businessLogic'
import {
  buildRecoveryReportPayload,
  RECOVERY_REPORT_SCHEMA_VERSION,
  resolveReportAccess,
  resolveIncludedSections,
  type ReportAccessRole,
} from './lib/recoveryReportLogic'
import {
  recoveryReportDocValidator,
  recoveryReportGenerateResultValidator,
  timelineRangeKeyValidator,
} from './lib/validators'
import { requirePatientAccess, requireUser } from './lib/auth'
import type { ConsentScope } from './lib/auth'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

async function getActiveEpisodeForPatient(ctx: QueryCtx | MutationCtx, patientId: Id<'patients'>) {
  return await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId_and_status', q => q.eq('patientId', patientId).eq('status', 'active'))
    .first()
}

async function loadReportSourceData(ctx: QueryCtx | MutationCtx, patientId: Id<'patients'>) {
  const [checkIns, exposures, encounters, carePlans, amendments, safetyEvaluations] =
    await Promise.all([
      ctx.db
        .query('checkIns')
        .withIndex('by_patientId', q => q.eq('patientId', patientId))
        .order('desc')
        .take(120),
      ctx.db
        .query('activityExposures')
        .withIndex('by_patientId', q => q.eq('patientId', patientId))
        .order('desc')
        .take(120),
      ctx.db
        .query('clinicalEncounters')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patientId))
        .order('desc')
        .take(30),
      ctx.db
        .query('carePlans')
        .withIndex('by_patientId', q => q.eq('patientId', patientId))
        .take(80),
      ctx.db
        .query('checkInAmendments')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patientId))
        .order('desc')
        .take(40),
      ctx.db
        .query('safetyEvaluations')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patientId))
        .order('desc')
        .take(40),
    ])

  return {
    checkIns,
    exposures,
    encounters,
    carePlans,
    amendments,
    safetyEvaluations,
  }
}

async function resolveAccessForReport(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<'patients'>
): Promise<{
  patient: Awaited<ReturnType<typeof requirePatientAccess>>['patient']
  user: Awaited<ReturnType<typeof requireUser>>['user']
  access: ReturnType<typeof resolveReportAccess>
}> {
  const { user } = await requireUser(ctx)
  const patient = await ctx.db.get(patientId)
  if (!patient) {
    throw new Error('Patient not found.')
  }

  if (patient.userId === user._id) {
    await requirePatientAccess(ctx, patientId)
    return {
      patient,
      user,
      access: resolveReportAccess('patient', null),
    }
  }

  if (user.role === 'clinician' || user.role === 'admin') {
    await requirePatientAccess(ctx, patientId)
    return {
      patient,
      user,
      access: resolveReportAccess(user.role as ReportAccessRole, null),
    }
  }

  if (user.role === 'caregiver') {
    const grant = await getActiveCaregiverGrant(ctx, patientId, user._id, Date.now())
    if (!grant) {
      throw new Error('Forbidden: Caregiver does not have active consent for this patient.')
    }
    return {
      patient,
      user,
      access: resolveReportAccess('caregiver', grant.scopes as ConsentScope[]),
    }
  }

  throw new Error('Forbidden: Access to patient denied.')
}

/**
 * Generate a versioned, consent-aware recovery report from saved source records.
 */
export const generate = mutation({
  args: {
    patientId: v.id('patients'),
    today: v.string(),
    range: timelineRangeKeyValidator,
  },
  returns: recoveryReportGenerateResultValidator,
  handler: async (ctx, args) => {
    const validToday = validateDateString(args.today, 'Today')
    const { patient, user, access } = await resolveAccessForReport(ctx, args.patientId)
    const { included } = resolveIncludedSections(access)

    if (included.length === 0) {
      throw new Error('Forbidden: No report sections are available with your current access.')
    }

    const episode = await getActiveEpisodeForPatient(ctx, patient._id)
    const patientUser = await ctx.db.get(patient.userId)
    const sourceData = await loadReportSourceData(ctx, patient._id)
    const generatedAt = Date.now()
    const dataCutoffAt = generatedAt

    const built = buildRecoveryReportPayload({
      patient,
      patientUser,
      episode,
      ...sourceData,
      access,
      range: args.range,
      today: validToday,
      timeZone: patient.timeZone ?? 'UTC',
      dataCutoffAt,
      generatedAt,
      requestedByUserId: user._id,
      requestedByRole: user.role,
      requestedByName: user.name,
      dataSource: 'live',
    })

    const reportId = await ctx.db.insert('recoveryReports', {
      patientId: patient._id,
      episodeId: episode?._id,
      orgId: patient.orgId,
      reportVersion: RECOVERY_REPORT_SCHEMA_VERSION,
      contentHash: built.contentHash,
      rangeStart: built.rangeStart,
      rangeEnd: built.rangeEnd,
      rangeKey: args.range,
      dataCutoffAt,
      generatedAt,
      requestedByUserId: user._id,
      requestedByRole: user.role,
      requestedByName: user.name,
      consentScopesApplied: access.scopes,
      methodologyVersions: built.payload.methodologyVersions,
      dataSource: 'live',
      sectionsIncluded: built.payload.sectionsIncluded,
      sectionsOmitted: built.payload.sectionsOmitted,
      payload: built.payload,
      sourceRecordRefs: built.sourceRecordRefs,
      status: 'active',
    })

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: 'Recovery report generated',
      targetResource: 'recoveryReports',
      resourceId: reportId,
      action: 'report_generate',
      createdAt: generatedAt,
    })

    return {
      reportId,
      reportVersion: RECOVERY_REPORT_SCHEMA_VERSION,
      contentHash: built.contentHash,
      generatedAt,
      dataCutoffAt,
      payload: built.payload,
    }
  },
})

/**
 * Fetch a previously generated report by id.
 */
export const getById = query({
  args: {
    reportId: v.id('recoveryReports'),
  },
  returns: v.union(recoveryReportDocValidator, v.null()),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId)
    if (!report) {
      return null
    }

    await resolveAccessForReport(ctx, report.patientId)
    return report
  },
})

/**
 * List generated reports for a patient (newest first).
 */
export const listForPatient = query({
  args: {
    patientId: v.id('patients'),
    paginationOpts: v.optional(paginationOptsValidator),
    limit: v.optional(v.number()),
  },
  returns: v.union(
    paginationResultValidator(recoveryReportDocValidator),
    v.array(recoveryReportDocValidator)
  ),
  handler: async (ctx, args) => {
    await resolveAccessForReport(ctx, args.patientId)

    const q = ctx.db
      .query('recoveryReports')
      .withIndex('by_patientId_and_generatedAt', q => q.eq('patientId', args.patientId))
      .order('desc')

    if (args.paginationOpts) {
      return await q.paginate(args.paginationOpts)
    }

    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50)
    return await q.take(limit)
  },
})

/**
 * Return the most recently generated report for a patient, if any.
 */
export const getLatest = query({
  args: {
    patientId: v.id('patients'),
  },
  returns: v.union(recoveryReportDocValidator, v.null()),
  handler: async (ctx, args) => {
    await resolveAccessForReport(ctx, args.patientId)

    return await ctx.db
      .query('recoveryReports')
      .withIndex('by_patientId_and_generatedAt', q => q.eq('patientId', args.patientId))
      .order('desc')
      .first()
  },
})
