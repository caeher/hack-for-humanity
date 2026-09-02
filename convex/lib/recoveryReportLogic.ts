import type { Doc, Id } from '../_generated/dataModel'
import type { ConsentScope } from './auth'
import { redactCarePlanForCaregiver } from './caregiverAccess'
import { buildAdherenceSummary } from './carePlanLogic'
import { compareIsoDates, addDaysToIsoDate } from './checkInHistoryLogic'
import {
  detectLongitudinalPatterns,
  NON_CAUSAL_DISCLAIMER,
  PATTERN_DETECTION_VERSION,
} from './patternDetection'
import { PROVENANCE_SCHEMA_VERSION } from './provenance'
import {
  buildTimelineDayPoints,
  buildTimelineEventMarkers,
  buildTimelineSummary,
  resolveTimelineWindow,
  type TimelineRangeKey,
} from './recoveryTimelineLogic'
import { RULE_REGISTRY_VERSION } from './safetyRules'
import {
  computeDescriptiveTrend,
  computeSymptomTotalComputation,
  METHODOLOGY_COPY,
  SYMPTOM_DIMENSIONS,
  SYMPTOM_METHODOLOGY_VERSION,
  type CheckInDataPoint,
} from './symptomMethodology'

export const RECOVERY_REPORT_SCHEMA_VERSION = '1.0.0' as const

export const REPORT_DISCLAIMER =
  'CRI does not diagnose concussion, predict recovery, determine prognosis, or clear return to sport, school, or work. This report organizes patient-reported and authorized clinical records for discussion with a qualified professional.'

export type ReportSectionKey =
  | 'episode'
  | 'symptoms'
  | 'trends'
  | 'exposure'
  | 'events'
  | 'plan_adherence'
  | 'patterns'
  | 'safety'
  | 'encounters'
  | 'discussion_questions'

export type ReportAccessRole = 'patient' | 'caregiver' | 'clinician' | 'admin'

export interface ReportAccessContext {
  role: ReportAccessRole
  scopes: ConsentScope[]
  canViewClinicalRecords: boolean
}

export interface ReportSectionOmission {
  section: ReportSectionKey
  reason: string
  requiredScope?: ConsentScope
}

export interface BuildRecoveryReportArgs {
  patient: Doc<'patients'>
  patientUser: Doc<'users'> | null
  episode: Doc<'recoveryEpisodes'> | null
  checkIns: Doc<'checkIns'>[]
  exposures: Doc<'activityExposures'>[]
  encounters: Doc<'clinicalEncounters'>[]
  carePlans: Doc<'carePlans'>[]
  amendments: Doc<'checkInAmendments'>[]
  safetyEvaluations: Doc<'safetyEvaluations'>[]
  access: ReportAccessContext
  range: TimelineRangeKey
  today: string
  timeZone: string
  dataCutoffAt: number
  generatedAt: number
  requestedByUserId: Id<'users'>
  requestedByRole: string
  requestedByName: string
  dataSource: 'live' | 'simulated'
}

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  episode: 'Recovery episode',
  symptoms: 'Daily symptom check-ins',
  trends: 'Symptom trend summary',
  exposure: 'Sleep & activity context',
  events: 'Recovery timeline events',
  plan_adherence: 'Care plan adherence',
  patterns: 'Observed associations',
  safety: 'Safety outcomes',
  encounters: 'Clinical encounters',
  discussion_questions: 'Questions for your care team',
}

function hasScope(scopes: ConsentScope[], required: ConsentScope): boolean {
  return scopes.includes(required)
}

export function resolveReportAccess(
  userRole: ReportAccessRole,
  grantScopes: ConsentScope[] | null
): ReportAccessContext {
  if (userRole === 'patient' || userRole === 'clinician' || userRole === 'admin') {
    return {
      role: userRole,
      scopes: [
        'view_symptoms',
        'view_trends',
        'view_plan',
        'log_proxy',
        'receive_alerts',
        'view_messages',
        'send_messages',
      ],
      canViewClinicalRecords: true,
    }
  }

  return {
    role: 'caregiver',
    scopes: grantScopes ?? [],
    canViewClinicalRecords: false,
  }
}

export function resolveIncludedSections(access: ReportAccessContext): {
  included: ReportSectionKey[]
  omitted: ReportSectionOmission[]
} {
  const included: ReportSectionKey[] = []
  const omitted: ReportSectionOmission[] = []

  const maybeInclude = (
    section: ReportSectionKey,
    allowed: boolean,
    reason: string,
    requiredScope?: ConsentScope
  ) => {
    if (allowed) {
      included.push(section)
    } else {
      omitted.push({ section, reason, requiredScope })
    }
  }

  maybeInclude(
    'episode',
    hasScope(access.scopes, 'view_trends'),
    'Episode context requires trend access.',
    'view_trends'
  )
  maybeInclude(
    'symptoms',
    hasScope(access.scopes, 'view_symptoms'),
    'Daily symptom ratings are not included in your access.',
    'view_symptoms'
  )
  maybeInclude(
    'trends',
    hasScope(access.scopes, 'view_trends'),
    'Trend summaries require trend access.',
    'view_trends'
  )
  maybeInclude(
    'exposure',
    hasScope(access.scopes, 'view_trends'),
    'Sleep and activity context requires trend access.',
    'view_trends'
  )
  maybeInclude(
    'events',
    hasScope(access.scopes, 'view_trends'),
    'Timeline events require trend access.',
    'view_trends'
  )
  maybeInclude(
    'plan_adherence',
    hasScope(access.scopes, 'view_plan'),
    'Care plan adherence is not shared with your account.',
    'view_plan'
  )
  maybeInclude(
    'patterns',
    hasScope(access.scopes, 'view_trends'),
    'Observed associations require trend access.',
    'view_trends'
  )
  maybeInclude(
    'safety',
    hasScope(access.scopes, 'receive_alerts'),
    'Safety outcome details are limited to authorized contacts.',
    'receive_alerts'
  )
  maybeInclude(
    'encounters',
    access.canViewClinicalRecords,
    'Clinical encounter summaries are never shared via caregiver access.'
  )

  if (included.length > 0) {
    included.push('discussion_questions')
  }

  return { included, omitted }
}

function filterByDateRange<T extends { date: string }>(items: T[], startDate: string, endDate: string): T[] {
  return items.filter(
    item => compareIsoDates(item.date, startDate) >= 0 && compareIsoDates(item.date, endDate) <= 0
  )
}

function filterEncountersInRange(
  encounters: Doc<'clinicalEncounters'>[],
  startDate: string,
  endDate: string
): Doc<'clinicalEncounters'>[] {
  return encounters.filter(encounter => {
    const encounterDate = encounter.datetime.slice(0, 10)
    return (
      compareIsoDates(encounterDate, startDate) >= 0 &&
      compareIsoDates(encounterDate, endDate) <= 0 &&
      encounter.status !== 'draft'
    )
  })
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function buildDiscussionQuestions(args: {
  included: ReportSectionKey[]
  gapDays: number
  trendDirection?: string | null
  patternCount: number
  safetyEventCount: number
  adherenceRate: number | null
}): string[] {
  const questions: string[] = []

  if (args.included.includes('symptoms') && args.gapDays > 0) {
    questions.push(
      `I missed ${args.gapDays} check-in day(s) in this period. Could inconsistent logging affect how we interpret my symptoms?`
    )
  }

  if (args.included.includes('trends') && args.trendDirection === 'increasing') {
    questions.push(
      'My patient-reported symptom total increased during this period. What factors should we review together?'
    )
  }

  if (args.included.includes('patterns') && args.patternCount > 0) {
    questions.push(
      'CRI noted temporal associations between symptoms and sleep/activity. How might we explore these patterns safely with my care team?'
    )
  }

  if (args.included.includes('safety') && args.safetyEventCount > 0) {
    questions.push(
      'There were safety escalations in this period. What follow-up steps does my care team recommend?'
    )
  }

  if (args.included.includes('plan_adherence') && args.adherenceRate !== null && args.adherenceRate < 0.6) {
    questions.push(
      'Several care plan items were missed or skipped. Should we adjust pacing or supports rather than push through symptoms?'
    )
  }

  questions.push(
    'Based on this summary, what should I monitor next — and when should I contact you before my next visit?'
  )

  return questions
}

function countInclusiveDays(startDate: string, endDate: string): number {
  let count = 0
  let current = startDate
  while (compareIsoDates(current, endDate) <= 0) {
    count++
    current = addDaysToIsoDate(current, 1)
  }
  return count
}

export function computeContentHash(payload: unknown): string {
  const serialized = JSON.stringify(payload)
  let hash = 5381
  for (let i = 0; i < serialized.length; i++) {
    hash = (hash * 33) ^ serialized.charCodeAt(i)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function buildRecoveryReportPayload(args: BuildRecoveryReportArgs) {
  const { startDate, endDate } = resolveTimelineWindow(args.range, args.today, args.episode)
  const { included, omitted } = resolveIncludedSections(args.access)

  const windowCheckIns = filterByDateRange(args.checkIns, startDate, endDate).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  const windowExposures = filterByDateRange(args.exposures, startDate, endDate)
  const windowEncounters = filterEncountersInRange(args.encounters, startDate, endDate)
  const windowCarePlans = args.carePlans.filter(plan => {
    if (!plan.scheduledDate) return true
    return (
      compareIsoDates(plan.scheduledDate, startDate) >= 0 &&
      compareIsoDates(plan.scheduledDate, endDate) <= 0
    )
  })

  const redactedCarePlans =
    args.access.role === 'caregiver'
      ? windowCarePlans.map(plan => redactCarePlanForCaregiver(plan, args.access.scopes))
      : windowCarePlans

  const timelineArgs = {
    range: args.range,
    symptomGroup: 'all' as const,
    comparisonView: 'symptoms_sleep' as const,
    today: args.today,
    timeZone: args.timeZone,
    episode: args.episode,
    checkIns: args.checkIns,
    exposures: args.exposures,
    encounters: args.encounters,
    carePlans: args.carePlans,
    amendments: args.amendments,
    safetyEvaluations: args.safetyEvaluations,
  }

  const timelinePoints = buildTimelineDayPoints(timelineArgs)
  const timelineEvents = buildTimelineEventMarkers(timelineArgs)
  const timelineSummary = buildTimelineSummary(timelinePoints, 'all', 'symptoms_sleep')

  const trendPoints: CheckInDataPoint[] = windowCheckIns.map(checkIn => ({
    date: checkIn.date,
    symptomTotal: checkIn.symptomTotal,
  }))
  const trendSummary = computeDescriptiveTrend(trendPoints, Math.min(trendPoints.length || 7, 14))

  const patternResults = detectLongitudinalPatterns({
    checkIns: windowCheckIns.map(checkIn => ({
      date: checkIn.date,
      symptomTotal: checkIn.symptomTotal,
      symptoms: {
        headache: checkIn.symptoms.headache,
        dizziness: checkIn.symptoms.dizziness,
        concentration: checkIn.symptoms.concentration,
      },
    })),
    exposures: windowExposures.map(exposure => ({
      date: exposure.date,
      sleepHours: exposure.sleepHours,
      screenMinutes: exposure.screenMinutes,
      physicalExertionScore: exposure.physicalExertionScore,
      cognitiveMinutes: exposure.cognitiveMinutes,
    })),
    today: args.today,
  })

  const availablePatterns = patternResults.patterns.filter(pattern => pattern.status === 'available')

  const safetyEvents = args.safetyEvaluations.filter(evaluation => {
    const evalDate = new Date(evaluation.createdAt).toISOString().slice(0, 10)
    return (
      compareIsoDates(evalDate, startDate) >= 0 &&
      compareIsoDates(evalDate, endDate) <= 0 &&
      evaluation.status !== 'safe'
    )
  })

  const adherenceSummary = buildAdherenceSummary(redactedCarePlans)

  const expectedDays = timelinePoints.length
  const gapDays = Math.max(expectedDays - windowCheckIns.length, 0)

  const latestCheckIn = windowCheckIns[windowCheckIns.length - 1] ?? null
  const latestSymptomComputation = latestCheckIn
    ? computeSymptomTotalComputation(latestCheckIn.symptoms)
    : null

  const dimensionSummaries = SYMPTOM_DIMENSIONS.map(dimension => {
    const ratings = windowCheckIns.map(checkIn => checkIn.symptoms[dimension.id])
    return {
      dimensionId: dimension.id,
      label: dimension.label,
      latestRating: latestCheckIn ? latestCheckIn.symptoms[dimension.id] : null,
      averageRating: average(ratings),
      sourceKind: 'patient_report' as const,
    }
  })

  const exposureSummary = {
    loggedDays: windowExposures.length,
    averageSleepHours: average(windowExposures.map(item => item.sleepHours)),
    averageScreenMinutes: average(windowExposures.map(item => item.screenMinutes)),
    averagePhysicalExertion: average(windowExposures.map(item => item.physicalExertionScore)),
    sourceKind: 'patient_report' as const,
    missingDataNote:
      windowExposures.length === 0
        ? 'No sleep or activity exposure logs in this period.'
        : undefined,
  }

  const sourceRecordRefs: Array<{
    recordType: string
    recordId: string
    date?: string
  }> = []

  for (const checkIn of windowCheckIns) {
    sourceRecordRefs.push({ recordType: 'checkIns', recordId: checkIn._id, date: checkIn.date })
  }
  for (const exposure of windowExposures) {
    sourceRecordRefs.push({
      recordType: 'activityExposures',
      recordId: exposure._id,
      date: exposure.date,
    })
  }
  for (const encounter of windowEncounters) {
    sourceRecordRefs.push({
      recordType: 'clinicalEncounters',
      recordId: encounter._id,
      date: encounter.datetime.slice(0, 10),
    })
  }

  const adherenceRate =
    adherenceSummary.totalItems > 0
      ? adherenceSummary.completedCount / adherenceSummary.totalItems
      : null

  const payload = {
    schemaVersion: RECOVERY_REPORT_SCHEMA_VERSION,
    disclaimer: REPORT_DISCLAIMER,
    methodologyVersions: {
      symptom: SYMPTOM_METHODOLOGY_VERSION,
      pattern: PATTERN_DETECTION_VERSION,
      safety: RULE_REGISTRY_VERSION,
      provenanceSchema: PROVENANCE_SCHEMA_VERSION,
    },
    metadata: {
      generatedAt: args.generatedAt,
      dataCutoffAt: args.dataCutoffAt,
      requestedByUserId: args.requestedByUserId,
      requestedByRole: args.requestedByRole,
      requestedByName: args.requestedByName,
      rangeStart: startDate,
      rangeEnd: endDate,
      rangeKey: args.range,
      timeZone: args.timeZone,
      dataSource: args.dataSource,
      patientDisplayId: args.patient.displayId,
      patientPreferredName: args.patient.preferredName ?? args.patientUser?.name ?? 'Patient',
      episodeDayLabel: args.episode
        ? `Day ${countInclusiveDays(args.episode.incidentDate, args.today)}`
        : null,
    },
    sectionsIncluded: included.map(section => SECTION_LABELS[section]),
    sectionsOmitted: omitted.map(item => ({
      section: SECTION_LABELS[item.section],
      reason: item.reason,
      requiredScope: item.requiredScope,
    })),
    episode: included.includes('episode')
      ? {
          sourceKind: 'patient_report' as const,
          incidentDate: args.episode?.incidentDate ?? null,
          injuryContext: args.episode?.injuryContext ?? null,
          status: args.episode?.status ?? null,
          riskLevel: args.episode?.riskLevel ?? null,
          periodStart: startDate,
          periodEnd: endDate,
          missingEpisodeNote: args.episode ? undefined : 'No active recovery episode on file.',
        }
      : null,
    symptoms: included.includes('symptoms')
      ? {
          sourceKind: 'patient_report' as const,
          methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
          metricName: METHODOLOGY_COPY.metricName,
          metricRange: METHODOLOGY_COPY.metricRange,
          notRecoveryScore: METHODOLOGY_COPY.notRecoveryScore,
          checkInCount: windowCheckIns.length,
          expectedDays,
          gapDays,
          missingDataNote:
            gapDays > 0
              ? `${gapDays} day(s) without a complete check-in are shown as gaps, not zero values.`
              : undefined,
          latestSymptomTotal: latestCheckIn?.symptomTotal ?? null,
          latestSymptomComputation: latestSymptomComputation,
          dimensionSummaries,
          checkIns: windowCheckIns.map(checkIn => ({
            checkInId: checkIn._id,
            date: checkIn.date,
            symptomTotal: checkIn.symptomTotal,
            symptoms: checkIn.symptoms,
            activityImpact: checkIn.activityImpact,
            dangerSignsPresent: checkIn.dangerSignsPresent,
            methodologyVersion: checkIn.methodologyVersion ?? SYMPTOM_METHODOLOGY_VERSION,
          })),
        }
      : null,
    trends: included.includes('trends')
      ? {
          sourceKind: 'computed_trend' as const,
          ...trendSummary,
          dateRangeStart: startDate,
          dateRangeEnd: endDate,
        }
      : null,
    exposure: included.includes('exposure') ? exposureSummary : null,
    events: included.includes('events')
      ? {
          sourceKind: 'computed_trend' as const,
          summary: timelineSummary,
          markers: timelineEvents,
        }
      : null,
    planAdherence: included.includes('plan_adherence')
      ? {
          sourceKind: 'clinician_authored' as const,
          ...adherenceSummary,
          adherenceRate,
        }
      : null,
    patterns: included.includes('patterns')
      ? {
          sourceKind: 'computed_trend' as const,
          algorithmVersion: PATTERN_DETECTION_VERSION,
          disclaimer: NON_CAUSAL_DISCLAIMER,
          patterns: availablePatterns,
          insufficientNote:
            availablePatterns.length === 0
              ? 'Not enough paired observations to surface stable associations in this period.'
              : undefined,
        }
      : null,
    safety: included.includes('safety')
      ? {
          sourceKind: 'safety_outcome' as const,
          ruleEngineVersion: RULE_REGISTRY_VERSION,
          eventCount: safetyEvents.length,
          evaluations: safetyEvents.map(evaluation => ({
            evaluationId: evaluation._id,
            status: evaluation.status,
            highestSeverity: evaluation.highestSeverity,
            matchedRuleCodes: evaluation.matchedRuleCodes,
            createdAt: evaluation.createdAt,
          })),
          missingDataNote:
            safetyEvents.length === 0
              ? 'No safety escalations recorded in this period.'
              : undefined,
        }
      : null,
    encounters: included.includes('encounters')
      ? {
          sourceKind: 'clinician_authored' as const,
          count: windowEncounters.length,
          items: windowEncounters.map(encounter => ({
            encounterId: encounter._id,
            encounterType: encounter.encounterType,
            datetime: encounter.datetime,
            diagnosis: encounter.diagnosis,
            clinicalSummary: encounter.clinicalSummary,
            status: encounter.status ?? 'finalized',
          })),
          missingDataNote:
            windowEncounters.length === 0
              ? 'No finalized clinical encounters in this period.'
              : undefined,
        }
      : null,
    discussionQuestions: included.includes('discussion_questions')
      ? buildDiscussionQuestions({
          included,
          gapDays,
          trendDirection: trendSummary.direction,
          patternCount: availablePatterns.length,
          safetyEventCount: safetyEvents.length,
          adherenceRate,
        })
      : [],
  }

  return {
    payload,
    included,
    omitted,
    sourceRecordRefs,
    rangeStart: startDate,
    rangeEnd: endDate,
    contentHash: computeContentHash(payload),
  }
}

export function buildDemoReportPayload(today = '2026-09-02'): ReturnType<typeof buildRecoveryReportPayload> {
  const patientId = 'demo-patient' as Id<'patients'>
  const userId = 'demo-user' as Id<'users'>
  const orgId = 'demo-org' as Id<'organizations'>
  const episodeId = 'demo-episode' as Id<'recoveryEpisodes'>

  const episode: Doc<'recoveryEpisodes'> = {
    _id: episodeId,
    _creationTime: 0,
    patientId,
    orgId,
    incidentDate: '2026-08-19',
    startDate: '2026-08-19',
    injuryContext: 'Soccer collision during practice',
    status: 'active',
    riskLevel: 'Review',
    createdAt: 0,
  }

  const patient: Doc<'patients'> = {
    _id: patientId,
    _creationTime: 0,
    userId,
    orgId,
    displayId: 'P-1042',
    preferredName: 'Maya Chen',
    status: 'Active',
    createdAt: 0,
  }

  const checkIns: Doc<'checkIns'>[] = [
    '2026-08-19',
    '2026-08-20',
    '2026-08-21',
    '2026-08-22',
    '2026-08-23',
    '2026-08-24',
    '2026-08-26',
    '2026-08-27',
    '2026-08-28',
    '2026-08-29',
    '2026-08-30',
    '2026-08-31',
  ].map((date, index) => ({
    _id: `demo-ci-${index}` as Id<'checkIns'>,
    _creationTime: 0,
    patientId,
    episodeId,
    submittedByUserId: userId,
    date,
    symptoms: {
      headache: 3,
      dizziness: 2,
      nausea: 1,
      lightSensitivity: 2,
      noiseSensitivity: 2,
      fatigue: 3,
      concentration: 2,
      sleepDifficulty: 2,
    },
    symptomTotal: 27 - index,
    methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
    activityImpact: 'yes',
    dangerSignsPresent: false,
    dangerSigns: [],
    createdAt: 0,
  }))

  const exposures: Doc<'activityExposures'>[] = checkIns.map((checkIn, index) => ({
    _id: `demo-ex-${index}` as Id<'activityExposures'>,
    _creationTime: 0,
    patientId,
    episodeId,
    date: checkIn.date,
    cognitiveMinutes: 30,
    screenMinutes: 60 + index * 5,
    physicalExertionScore: 2 + index * 0.2,
    sleepHours: 6 + index * 0.1,
    sleepQuality: 6,
    createdAt: 0,
  }))

  const now = Date.parse(`${today}T12:00:00.000Z`)

  return buildRecoveryReportPayload({
    patient,
    patientUser: {
      _id: userId,
      _creationTime: 0,
      tokenIdentifier: 'demo',
      name: 'Maya Chen',
      email: 'demo@example.com',
      role: 'patient',
      status: 'Active',
      createdAt: 0,
    },
    episode,
    checkIns,
    exposures,
    encounters: [],
    carePlans: [],
    amendments: [],
    safetyEvaluations: [],
    access: resolveReportAccess('patient', null),
    range: '14',
    today,
    timeZone: 'UTC',
    dataCutoffAt: now,
    generatedAt: now,
    requestedByUserId: userId,
    requestedByRole: 'patient',
    requestedByName: 'Maya Chen',
    dataSource: 'simulated',
  })
}
