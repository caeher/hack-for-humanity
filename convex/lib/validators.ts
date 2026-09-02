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
  v.literal('auth_failure')
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

// --- Document Validators ---

export const orgDocValidator = v.object({
  _id: v.id('organizations'),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  retentionPolicyDays: v.number(),
  autoEscalateAlerts: v.boolean(),
  primaryContactEmail: v.string(),
  cohortCapacity: v.optional(v.number()),
  accentColor: v.optional(v.string()),
  activePathways: v.optional(v.array(v.string())),
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

export const recoveryTrendDocValidator = v.object({
  _id: v.id('recoveryTrends'),
  _creationTime: v.number(),
  patientId: v.id('patients'),
  episodeId: v.optional(v.id('recoveryEpisodes')),
  date: v.string(),
  dayLabel: v.string(),
  symptomTotal: v.number(),
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
  matchedEvidenceSummary: v.array(v.string()),
  primaryEscalation: v.string(),
  blockedActions: v.array(v.string()),
  failSafeApplied: v.boolean(),
  targetResourceId: v.optional(v.string()),
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


