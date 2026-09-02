import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // 1. Multi-tenant Organization & Clinic Workspaces
  organizations: defineTable({
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
    .index('by_slug', ['slug'])
    .index('by_createdAt', ['createdAt']),

  // 2. Identity & User Accounts (Synced from Clerk via tokenIdentifier)
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    status: v.union(v.literal('Active'), v.literal('Invited'), v.literal('Suspended')),
    phone: v.optional(v.string()),
    lastActive: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_email', ['email'])
    .index('by_role', ['role'])
    .index('by_status', ['status'])
    .index('by_role_and_status', ['role', 'status']),

  // 3. Clinician Staff Memberships
  clinicianMemberships: defineTable({
    userId: v.id('users'),
    orgId: v.id('organizations'),
    clinicalRole: v.union(
      v.literal('lead'),
      v.literal('attending'),
      v.literal('staff'),
      v.literal('consultant')
    ),
    specialty: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('inactive')),
    joinedAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_orgId', ['orgId'])
    .index('by_orgId_and_status', ['orgId', 'status'])
    .index('by_userId_and_orgId', ['userId', 'orgId']),

  // 4. Patient Clinical Profiles
  patients: defineTable({
    userId: v.id('users'),
    orgId: v.id('organizations'),
    primaryClinicianId: v.optional(v.id('users')),
    displayId: v.string(), // e.g. "P-1042" for search and UI display
    dateOfBirth: v.optional(v.string()),
    preferredName: v.optional(v.string()),
    status: v.union(v.literal('Active'), v.literal('Discharged'), v.literal('Inactive')),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_orgId', ['orgId'])
    .index('by_displayId', ['displayId'])
    .index('by_primaryClinicianId', ['primaryClinicianId'])
    .index('by_orgId_and_status', ['orgId', 'status']),

  // 5. Longitudinal Concussion Recovery Episodes
  recoveryEpisodes: defineTable({
    patientId: v.id('patients'),
    orgId: v.id('organizations'),
    incidentDate: v.string(),
    injuryContext: v.string(),
    status: v.union(v.literal('active'), v.literal('graduated'), v.literal('dormant')),
    riskLevel: v.union(v.literal('Stable'), v.literal('Review'), v.literal('Elevated')),
    baselineSymptomTotal: v.optional(v.number()),
    adherenceRate: v.optional(v.number()),
    startDate: v.string(),
    closedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_orgId', ['orgId'])
    .index('by_patientId_and_status', ['patientId', 'status'])
    .index('by_orgId_and_riskLevel', ['orgId', 'riskLevel'])
    .index('by_orgId_and_status', ['orgId', 'status']),

  // 6. Scoped, Expiring, Revocable Consent Grants
  consentGrants: defineTable({
    patientId: v.id('patients'),
    granteeUserId: v.id('users'),
    granteeRole: v.union(v.literal('caregiver'), v.literal('clinician'), v.literal('family')),
    scopes: v.array(
      v.union(
        v.literal('view_symptoms'),
        v.literal('view_trends'),
        v.literal('view_plan'),
        v.literal('log_proxy'),
        v.literal('receive_alerts')
      )
    ),
    relationship: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('revoked'), v.literal('expired')),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    revokedByUserId: v.optional(v.id('users')),
  })
    .index('by_patientId', ['patientId'])
    .index('by_granteeUserId', ['granteeUserId'])
    .index('by_patientId_and_granteeUserId', ['patientId', 'granteeUserId'])
    .index('by_granteeUserId_and_status', ['granteeUserId', 'status'])
    .index('by_patientId_and_status', ['patientId', 'status']),

  // 7. Concussion Daily Check-Ins (8-symptom inventory 0-6 + danger signs)
  checkIns: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    submittedByUserId: v.id('users'),
    date: v.string(),
    symptoms: v.object({
      headache: v.number(),
      dizziness: v.number(),
      nausea: v.number(),
      lightSensitivity: v.number(),
      noiseSensitivity: v.number(),
      fatigue: v.number(),
      concentration: v.number(),
      sleepDifficulty: v.number(),
    }),
    symptomTotal: v.number(),
    activityImpact: v.union(
      v.literal('yes'),
      v.literal('no'),
      v.literal('not-sure'),
      v.literal('none')
    ),
    dangerSignsPresent: v.boolean(),
    dangerSigns: v.array(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_date', ['patientId', 'date'])
    .index('by_episodeId', ['episodeId'])
    .index('by_submittedByUserId', ['submittedByUserId'])
    .index('by_patientId_and_createdAt', ['patientId', 'createdAt']),

  // 8. Daily Exertion & Activity Exposures
  activityExposures: defineTable({
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
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_date', ['patientId', 'date'])
    .index('by_episodeId', ['episodeId']),

  // 9. Longitudinal Daily Recovery Trend Summaries
  recoveryTrends: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    date: v.string(),
    dayLabel: v.string(),
    symptomTotal: v.number(),
    headacheRating: v.number(),
    sleepQuality: v.number(),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_date', ['patientId', 'date'])
    .index('by_episodeId', ['episodeId']),

  // 10. Clinical Encounters & Progress Notes
  clinicalEncounters: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    orgId: v.id('organizations'),
    clinicianUserId: v.id('users'),
    encounterType: v.union(
      v.literal('in-person'),
      v.literal('telehealth'),
      v.literal('asynchronous')
    ),
    diagnosis: v.string(),
    datetime: v.string(),
    clinicalSummary: v.string(),
    notes: v.string(),
    attachmentStorageId: v.optional(v.id('_storage')),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_orgId', ['orgId'])
    .index('by_clinicianUserId', ['clinicianUserId'])
    .index('by_patientId_and_createdAt', ['patientId', 'createdAt']),

  // 11. Concussion-Adapted Pacing & Care Plans
  carePlans: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    assignedByUserId: v.optional(v.id('users')),
    title: v.string(),
    category: v.union(
      v.literal('cognitive_pacing'),
      v.literal('physical_activity'),
      v.literal('sleep_hygiene'),
      v.literal('medication'),
      v.literal('check_in'),
      v.literal('appointment')
    ),
    targetTime: v.optional(v.string()),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    completedByUserId: v.optional(v.id('users')),
    dayNumber: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_completed', ['patientId', 'completed'])
    .index('by_episodeId', ['episodeId']),

  // 12. Clinical Safety Alerts & Triage
  alerts: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    orgId: v.id('organizations'),
    detail: v.string(),
    severity: v.union(v.literal('High'), v.literal('Medium'), v.literal('Low')),
    status: v.union(v.literal('active'), v.literal('acknowledged'), v.literal('resolved')),
    dangerSigns: v.optional(v.array(v.string())),
    acknowledgedByUserId: v.optional(v.id('users')),
    resolvedByUserId: v.optional(v.id('users')),
    createdAt: v.number(),
  })
    .index('by_orgId', ['orgId'])
    .index('by_patientId', ['patientId'])
    .index('by_status', ['status'])
    .index('by_severity', ['severity'])
    .index('by_status_and_severity', ['status', 'severity'])
    .index('by_orgId_and_status', ['orgId', 'status']),

  // 13. Secure Multi-Party Care Team Messaging
  messages: defineTable({
    threadId: v.string(),
    senderUserId: v.id('users'),
    recipientUserId: v.optional(v.id('users')),
    patientId: v.optional(v.id('patients')),
    orgId: v.optional(v.id('organizations')),
    content: v.string(),
    createdAt: v.number(),
    read: v.boolean(),
  })
    .index('by_threadId', ['threadId'])
    .index('by_senderUserId', ['senderUserId'])
    .index('by_patientId', ['patientId'])
    .index('by_threadId_and_createdAt', ['threadId', 'createdAt'])
    .index('by_threadId_and_read', ['threadId', 'read']),

  // 14. Immutable Security, Compliance & Access Audit Logs
  auditLogs: defineTable({
    actorUserId: v.id('users'),
    actorRole: v.string(),
    orgId: v.optional(v.id('organizations')),
    patientId: v.optional(v.id('patients')),
    event: v.string(),
    targetResource: v.string(),
    resourceId: v.optional(v.string()),
    action: v.union(
      v.literal('read'),
      v.literal('create'),
      v.literal('update'),
      v.literal('delete'),
      v.literal('consent_grant'),
      v.literal('consent_revoke'),
      v.literal('auth_failure')
    ),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_actorUserId', ['actorUserId'])
    .index('by_orgId', ['orgId'])
    .index('by_patientId', ['patientId'])
    .index('by_targetResource', ['targetResource'])
    .index('by_createdAt', ['createdAt'])
    .index('by_orgId_and_createdAt', ['orgId', 'createdAt']),
})

