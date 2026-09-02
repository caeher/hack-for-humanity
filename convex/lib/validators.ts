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
  v.literal('resolved'),
  v.literal('snoozed')
)

export const alertSourceValidator = v.union(
  v.literal('safety_engine'),
  v.literal('missed_check_in'),
  v.literal('trend_rule')
)

export const userStatusValidator = v.union(
  v.literal('Active'),
  v.literal('Invited'),
  v.literal('Suspended')
)

export const orgFeatureFlagsValidator = v.object({
  aiInsights: v.boolean(),
  caregiverPortal: v.boolean(),
  secureMessaging: v.boolean(),
  patternDetection: v.boolean(),
})

export const orgMembershipStatusValidator = v.union(
  v.literal('active'),
  v.literal('inactive'),
  v.literal('invited')
)

export const invitationStatusValidator = v.union(
  v.literal('pending'),
  v.literal('accepted'),
  v.literal('revoked'),
  v.literal('expired')
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
  v.literal('receive_alerts'),
  v.literal('view_messages'),
  v.literal('send_messages')
)

export const consentStatusValidator = v.union(
  v.literal('pending'),
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

export const provenanceSourceKindValidator = v.union(
  v.literal('patient_report'),
  v.literal('symptom_total'),
  v.literal('computed_trend'),
  v.literal('pattern_insight'),
  v.literal('safety_outcome'),
  v.literal('clinician_content'),
  v.literal('ai_generated')
)

export const provenanceConfidenceStateValidator = v.union(
  v.literal('high'),
  v.literal('moderate'),
  v.literal('low'),
  v.literal('insufficient'),
  v.literal('not_applicable')
)

export const provenanceSourceRecordValidator = v.object({
  label: v.string(),
  recordType: v.string(),
  recordId: v.optional(v.string()),
  date: v.optional(v.string()),
  visible: v.boolean(),
})

export const provenanceEvidenceReferenceValidator = v.object({
  label: v.string(),
  citation: v.optional(v.string()),
  authority: v.optional(v.string()),
  ruleId: v.optional(v.string()),
  version: v.optional(v.string()),
})

export const provenanceContributingCategoryValidator = v.object({
  label: v.string(),
  rating: v.union(v.number(), v.null()),
  visible: v.boolean(),
})

export const provenanceMetadataValidator = v.object({
  schemaVersion: v.string(),
  sourceKind: provenanceSourceKindValidator,
  sourceKindLabel: v.string(),
  plainLanguageRationale: v.string(),
  technicalDetail: v.optional(v.string()),
  dateRangeStart: v.union(v.string(), v.null()),
  dateRangeEnd: v.union(v.string(), v.null()),
  methodName: v.string(),
  methodVersion: v.string(),
  confidence: provenanceConfidenceStateValidator,
  confidenceExplanation: v.string(),
  sourceRecords: v.array(provenanceSourceRecordValidator),
  evidenceReferences: v.array(provenanceEvidenceReferenceValidator),
  contributingCategories: v.optional(v.array(provenanceContributingCategoryValidator)),
  recomputedFromAmendment: v.optional(v.boolean()),
  amendmentNote: v.optional(v.string()),
  nonDiagnosticDisclaimer: v.string(),
  restrictedDetailCount: v.optional(v.number()),
})

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
  provenance: provenanceMetadataValidator,
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

export const accessibilityPreferencesValidator = v.object({
  largeText: v.boolean(),
  highContrast: v.boolean(),
  reducedMotion: v.boolean(),
})

export const quietHoursValidator = v.object({
  start: v.string(),
  end: v.string(),
})

export const carePlanCompletionStatusValidator = v.union(
  v.literal('pending'),
  v.literal('completed'),
  v.literal('skipped'),
  v.literal('unable_to_complete')
)

export const carePlanEventTypeValidator = v.union(
  v.literal('created'),
  v.literal('updated'),
  v.literal('completed'),
  v.literal('skipped'),
  v.literal('unable_to_complete'),
  v.literal('reopened')
)

export const reminderChannelValidator = v.union(v.literal('email'), v.literal('sms'))

export const reminderStatusValidator = v.union(
  v.literal('active'),
  v.literal('paused'),
  v.literal('revoked')
)

export const reminderCreatorRoleValidator = v.union(
  v.literal('patient'),
  v.literal('caregiver'),
  v.literal('clinician'),
  v.literal('admin')
)

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
  locale: v.optional(v.string()),
  featureFlags: v.optional(orgFeatureFlagsValidator),
  approvedPolicies: v.optional(v.array(v.string())),
  clerkUpdatedAt: v.optional(v.number()),
  createdAt: v.number(),
})

export const orgMembershipDocValidator = v.object({
  _id: v.id('organizationMemberships'),
  _creationTime: v.number(),
  userId: v.id('users'),
  orgId: v.id('organizations'),
  orgRole: roleValidator,
  status: orgMembershipStatusValidator,
  clerkMembershipId: v.optional(v.string()),
  joinedAt: v.number(),
})

export const orgInvitationDocValidator = v.object({
  _id: v.id('organizationInvitations'),
  _creationTime: v.number(),
  orgId: v.id('organizations'),
  email: v.string(),
  name: v.string(),
  role: roleValidator,
  clerkInvitationId: v.optional(v.string()),
  status: invitationStatusValidator,
  invitedByUserId: v.id('users'),
  expiresAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})

export const orgAggregateMetricsValidator = v.object({
  enrolledPatients: v.number(),
  newPatientsThisMonth: v.number(),
  checkInEngagementRate: v.number(),
  activeAlertsCount: v.number(),
  escalationRate: v.number(),
  riskDistribution: v.object({
    stable: v.number(),
    review: v.number(),
    elevated: v.number(),
  }),
  pathwayCounts: v.array(
    v.object({
      pathway: v.string(),
      count: v.number(),
    })
  ),
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

export const orgUserSummaryValidator = v.object({
  user: userDocValidator,
  membership: orgMembershipDocValidator,
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
  accessibilityPreferences: v.optional(accessibilityPreferencesValidator),
  quietHours: v.optional(quietHoursValidator),
  notificationConsentRevokedAt: v.optional(v.number()),
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
  invitedAt: v.optional(v.number()),
  acceptedAt: v.optional(v.number()),
  invitedByUserId: v.optional(v.id('users')),
  revokedAt: v.optional(v.number()),
  revokedByUserId: v.optional(v.id('users')),
})

export const restrictedSectionValidator = v.object({
  section: v.string(),
  reason: v.string(),
  requiredScope: v.optional(consentScopeValidator),
})

export const consentGrantWithGranteeValidator = v.object({
  grant: consentGrantDocValidator,
  granteeName: v.string(),
  granteeEmail: v.string(),
})

export const pendingInvitationValidator = v.object({
  grant: consentGrantDocValidator,
  patientDisplayId: v.string(),
  patientName: v.string(),
  inviterName: v.optional(v.string()),
})

export const accessNotificationDocValidator = v.object({
  _id: v.id('accessNotifications'),
  _creationTime: v.number(),
  recipientUserId: v.id('users'),
  patientId: v.optional(v.id('patients')),
  consentGrantId: v.optional(v.id('consentGrants')),
  type: v.union(
    v.literal('consent_invited'),
    v.literal('consent_accepted'),
    v.literal('consent_granted'),
    v.literal('consent_updated'),
    v.literal('consent_revoked')
  ),
  title: v.string(),
  message: v.string(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
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
  description: v.optional(v.string()),
  category: carePlanCategoryValidator,
  medicationInstruction: v.optional(v.string()),
  targetTime: v.optional(v.string()),
  scheduledDate: v.optional(v.string()),
  completionStatus: carePlanCompletionStatusValidator,
  statusNote: v.optional(v.string()),
  completed: v.boolean(),
  completedAt: v.optional(v.number()),
  completedByUserId: v.optional(v.id('users')),
  allowPatientCompletion: v.boolean(),
  isClinicianAuthored: v.boolean(),
  dayNumber: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
  updatedByUserId: v.optional(v.id('users')),
})

export const carePlanEventDocValidator = v.object({
  _id: v.id('carePlanEvents'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  carePlanId: v.optional(v.id('carePlans')),
  actorUserId: v.id('users'),
  actorRole: v.string(),
  eventType: carePlanEventTypeValidator,
  summary: v.string(),
  previousStatus: v.optional(v.string()),
  newStatus: v.optional(v.string()),
  createdAt: v.number(),
})

export const planReminderDocValidator = v.object({
  _id: v.id('planReminders'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  carePlanId: v.optional(v.id('carePlans')),
  title: v.string(),
  channel: reminderChannelValidator,
  scheduledTime: v.string(),
  timeZone: v.string(),
  status: reminderStatusValidator,
  createdByUserId: v.id('users'),
  createdByRole: reminderCreatorRoleValidator,
  revokedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})

export const carePlanAdherenceSummaryValidator = v.object({
  totalItems: v.number(),
  completedCount: v.number(),
  skippedCount: v.number(),
  unableCount: v.number(),
  pendingCount: v.number(),
  neutralSummary: v.string(),
})

export const profilePreferencesValidator = v.object({
  timeZone: v.optional(v.string()),
  communicationPreferences: communicationPreferencesValidator,
  accessibilityPreferences: accessibilityPreferencesValidator,
  quietHours: quietHoursValidator,
  notificationConsentRevokedAt: v.optional(v.number()),
  wearableSyncStatus: v.literal('planned_disabled'),
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
  alertSource: v.optional(alertSourceValidator),
  ruleCode: v.optional(v.string()),
  safetyEvaluationId: v.optional(v.id('safetyEvaluations')),
  provenance: v.optional(provenanceMetadataValidator),
  dangerSigns: v.optional(v.array(v.string())),
  assignedToUserId: v.optional(v.id('users')),
  snoozedUntil: v.optional(v.number()),
  snoozeReason: v.optional(v.string()),
  acknowledgedByUserId: v.optional(v.id('users')),
  acknowledgedAt: v.optional(v.number()),
  resolvedByUserId: v.optional(v.id('users')),
  resolvedAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
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
  clientMessageId: v.optional(v.string()),
  safetyStatus: v.optional(
    v.union(
      v.literal('safe'),
      v.literal('warning'),
      v.literal('review'),
      v.literal('elevated'),
      v.literal('emergency')
    )
  ),
  safetySeverity: v.optional(
    v.union(
      v.literal('emergency'),
      v.literal('high'),
      v.literal('medium'),
      v.literal('low'),
      v.literal('info'),
      v.literal('none')
    )
  ),
  createdAt: v.number(),
  read: v.boolean(),
})

export const messageThreadDocValidator = v.object({
  _id: v.id('messageThreads'),
  _creationTime: v.number(),
  externalThreadId: v.string(),
  patientId: v.id('patients'),
  episodeId: v.id('recoveryEpisodes'),
  orgId: v.id('organizations'),
  title: v.string(),
  status: v.union(v.literal('active'), v.literal('archived')),
  lastMessageAt: v.number(),
  lastMessagePreview: v.optional(v.string()),
  createdAt: v.number(),
})

export const messageThreadSummaryValidator = v.object({
  threadId: v.string(),
  title: v.string(),
  patientId: v.id('patients'),
  patientDisplayId: v.string(),
  lastMessageAt: v.number(),
  lastMessagePreview: v.optional(v.string()),
  unreadCount: v.number(),
  status: v.union(v.literal('active'), v.literal('archived')),
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

export const messageSafetyGuidanceValidator = v.object({
  status: safetyStatusValidator,
  highestSeverity: safetySeverityValidator,
  primaryEscalation: v.string(),
  userGuidance: v.string(),
  isEmergency: v.boolean(),
})

export const sendMessageResultValidator = v.object({
  messageId: v.id('messages'),
  clientMessageId: v.optional(v.string()),
  isDuplicate: v.boolean(),
  safetyGuidance: v.optional(messageSafetyGuidanceValidator),
})

export const messageWithSenderValidator = v.object({
  _id: v.id('messages'),
  _creationTime: v.number(),
  threadId: v.string(),
  senderUserId: v.id('users'),
  senderName: v.string(),
  senderRole: v.string(),
  content: v.string(),
  clientMessageId: v.optional(v.string()),
  safetyStatus: v.optional(
    v.union(
      v.literal('safe'),
      v.literal('warning'),
      v.literal('review'),
      v.literal('elevated'),
      v.literal('emergency')
    )
  ),
  createdAt: v.number(),
  isMine: v.boolean(),
})

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

export const dashboardChartPointValidator = v.object({
  date: v.string(),
  dayLabel: v.string(),
  symptomBurden: v.number(),
  headache: v.number(),
})

export const dashboardCheckInConsistencyValidator = v.object({
  recordedDays: v.number(),
  eligibleDays: v.number(),
  ratePercent: v.union(v.number(), v.null()),
  detail: v.string(),
})

export const dashboardInsightValidator = v.object({
  status: v.union(v.literal('available'), v.literal('insufficient')),
  title: v.string(),
  description: v.string(),
  footer: v.string(),
  generatedAt: v.union(v.string(), v.null()),
  sourceRecordCount: v.number(),
  provenance: provenanceMetadataValidator,
})

export const dashboardSafetyEscalationValidator = v.object({
  status: safetyStatusValidator,
  headline: v.string(),
  guidance: v.string(),
  evaluationId: v.id('safetyEvaluations'),
  createdAt: v.number(),
  requiresAcknowledgement: v.boolean(),
})

export const caregiverSupportSummaryValidator = v.object({
  dataSource: v.literal('live'),
  patientId: v.id('patients'),
  displayId: v.string(),
  patientName: v.string(),
  relationship: v.optional(v.string()),
  scopes: v.array(consentScopeValidator),
  expiresAt: v.optional(v.number()),
  restrictedSections: v.array(restrictedSectionValidator),
  hasCheckInToday: v.union(v.boolean(), v.null()),
  latestSymptomTotal: v.union(v.number(), v.null()),
  latestCheckInDate: v.union(v.string(), v.null()),
  latestCheckInUpdatedAt: v.union(v.number(), v.null()),
  latestSymptomProvenance: v.union(provenanceMetadataValidator, v.null()),
  chartPoints: v.union(v.array(dashboardChartPointValidator), v.null()),
  trendSummaryText: v.union(v.string(), v.null()),
  carePlanTasks: v.union(v.array(carePlanDocValidator), v.null()),
  reminders: v.union(v.array(planReminderDocValidator), v.null()),
  safetyStatus: v.union(
    v.object({
      headline: v.string(),
      guidance: v.string(),
      requiresAcknowledgement: v.boolean(),
    }),
    v.null()
  ),
  nextAppointmentLabel: v.union(v.string(), v.null()),
  canLogProxy: v.boolean(),
  canSendMessages: v.boolean(),
  canViewMessages: v.boolean(),
})

export const dashboardSummaryValidator = v.object({
  dataSource: v.literal('live'),
  patientName: v.string(),
  preferredName: v.optional(v.string()),
  episodeId: v.union(v.id('recoveryEpisodes'), v.null()),
  incidentDate: v.union(v.string(), v.null()),
  injuryContext: v.union(v.string(), v.null()),
  dayNumber: v.union(v.number(), v.null()),
  today: v.string(),
  hasCheckInToday: v.boolean(),
  latestCheckInDate: v.union(v.string(), v.null()),
  latestSymptomTotal: v.union(v.number(), v.null()),
  latestHeadacheRating: v.union(v.number(), v.null()),
  latestCheckInUpdatedAt: v.union(v.number(), v.null()),
  latestSymptomProvenance: v.union(provenanceMetadataValidator, v.null()),
  trendSummary: trendSummaryValidator,
  chartPoints: v.array(dashboardChartPointValidator),
  checkInConsistency: dashboardCheckInConsistencyValidator,
  sleepHours: v.union(v.number(), v.null()),
  sleepQuality: v.union(v.number(), v.null()),
  carePlanTasks: v.array(carePlanDocValidator),
  nextEncounter: v.union(encounterDocValidator, v.null()),
  nextEncounterClinicianName: v.union(v.string(), v.null()),
  insight: dashboardInsightValidator,
  safetyEscalation: v.union(dashboardSafetyEscalationValidator, v.null()),
})

// --- Recovery Timeline Validators ---

export const timelineRangeKeyValidator = v.union(
  v.literal('7'),
  v.literal('14'),
  v.literal('30'),
  v.literal('episode')
)

export const symptomGroupKeyValidator = v.union(
  v.literal('all'),
  v.literal('headache'),
  v.literal('vestibular'),
  v.literal('sensory'),
  v.literal('cognitive_fatigue'),
  v.literal('sleep_related')
)

export const comparisonViewKeyValidator = v.union(
  v.literal('symptoms_activity'),
  v.literal('symptoms_sleep'),
  v.literal('symptoms_screen')
)

export const timelineEventKindValidator = v.union(
  v.literal('incident'),
  v.literal('clinical_encounter'),
  v.literal('plan_change'),
  v.literal('amendment'),
  v.literal('safety_event')
)

export const timelineDayPointValidator = v.object({
  date: v.string(),
  dayLabel: v.string(),
  symptomValue: v.union(v.number(), v.null()),
  exposureValue: v.union(v.number(), v.null()),
  checkInId: v.union(v.id('checkIns'), v.null()),
  exposureId: v.union(v.id('activityExposures'), v.null()),
})

export const timelineEventMarkerValidator = v.object({
  id: v.string(),
  date: v.string(),
  kind: timelineEventKindValidator,
  title: v.string(),
  detail: v.string(),
  sourceType: v.string(),
  sourceId: v.string(),
})

export const timelineSummaryValidator = v.object({
  headline: v.string(),
  description: v.string(),
  loggedSymptomDays: v.number(),
  loggedExposureDays: v.number(),
  gapDays: v.number(),
  associationNote: v.string(),
})

export const recoveryTimelinePayloadValidator = v.object({
  dataSource: v.literal('live'),
  timeZone: v.string(),
  range: timelineRangeKeyValidator,
  symptomGroup: symptomGroupKeyValidator,
  comparisonView: comparisonViewKeyValidator,
  windowStart: v.string(),
  windowEnd: v.string(),
  points: v.array(timelineDayPointValidator),
  events: v.array(timelineEventMarkerValidator),
  summary: timelineSummaryValidator,
})

// --- Pattern Detection Validators ---

export const patternTypeValidator = v.union(
  v.literal('short_sleep_lagged_headache'),
  v.literal('high_screen_same_day_headache'),
  v.literal('high_physical_same_day_symptoms'),
  v.literal('high_cognitive_concentration'),
  v.literal('lower_physical_lower_dizziness')
)

export const patternStatusValidator = v.union(
  v.literal('available'),
  v.literal('insufficient'),
  v.literal('suppressed')
)

export const effectDirectionValidator = v.union(
  v.literal('positive'),
  v.literal('negative'),
  v.literal('mixed')
)

export const confidenceLevelValidator = v.union(
  v.literal('low'),
  v.literal('moderate'),
  v.literal('high')
)

export const patternEvidenceValidator = v.object({
  patternType: patternTypeValidator,
  status: patternStatusValidator,
  effectDirection: v.union(effectDirectionValidator, v.null()),
  strength: v.union(v.number(), v.null()),
  confidence: v.union(confidenceLevelValidator, v.null()),
  sampleCount: v.number(),
  matchCount: v.number(),
  inputDateRangeStart: v.union(v.string(), v.null()),
  inputDateRangeEnd: v.union(v.string(), v.null()),
  algorithmVersion: v.string(),
  title: v.string(),
  description: v.string(),
  footer: v.string(),
  suppressedReason: v.union(v.string(), v.null()),
  provenance: provenanceMetadataValidator,
})

export const patternDetectionResultValidator = v.object({
  algorithmVersion: v.string(),
  patterns: v.array(patternEvidenceValidator),
  primaryInsight: v.union(patternEvidenceValidator, v.null()),
  checkInCount: v.number(),
  exposureCount: v.number(),
  computedAt: v.string(),
})

export const patternInsightDocValidator = v.object({
  _id: v.id('patternInsights'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  patternType: patternTypeValidator,
  status: patternStatusValidator,
  effectDirection: v.optional(effectDirectionValidator),
  strength: v.optional(v.number()),
  confidence: v.optional(confidenceLevelValidator),
  sampleCount: v.number(),
  matchCount: v.number(),
  inputDateRangeStart: v.optional(v.string()),
  inputDateRangeEnd: v.optional(v.string()),
  algorithmVersion: v.string(),
  title: v.string(),
  description: v.string(),
  footer: v.string(),
  suppressedReason: v.optional(v.string()),
  computedAt: v.string(),
  createdAt: v.number(),
})

// --- Clinician Caseload Validators ---

export const caseloadAttentionValidator = v.union(
  v.literal('Routine'),
  v.literal('Review'),
  v.literal('Safety')
)

export const caseloadSortKeyValidator = v.union(
  v.literal('displayId'),
  v.literal('riskLevel'),
  v.literal('symptomTotal'),
  v.literal('checkInRate')
)

export const caseloadPatientRowValidator = v.object({
  patientId: v.id('patients'),
  displayId: v.string(),
  patientName: v.string(),
  preferredName: v.optional(v.string()),
  recoveryContext: v.union(v.string(), v.null()),
  episodeId: v.union(v.id('recoveryEpisodes'), v.null()),
  dayNumber: v.union(v.number(), v.null()),
  symptomTotal: v.union(v.number(), v.null()),
  symptomTotalUpdatedAt: v.union(v.number(), v.null()),
  checkInRate: v.union(v.number(), v.null()),
  riskLevel: v.union(riskValidator, v.null()),
  riskRationale: v.string(),
  attention: caseloadAttentionValidator,
  attentionReasons: v.array(v.string()),
  activeAlertCount: v.number(),
  missedCheckInsLast7Days: v.number(),
  status: patientStatusValidator,
  sortKey: v.string(),
})

export const caseloadSummaryValidator = v.object({
  activePatientCount: v.number(),
  newPatientsThisMonth: v.number(),
  needsReviewCount: v.number(),
  highPriorityAlertCount: v.number(),
  checkInRatePercent: v.union(v.number(), v.null()),
  averageSymptomTotal: v.union(v.number(), v.null()),
  dataAsOfMs: v.number(),
})

export const clinicalAlertViewValidator = v.object({
  alert: alertDocValidator,
  patientDisplayId: v.string(),
  patientName: v.string(),
  assignedToName: v.union(v.string(), v.null()),
  isUnassigned: v.boolean(),
  freshnessLabel: v.string(),
  provenance: v.union(provenanceMetadataValidator, v.null()),
})

