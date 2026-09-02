import { v } from 'convex/values'
import { query } from './_generated/server'
import { paginationOptsValidator, paginationResultValidator } from 'convex/server'
import {
  caseloadAttentionValidator,
  caseloadPatientRowValidator,
  caseloadSortKeyValidator,
  caseloadSummaryValidator,
  patientStatusValidator,
  riskValidator,
} from './lib/validators'
import { requireClinicianOrg } from './lib/clinicianAuth'
import {
  buildStableSortKey,
  computeCheckInRatePercent,
  computeDayNumber,
  countMissedCheckInsInWindow,
  deriveCaseloadAttention,
  explainRiskLevel,
} from './lib/caseloadLogic'
import { addDaysToIsoDate } from './lib/checkInHistoryLogic'
import { Doc, Id } from './_generated/dataModel'
import { QueryCtx } from './_generated/server'

async function getActiveEpisode(
  ctx: QueryCtx,
  patientId: Id<'patients'>
): Promise<Doc<'recoveryEpisodes'> | null> {
  return await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId_and_status', q => q.eq('patientId', patientId).eq('status', 'active'))
    .first()
}

async function buildCaseloadRow(
  ctx: QueryCtx,
  patient: Doc<'patients'>,
  today: string,
  windowStart: string
) {
  const user = await ctx.db.get(patient.userId)
  const episode = await getActiveEpisode(ctx, patient._id)

  const latestCheckIn = await ctx.db
    .query('checkIns')
    .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
    .order('desc')
    .first()

  const recentCheckIns = await ctx.db
    .query('checkIns')
    .withIndex('by_patientId_and_date', q =>
      q.eq('patientId', patient._id).gte('date', windowStart)
    )
    .collect()

  const recordedDates = new Set(recentCheckIns.map(c => c.date))
  const missedCheckInsLast7Days = countMissedCheckInsInWindow(
    recordedDates,
    windowStart,
    today
  )
  const eligibleDays = 7
  const recordedDays = eligibleDays - missedCheckInsLast7Days
  const checkInRate =
    episode?.adherenceRate ??
    computeCheckInRatePercent(recordedDays, eligibleDays)

  const activeAlerts = await ctx.db
    .query('alerts')
    .withIndex('by_patientId', q => q.eq('patientId', patient._id))
    .collect()

  const now = Date.now()
  const openAlerts = activeAlerts.filter(
    a => a.status === 'active' || a.status === 'acknowledged'
  )
  const activeHighAlerts = openAlerts.filter(a => a.severity === 'High').length
  const activeMediumAlerts = openAlerts.filter(a => a.severity === 'Medium').length

  const latestSafety = latestCheckIn
    ? await ctx.db
        .query('safetyEvaluations')
        .withIndex('by_patientId_and_createdAt', q => q.eq('patientId', patient._id))
        .order('desc')
        .first()
    : null

  const riskLevel = episode?.riskLevel ?? null
  const attentionResult = deriveCaseloadAttention({
    riskLevel,
    activeHighAlerts,
    activeMediumAlerts,
    missedCheckInsLast7Days,
    latestSafetyStatus: latestSafety?.status ?? null,
  })

  const patientName = patient.preferredName ?? user?.name ?? patient.displayId

  return {
    patientId: patient._id,
    displayId: patient.displayId,
    patientName,
    preferredName: patient.preferredName,
    recoveryContext: episode?.injuryContext ?? null,
    episodeId: episode?._id ?? null,
    dayNumber: computeDayNumber(episode?.incidentDate ?? episode?.startDate, today),
    symptomTotal: latestCheckIn?.symptomTotal ?? null,
    symptomTotalUpdatedAt: latestCheckIn?.createdAt ?? null,
    checkInRate,
    riskLevel,
    riskRationale: explainRiskLevel(riskLevel),
    attention: attentionResult.attention,
    attentionReasons: attentionResult.reasons,
    activeAlertCount: openAlerts.length,
    missedCheckInsLast7Days,
    status: patient.status,
    sortKey: buildStableSortKey(patient.displayId),
    _sortRisk: riskLevel ?? 'Stable',
    _sortSymptom: latestCheckIn?.symptomTotal ?? -1,
    _sortCheckInRate: checkInRate ?? -1,
    _now: now,
  }
}

function matchesSearch(
  row: { displayId: string; patientName: string; recoveryContext: string | null },
  search: string
): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) {
    return true
  }
  return (
    row.displayId.toLowerCase().includes(needle) ||
    row.patientName.toLowerCase().includes(needle) ||
    (row.recoveryContext?.toLowerCase().includes(needle) ?? false)
  )
}

function compareRows(
  a: Awaited<ReturnType<typeof buildCaseloadRow>>,
  b: Awaited<ReturnType<typeof buildCaseloadRow>>,
  sortBy: 'displayId' | 'riskLevel' | 'symptomTotal' | 'checkInRate'
): number {
  if (sortBy === 'displayId') {
    return a.sortKey.localeCompare(b.sortKey)
  }
  if (sortBy === 'riskLevel') {
    const order = { Elevated: 0, Review: 1, Stable: 2 }
    const aRank = order[a._sortRisk as keyof typeof order] ?? 3
    const bRank = order[b._sortRisk as keyof typeof order] ?? 3
    if (aRank !== bRank) {
      return aRank - bRank
    }
    return a.sortKey.localeCompare(b.sortKey)
  }
  if (sortBy === 'symptomTotal') {
    if (a._sortSymptom !== b._sortSymptom) {
      return b._sortSymptom - a._sortSymptom
    }
    return a.sortKey.localeCompare(b.sortKey)
  }
  if (a._sortCheckInRate !== b._sortCheckInRate) {
    return b._sortCheckInRate - a._sortCheckInRate
  }
  return a.sortKey.localeCompare(b.sortKey)
}

/**
 * Paginated clinician caseload with indexed org scoping, search, filters, and stable sorting.
 */
export const listPatients = query({
  args: {
    today: v.string(),
    search: v.optional(v.string()),
    riskLevel: v.optional(riskValidator),
    attention: v.optional(caseloadAttentionValidator),
    status: v.optional(patientStatusValidator),
    sortBy: v.optional(caseloadSortKeyValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(caseloadPatientRowValidator),
  handler: async (ctx, args) => {
    const { orgId } = await requireClinicianOrg(ctx)
    const sortBy = args.sortBy ?? 'displayId'
    const windowStart = addDaysToIsoDate(args.today, -6)

    const page: Array<Omit<Awaited<ReturnType<typeof buildCaseloadRow>>, '_sortRisk' | '_sortSymptom' | '_sortCheckInRate' | '_now'>> = []
    let cursor = args.paginationOpts.cursor || null
    let isDone = false
    const targetSize = args.paginationOpts.numItems

    while (page.length < targetSize && !isDone) {
      const batch = await ctx.db
        .query('patients')
        .withIndex('by_orgId_and_displayId', q => q.eq('orgId', orgId))
        .order('asc')
        .paginate({ numItems: Math.max(targetSize * 2, 10), cursor })

      for (const patient of batch.page) {
        if (args.status && patient.status !== args.status) {
          continue
        }

        const row = await buildCaseloadRow(ctx, patient, args.today, windowStart)

        if (args.riskLevel && row.riskLevel !== args.riskLevel) {
          continue
        }
        if (args.attention && row.attention !== args.attention) {
          continue
        }
        if (!matchesSearch(row, args.search ?? '')) {
          continue
        }

        const { _sortRisk, _sortSymptom, _sortCheckInRate, _now, ...publicRow } = row
        page.push(publicRow)

        if (page.length >= targetSize) {
          break
        }
      }

      cursor = batch.continueCursor
      isDone = batch.isDone
      if (batch.page.length === 0) {
        isDone = true
      }
    }

    page.sort((a, b) =>
      compareRows(
        { ...a, _sortRisk: a.riskLevel ?? 'Stable', _sortSymptom: a.symptomTotal ?? -1, _sortCheckInRate: a.checkInRate ?? -1, sortKey: a.sortKey, _now: 0 },
        { ...b, _sortRisk: b.riskLevel ?? 'Stable', _sortSymptom: b.symptomTotal ?? -1, _sortCheckInRate: b.checkInRate ?? -1, sortKey: b.sortKey, _now: 0 },
        sortBy
      )
    )

    return {
      page,
      continueCursor: isDone ? '' : (cursor ?? ''),
      isDone,
    }
  },
})

/**
 * Aggregate caseload metrics for the clinician dashboard command center.
 */
export const getSummary = query({
  args: { today: v.string() },
  returns: caseloadSummaryValidator,
  handler: async (ctx, args) => {
    const { orgId } = await requireClinicianOrg(ctx)
    const now = Date.now()
    const monthStart = now - 30 * 24 * 60 * 60 * 1000
    const windowStart = addDaysToIsoDate(args.today, -6)

    const patients = await ctx.db
      .query('patients')
      .withIndex('by_orgId', q => q.eq('orgId', orgId))
      .collect()

    const activePatients = patients.filter(p => p.status === 'Active')
    const newPatientsThisMonth = activePatients.filter(p => p.createdAt >= monthStart).length

    let needsReviewCount = 0
    let symptomTotalSum = 0
    let symptomTotalCount = 0
    let checkInRateSum = 0
    let checkInRateCount = 0

    for (const patient of activePatients) {
      const row = await buildCaseloadRow(ctx, patient, args.today, windowStart)
      if (row.attention === 'Review' || row.attention === 'Safety') {
        needsReviewCount += 1
      }
      if (row.symptomTotal !== null) {
        symptomTotalSum += row.symptomTotal
        symptomTotalCount += 1
      }
      if (row.checkInRate !== null) {
        checkInRateSum += row.checkInRate
        checkInRateCount += 1
      }
    }

    const activeAlerts = await ctx.db
      .query('alerts')
      .withIndex('by_orgId_and_status', q => q.eq('orgId', orgId).eq('status', 'active'))
      .collect()

    const highPriorityAlertCount = activeAlerts.filter(a => a.severity === 'High').length

    return {
      activePatientCount: activePatients.length,
      newPatientsThisMonth,
      needsReviewCount,
      highPriorityAlertCount,
      checkInRatePercent:
        checkInRateCount > 0
          ? Math.round((checkInRateSum / checkInRateCount) * 10) / 10
          : null,
      averageSymptomTotal:
        symptomTotalCount > 0
          ? Math.round((symptomTotalSum / symptomTotalCount) * 10) / 10
          : null,
      dataAsOfMs: now,
    }
  },
})

/**
 * Returns the authenticated clinician's organization id for client bootstrapping.
 */
export const getMyOrgId = query({
  args: {},
  returns: v.union(v.id('organizations'), v.null()),
  handler: async ctx => {
    const context = await requireClinicianOrg(ctx)
    return context.orgId
  },
})
