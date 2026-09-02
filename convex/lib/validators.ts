import { v } from 'convex/values'

// --- Enums & Value Validators ---

export const roleValidator = v.union(
  v.literal('patient'),
  v.literal('caregiver'),
  v.literal('clinician'),
  v.literal('admin')
)

export const riskValidator = v.union(
  v.literal('Stable'),
  v.literal('Review'),
  v.literal('Elevated')
)

export const alertSeverityValidator = v.union(
  v.literal('High'),
  v.literal('Medium'),
  v.literal('Low')
)

export const alertStatusValidator = v.union(
  v.literal('active'),
  v.literal('acknowledged'),
  v.literal('resolved')
)

export const userStatusValidator = v.union(
  v.literal('Active'),
  v.literal('Invited'),
  v.literal('Suspended')
)

export const clinicalRoleValidator = v.union(
  v.literal('lead'),
  v.literal('attending'),
  v.literal('staff'),
  v.literal('consultant')
)

export const patientStatusValidator = v.union(
  v.literal('Active'),
  v.literal('Discharged'),
  v.literal('Inactive')
)

export const episodeStatusValidator = v.union(
  v.literal('active'),
  v.literal('graduated'),
  v.literal('dormant')
)

export const consentScopeValidator = v.union(
  v.literal('view_symptoms'),
  v.literal('view_trends'),
  v.literal('view_plan'),
  v.literal('log_proxy'),
  v.literal('receive_alerts')
)

export const consentStatusValidator = v.union(
  v.literal('active'),
  v.literal('revoked'),
  v.literal('expired')
)

export const granteeRoleValidator = v.union(
  v.literal('caregiver'),
  v.literal('clinician'),
  v.literal('family')
)

export const activityImpactValidator = v.union(
  v.literal('yes'),
  v.literal('no'),
  v.literal('not-sure'),
  v.literal('none')
)

export const exposureDomainValidator = v.union(
  v.literal('physical'),
  v.literal('cognitive'),
  v.literal('work_school'),
  v.literal('screen'),
  v.literal('sleep')
)

export const symptomsWorsenedValidator = v.union(
  v.literal('yes'),
  v.literal('no'),
  v.literal('not_sure'),
  v.literal('not_applicable')
)

export const exposureEntryInputValidator = v.object({
  domain: exposureDomainValidator,
  activityType: v.string(),
  durationMinutes: v.optional(v.number()),
  intensity: v.optional(v.number()),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  symptomsWorsened: symptomsWorsenedValidator,
  symptomOnsetMinutes: v.optional(v.number()),
  symptomMagnitude: v.optional(v.number()),
  symptomRecoveryMinutes: v.optional(v.number()),
  sleepHours: v.optional(v.number()),
  sleepQuality: v.optional(v.number()),
  contextNote: v.optional(v.string()),
})

export const encounterTypeValidator = v.union(
  v.literal('in-person'),
  v.literal('telehealth'),
  v.literal('asynchronous')
)

export const carePlanCategoryValidator = v.union(
  v.literal('cognitive_pacing'),
  v.literal('physical_activity'),
  v.literal('sleep_hygiene'),
  v.literal('medication'),
  v.literal('check_in'),
  v.literal('appointment'),
  v.literal('education'),
  v.literal('accommodations')
)

export const auditActionValidator = v.union(
  v.literal('read'),
  v.literal('create'),
  v.literal('update'),
  v.literal('delete'),
  v.literal('consent_grant'),
  v.literal('consent_revoke'),
  v.literal('auth_failure'),
  v.literal('safety_notification'),
  v.literal('safety_acknowledgement')
)

export const symptomsObjectValidator = v.object({
  headache: v.number(),
  dizziness: v.number(),
  nausea: v.number(),
  lightSensitivity: v.number(),
  noiseSensitivity: v.number(),
  fatigue: v.number(),
  concentration: v.number(),
  sleepDifficulty: v.number(),
})

export const methodologyVersionValidator = v.string()

export const trendDirectionValidator = v.union(
  v.literal('decreasing'),
  v.literal('increasing'),
  v.literal('stable'),
  v.literal('mixed')
)

export const trendReadinessValidator = v.union(
  v.literal('insufficient'),
  v.literal('sufficient')
)

export const trendSummaryValidator = v.object({
  methodologyVersion: methodologyVersionValidator,
  readiness: trendReadinessValidator,
  direction: v.union(trendDirectionValidator, v.null()),
  windowDays: v.number(),
  dataPointsInWindow: v.number(),
  totalDataPoints: v.number(),
  hasConsecutiveStreak: v.boolean(),
  longestConsecutiveStreak: v.number(),
  earliestDate: v.union(v.string(), v.null()),
  latestDate: v.union(v.string(), v.null()),
  earliestTotal: v.union(v.number(), v.null()),
  latestTotal: v.union(v.number(), v.null()),
  delta: v.union(v.number(), v.null()),
  summaryText: v.string(),
  disclaimerText: v.string(),
  insufficientReason: v.union(v.string(), v.null()),
})

export const trackingRelationshipValidator = v.union(
  v.literal('patient'),
  v.literal('caregiver'),
  v.literal('professional')
)

export const diagnosisStatusValidator = v.union(
  v.literal('yes'),
  v.literal('no'),
  v.literal('unsure')
)

export const ageBandValidator = v.union(
  v.literal('13-17'),
  v.literal('18-24'),
  v.literal('25-39'),
  v.literal('40-54'),
  v.literal('55-plus')
)

export const communicationPreferencesValidator = v.object({
  emailReminders: v.boolean(),
  smsReminders: v.boolean(),
  weeklySummary: v.boolean(),
})

export const onboardingDraftPayloadValidator = v.object({
  step: v.number(),
  trackingRelationship: v.optional(trackingRelationshipValidator),
  preferredName: v.optional(v.string()),
  ageBand: v.optional(ageBandValidator),
  incidentDate: v.optional(v.string()),
  timeZone: v.optional(v.string()),
  diagnosisStatus: v.optional(diagnosisStatusValidator),
  communicationPreferences: v.optional(communicationPreferencesValidator),
  consentAcknowledged: v.optional(v.boolean()),
  privacyAcknowledged: v.optional(v.boolean()),
  limitationsAcknowledged: v.optional(v.boolean()),
})

export const onboardingStatusValidator = v.object({
  completed: v.boolean(),
  hasDraft: v.boolean(),
  nextRoute: v.optional(v.string()),
})

export const partialSymptomsValidator = v.object({
  headache: v.optional(v.number()),
  dizziness: v.optional(v.number()),
  nausea: v.optional(v.number()),
  lightSensitivity: v.optional(v.number()),
  noiseSensitivity: v.optional(v.number()),
  fatigue: v.optional(v.number()),
  concentration: v.optional(v.number()),
  sleepDifficulty: v.optional(v.number()),
})

export const skippedFieldValidator = v.object({
  fieldId: v.string(),
  reason: v.string(),
})

export const baselineAssessmentDraftPayloadValidator = v.object({
  step: v.number(),
  startedAt: v.optional(v.number()),
  incidentDate: v.optional(v.string()),
  incidentContext: v.optional(v.string()),
  careReceived: v.optional(v.string()),
  diagnosisStatus: v.optional(diagnosisStatusValidator),
  symptoms: v.optional(partialSymptomsValidator),
  sleepHours: v.optional(v.number()),
  schoolWorkDemand: v.optional(v.number()),
  physicalActivityLevel: v.optional(v.number()),
  cognitiveActivityLevel: v.optional(v.number()),
  screenTolerance: v.optional(v.number()),
  skippedFields: v.optional(v.array(skippedFieldValidator)),
  dangerSigns: v.optional(v.array(v.string())),
})

export const baselineStatusValidator = v.object({
  completed: v.boolean(),
  hasDraft: v.boolean(),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  currentBaselineVersion: v.optional(v.number()),
  nextRoute: v.optional(v.string()),
})

export const recoveryBaselineDocValidator = v.object({
  _id: v.id('recoveryBaselines'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.id('recoveryEpisodes'),
  orgId: v.id('organizations'),
  version: v.number(),
  isCurrent: v.boolean(),
  supersededAt: v.optional(v.number()),
  incidentDate: v.string(),
  incidentContext: v.string(),
  careReceived: v.optional(v.string()),
  diagnosisStatus: diagnosisStatusValidator,
  symptoms: symptomsObjectValidator,
  symptomTotal: v.number(),
  methodologyVersion: v.optional(methodologyVersionValidator),
  sleepHours: v.optional(v.number()),
  schoolWorkDemand: v.optional(v.number()),
  physicalActivityLevel: v.optional(v.number()),
  cognitiveActivityLevel: v.optional(v.number()),
  screenTolerance: v.optional(v.number()),
  skippedFields: v.array(skippedFieldValidator),
  dangerSignsPresent: v.boolean(),
  dangerSigns: v.array(v.string()),
  completionDurationMs: v.number(),
  submittedByUserId: v.id('users'),
  createdAt: v.number(),
})

// --- Document Validators ---

export const orgDocValidator = v.object({
  _id: v.id('organizations'),
  _creationTime: v.number(),
  clerkId: v.optional(v.string()),
  name: v.string(),
  slug: v.string(),
  retentionPolicyDays: v.number(),
  autoEscalateAlerts: v.boolean(),
  primaryContactEmail: v.string(),
  cohortCapacity: v.optional(v.number()),
  accentColor: v.optional(v.string()),
  activePathways: v.optional(v.array(v.string())),
  clerkUpdatedAt: v.optional(v.number()),
  createdAt: v.number(),
})

export const userDocValidator = v.object({
  _id: v.id('users'),
  _creationTime: v.number(),
  tokenIdentifier: v.string(),
  clerkId: v.optional(v.string()),
  name: v.string(),
  email: v.string(),
  role: roleValidator,
  status: userStatusValidator,
  phone: v.optional(v.string()),
  lastActive: v.optional(v.string()),
  clerkUpdatedAt: v.optional(v.number()),
  createdAt: v.number(),
})

export const syncUserResultValidator = v.object({
  user: userDocValidator,
  isNew: v.boolean(),
  role: roleValidator,
  status: userStatusValidator,
  authorizedHome: v.string(),
})

export const membershipDocValidator = v.object({
  _id: v.id('clinicianMemberships'),
  _creationTime: v.number(),
  userId: v.id('users'),
  orgId: v.id('organizations'),
  clinicalRole: clinicalRoleValidator,
  specialty: v.optional(v.string()),
  status: v.union(v.literal('active'), v.literal('inactive')),
  joinedAt: v.number(),
})

export const patientDocValidator = v.object({
  _id: v.id('patients'),
  _creationTime: v.number(),
  userId: v.id('users'),
  orgId: v.id('organizations'),
  primaryClinicianId: v.optional(v.id('users')),
  displayId: v.string(),
  dateOfBirth: v.optional(v.string()),
  preferredName: v.optional(v.string()),
  ageBand: v.optional(ageBandValidator),
  timeZone: v.optional(v.string()),
  trackingRelationship: v.optional(trackingRelationshipValidator),
  diagnosisStatus: v.optional(diagnosisStatusValidator),
  communicationPreferences: v.optional(communicationPreferencesValidator),
  onboardingCompletedAt: v.optional(v.number()),
  baselineCompletedAt: v.optional(v.number()),
  status: patientStatusValidator,
  notes: v.optional(v.string()),
  createdAt: v.number(),
})

export const episodeDocValidator = v.object({
  _id: v.id('recoveryEpisodes'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  orgId: v.id('organizations'),
  incidentDate: v.string(),
  injuryContext: v.string(),
  status: episodeStatusValidator,
  riskLevel: riskValidator,
  baselineSymptomTotal: v.optional(v.number()),
  adherenceRate: v.optional(v.number()),
  startDate: v.string(),
  closedAt: v.optional(v.number()),
  createdAt: v.number(),
})

export const consentGrantDocValidator = v.object({
  _id: v.id('consentGrants'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  granteeUserId: v.id('users'),
  granteeRole: granteeRoleValidator,
  scopes: v.array(consentScopeValidator),
  relationship: v.optional(v.string()),
  status: consentStatusValidator,
  grantedAt: v.number(),
  expiresAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
  revokedByUserId: v.optional(v.id('users')),
})

export const checkInDocValidator = v.object({
  _id: v.id('checkIns'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  submittedByUserId: v.id('users'),
  date: v.string(),
  symptoms: symptomsObjectValidator,
  symptomTotal: v.number(),
  methodologyVersion: v.optional(methodologyVersionValidator),
  activityImpact: activityImpactValidator,
  dangerSignsPresent: v.boolean(),
  dangerSigns: v.array(v.string()),
  note: v.optional(v.string()),
  createdAt: v.number(),
})

export const activityExposureDocValidator = v.object({
  _id: v.id('activityExposures'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  checkInId: v.optional(v.id('checkIns')),
  date: v.string(),
  cognitiveMinutes: v.number(),
  screenMinutes: v.number(),
  physicalExertionScore: v.number(),
  sleepHours: v.number(),
  sleepQuality: v.number(),
  createdAt: v.number(),
})

export const exposureEntryDocValidator = v.object({
  _id: v.id('exposureEntries'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  checkInId: v.optional(v.id('checkIns')),
  date: v.string(),
  domain: exposureDomainValidator,
  activityType: v.string(),
  durationMinutes: v.optional(v.number()),
  intensity: v.optional(v.number()),
  startTime: v.optional(v.string()),
  endTime: v.optional(v.string()),
  symptomsWorsened: symptomsWorsenedValidator,
  symptomOnsetMinutes: v.optional(v.number()),
  symptomMagnitude: v.optional(v.number()),
  symptomRecoveryMinutes: v.optional(v.number()),
  sleepHours: v.optional(v.number()),
  sleepQuality: v.optional(v.number()),
  contextNote: v.optional(v.string()),
  submittedByUserId: v.id('users'),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})

export const exposureValidationWarningValidator = v.object({
  code: v.union(
    v.literal('duration_mismatch'),
    v.literal('overlapping_time'),
    v.literal('impossible_duration')
  ),
  message: v.string(),
})

export const exposureLogResultValidator = v.object({
  entryId: v.id('exposureEntries'),
  warnings: v.array(exposureValidationWarningValidator),
})

export const recoveryTrendDocValidator = v.object({
  _id: v.id('recoveryTrends'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  date: v.string(),
  dayLabel: v.string(),
  symptomTotal: v.number(),
  methodologyVersion: v.optional(methodologyVersionValidator),
  headacheRating: v.number(),
  sleepQuality: v.number(),
  createdAt: v.number(),
})

export const encounterDocValidator = v.object({
  _id: v.id('clinicalEncounters'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  orgId: v.id('organizations'),
  clinicianUserId: v.id('users'),
  encounterType: encounterTypeValidator,
  diagnosis: v.string(),
  datetime: v.string(),
  clinicalSummary: v.string(),
  notes: v.string(),
  attachmentStorageId: v.optional(v.id('_storage')),
  createdAt: v.number(),
})

export const carePlanDocValidator = v.object({
  _id: v.id('carePlans'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  assignedByUserId: v.optional(v.id('users')),
  title: v.string(),
  category: carePlanCategoryValidator,
  targetTime: v.optional(v.string()),
  completed: v.boolean(),
  completedAt: v.optional(v.number()),
  completedByUserId: v.optional(v.id('users')),
  dayNumber: v.optional(v.number()),
  createdAt: v.number(),
})

export const alertDocValidator = v.object({
  _id: v.id('alerts'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  orgId: v.id('organizations'),
  detail: v.string(),
  severity: alertSeverityValidator,
  status: alertStatusValidator,
  dangerSigns: v.optional(v.array(v.string())),
  acknowledgedByUserId: v.optional(v.id('users')),
  resolvedByUserId: v.optional(v.id('users')),
  createdAt: v.number(),
})

export const messageDocValidator = v.object({
  _id: v.id('messages'),
  _creationTime: v.number(),
  threadId: v.string(),
  senderUserId: v.id('users'),
  recipientUserId: v.optional(v.id('users')),
  patientId: v.optional(v.id('patients')),
  orgId: v.optional(v.id('organizations')),
  content: v.string(),
  createdAt: v.number(),
  read: v.boolean(),
})

export const auditLogDocValidator = v.object({
  _id: v.id('auditLogs'),
  _creationTime: v.number(),
  actorUserId: v.id('users'),
  actorRole: v.string(),
  orgId: v.optional(v.id('organizations')),
  patientId: v.optional(v.id('patients')),
  event: v.string(),
  targetResource: v.string(),
  resourceId: v.optional(v.string()),
  action: auditActionValidator,
  ipAddress: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  createdAt: v.number(),
})

// --- Safety Engine Validators ---

export const safetyContextTypeValidator = v.union(
  v.literal('check_in'),
  v.literal('onboarding'),
  v.literal('baseline'),
  v.literal('free_text'),
  v.literal('ai_query'),
  v.literal('longitudinal')
)

export const safetyStatusValidator = v.union(
  v.literal('safe'),
  v.literal('warning'),
  v.literal('review'),
  v.literal('elevated'),
  v.literal('emergency')
)

export const safetySeverityValidator = v.union(
  v.literal('emergency'),
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
  v.literal('info'),
  v.literal('none')
)

export const followUpStateValidator = v.union(
  v.literal('pending_acknowledgement'),
  v.literal('acknowledged'),
  v.literal('notification_sent'),
  v.literal('notification_skipped')
)

export const notificationOutcomeValidator = v.union(
  v.literal('sent'),
  v.literal('skipped_no_consent'),
  v.literal('skipped_not_escalated')
)

export const safetyEvaluationDocValidator = v.object({
  _id: v.id('safetyEvaluations'),
  _creationTime: v.number(),
  patientId: v.optional(v.id('patients')),
  orgId: v.optional(v.id('organizations')),
  evaluatedByUserId: v.optional(v.id('users')),
  contextType: safetyContextTypeValidator,
  status: safetyStatusValidator,
  highestSeverity: safetySeverityValidator,
  ruleEngineVersion: v.string(),
  matchedRuleCodes: v.array(v.string()),
  matchedRuleIds: v.optional(v.array(v.string())),
  matchedEvidenceSummary: v.array(v.string()),
  primaryEscalation: v.string(),
  blockedActions: v.array(v.string()),
  failSafeApplied: v.boolean(),
  targetResourceId: v.optional(v.string()),
  followUpState: v.optional(followUpStateValidator),
  acknowledgedAt: v.optional(v.number()),
  acknowledgedByUserId: v.optional(v.id('users')),
  notificationAttemptedAt: v.optional(v.number()),
  notificationOutcome: v.optional(notificationOutcomeValidator),
  createdAt: v.number(),
})

export const evidenceSourceValidator = v.object({
  authority: v.string(),
  citation: v.string(),
  guidelineSection: v.string(),
  approvedBy: v.string(),
  reviewDate: v.string(),
})

export const userGuidanceValidator = v.object({
  guidanceCode: v.string(),
  guidanceKey: v.string(),
  defaultSafeText: v.string(),
})

export const matchedRuleDetailValidator = v.object({
  ruleId: v.string(),
  version: v.string(),
  name: v.string(),
  category: v.string(),
  severity: v.string(),
  requiredInputs: v.optional(v.array(v.string())),
  outputCode: v.string(),
  evidenceSource: evidenceSourceValidator,
  escalationPath: v.string(),
  userGuidance: userGuidanceValidator,
  matchedEvidenceSummary: v.string(),
})

export const safetyEvaluationResultValidator = v.object({
  evaluationId: v.string(),
  status: safetyStatusValidator,
  isSafe: v.boolean(),
  highestSeverity: safetySeverityValidator,
  primaryEscalation: v.string(),
  matchedRules: v.array(matchedRuleDetailValidator),
  blockedActions: v.array(v.string()),
  failSafeApplied: v.boolean(),
  ruleEngineVersion: v.string(),
  evaluatedAt: v.number(),
})

export const baselineSubmitResultValidator = v.object({
  baselineId: v.optional(v.id('recoveryBaselines')),
  blocked: v.boolean(),
  safetyResult: safetyEvaluationResultValidator,
  nextRoute: v.string(),
})

export const checkInSubmitResultValidator = v.object({
  checkInId: v.id('checkIns'),
  blocked: v.boolean(),
  safetyEvaluationId: v.id('safetyEvaluations'),
  safetyResult: safetyEvaluationResultValidator,
})

export const checkInAmendmentDocValidator = v.object({
  _id: v.id('checkInAmendments'),
  _creationTime: v.number(),
  checkInId: v.id('checkIns'),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  amendedByUserId: v.id('users'),
  reason: v.string(),
  symptoms: symptomsObjectValidator,
  symptomTotal: v.number(),
  methodologyVersion: v.optional(methodologyVersionValidator),
  activityImpact: activityImpactValidator,
  dangerSignsPresent: v.boolean(),
  dangerSigns: v.array(v.string()),
  note: v.optional(v.string()),
  originalSymptoms: symptomsObjectValidator,
  originalSymptomTotal: v.number(),
  originalActivityImpact: activityImpactValidator,
  originalDangerSignsPresent: v.boolean(),
  originalDangerSigns: v.array(v.string()),
  originalNote: v.optional(v.string()),
  safetyEvaluationId: v.optional(v.id('safetyEvaluations')),
  createdAt: v.number(),
})

export const checkInCompletenessValidator = v.union(
  v.literal('complete'),
  v.literal('partial')
)

export const checkInHistoryRecordedEntryValidator = v.object({
  kind: v.literal('recorded'),
  date: v.string(),
  checkInId: v.id('checkIns'),
  submittedAt: v.number(),
  submittedByUserId: v.id('users'),
  reporterRole: roleValidator,
  reporterName: v.string(),
  completeness: checkInCompletenessValidator,
  safetyStatus: safetyStatusValidator,
  symptomTotal: v.number(),
  methodologyVersion: v.optional(methodologyVersionValidator),
  dangerSignsPresent: v.boolean(),
  activityImpact: activityImpactValidator,
  hasAmendment: v.boolean(),
  amendmentCount: v.number(),
  canAmend: v.boolean(),
  originalSymptomTotal: v.optional(v.number()),
  amendmentReason: v.optional(v.string()),
  showNotes: v.boolean(),
  note: v.optional(v.string()),
})

export const checkInHistoryMissedEntryValidator = v.object({
  kind: v.literal('missed'),
  date: v.string(),
})

export const checkInHistoryEntryValidator = v.union(
  checkInHistoryRecordedEntryValidator,
  checkInHistoryMissedEntryValidator
)

export const checkInAmendResultValidator = v.object({
  amendmentId: v.id('checkInAmendments'),
  safetyEvaluationId: v.id('safetyEvaluations'),
  safetyResult: safetyEvaluationResultValidator,
})

export const safetyRuleInfoValidator = v.object({
  ruleId: v.string(),
  version: v.string(),
  name: v.string(),
  category: v.string(),
  severity: v.string(),
  requiredInputs: v.array(v.string()),
  outputCode: v.string(),
  evidenceSource: evidenceSourceValidator,
  escalationPath: v.string(),
  userGuidance: userGuidanceValidator,
})


