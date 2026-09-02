import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // 1. Multi-tenant Organization & Clinic Workspaces
  organizations: defineTable({
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
    featureFlags: v.optional(
      v.object({
        aiInsights: v.boolean(),
        caregiverPortal: v.boolean(),
        secureMessaging: v.boolean(),
        patternDetection: v.boolean(),
      })
    ),
    approvedPolicies: v.optional(v.array(v.string())),
    clerkUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_clerkId', ['clerkId'])
    .index('by_createdAt', ['createdAt']),

  // 1b. Organization membership (org-scoped roles; prevents cross-org administration)
  organizationMemberships: defineTable({
    userId: v.id('users'),
    orgId: v.id('organizations'),
    orgRole: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    status: v.union(v.literal('active'), v.literal('inactive'), v.literal('invited')),
    clerkMembershipId: v.optional(v.string()),
    joinedAt: v.number(),
  })
    .index('by_orgId', ['orgId'])
    .index('by_userId', ['userId'])
    .index('by_userId_and_orgId', ['userId', 'orgId'])
    .index('by_orgId_and_orgRole', ['orgId', 'orgRole'])
    .index('by_orgId_and_status', ['orgId', 'status']),

  // 1c. Pending organization invitations (synced with Clerk)
  organizationInvitations: defineTable({
    orgId: v.id('organizations'),
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    clerkInvitationId: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('revoked'),
      v.literal('expired')
    ),
    invitedByUserId: v.id('users'),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_orgId', ['orgId'])
    .index('by_email', ['email'])
    .index('by_clerkInvitationId', ['clerkInvitationId'])
    .index('by_orgId_and_status', ['orgId', 'status'])
    .index('by_orgId_and_email', ['orgId', 'email']),

  // 2. Identity & User Accounts (Synced from Clerk via tokenIdentifier)
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkId: v.optional(v.string()),
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
    clerkUpdatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_clerkId', ['clerkId'])
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
    ageBand: v.optional(
      v.union(
        v.literal('13-17'),
        v.literal('18-24'),
        v.literal('25-39'),
        v.literal('40-54'),
        v.literal('55-plus')
      )
    ),
    timeZone: v.optional(v.string()),
    trackingRelationship: v.optional(
      v.union(v.literal('patient'), v.literal('caregiver'), v.literal('professional'))
    ),
    diagnosisStatus: v.optional(
      v.union(v.literal('yes'), v.literal('no'), v.literal('unsure'))
    ),
    communicationPreferences: v.optional(
      v.object({
        emailReminders: v.boolean(),
        smsReminders: v.boolean(),
        weeklySummary: v.boolean(),
      })
    ),
    accessibilityPreferences: v.optional(
      v.object({
        largeText: v.boolean(),
        highContrast: v.boolean(),
        reducedMotion: v.boolean(),
      })
    ),
    quietHours: v.optional(
      v.object({
        start: v.string(),
        end: v.string(),
      })
    ),
    notificationConsentRevokedAt: v.optional(v.number()),
    onboardingCompletedAt: v.optional(v.number()),
    baselineCompletedAt: v.optional(v.number()),
    status: v.union(v.literal('Active'), v.literal('Discharged'), v.literal('Inactive')),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_orgId', ['orgId'])
    .index('by_displayId', ['displayId'])
    .index('by_primaryClinicianId', ['primaryClinicianId'])
    .index('by_orgId_and_status', ['orgId', 'status'])
    .index('by_orgId_and_displayId', ['orgId', 'displayId']),

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
        v.literal('receive_alerts'),
        v.literal('view_messages'),
        v.literal('send_messages')
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
    methodologyVersion: v.optional(v.string()),
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
    .index('by_patientId_and_createdAt', ['patientId', 'createdAt'])
    .index('by_episodeId_and_date', ['episodeId', 'date']),

  // 7b. Append-only check-in amendments (original records remain immutable)
  checkInAmendments: defineTable({
    checkInId: v.id('checkIns'),
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    amendedByUserId: v.id('users'),
    reason: v.string(),
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
    methodologyVersion: v.optional(v.string()),
    activityImpact: v.union(
      v.literal('yes'),
      v.literal('no'),
      v.literal('not-sure'),
      v.literal('none')
    ),
    dangerSignsPresent: v.boolean(),
    dangerSigns: v.array(v.string()),
    note: v.optional(v.string()),
    originalSymptoms: v.object({
      headache: v.number(),
      dizziness: v.number(),
      nausea: v.number(),
      lightSensitivity: v.number(),
      noiseSensitivity: v.number(),
      fatigue: v.number(),
      concentration: v.number(),
      sleepDifficulty: v.number(),
    }),
    originalSymptomTotal: v.number(),
    originalActivityImpact: v.union(
      v.literal('yes'),
      v.literal('no'),
      v.literal('not-sure'),
      v.literal('none')
    ),
    originalDangerSignsPresent: v.boolean(),
    originalDangerSigns: v.array(v.string()),
    originalNote: v.optional(v.string()),
    safetyEvaluationId: v.optional(v.id('safetyEvaluations')),
    createdAt: v.number(),
  })
    .index('by_checkInId', ['checkInId'])
    .index('by_patientId_and_createdAt', ['patientId', 'createdAt']),

  // 8. Daily Exertion & Activity Exposures (rollup summaries)
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

  // 8b. Granular exposure entries (physical, cognitive, screen, work/school, sleep)
  exposureEntries: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    checkInId: v.optional(v.id('checkIns')),
    date: v.string(),
    domain: v.union(
      v.literal('physical'),
      v.literal('cognitive'),
      v.literal('work_school'),
      v.literal('screen'),
      v.literal('sleep')
    ),
    activityType: v.string(),
    durationMinutes: v.optional(v.number()),
    intensity: v.optional(v.number()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    symptomsWorsened: v.union(
      v.literal('yes'),
      v.literal('no'),
      v.literal('not_sure'),
      v.literal('not_applicable')
    ),
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
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_date', ['patientId', 'date'])
    .index('by_patientId_and_domain', ['patientId', 'domain'])
    .index('by_checkInId', ['checkInId'])
    .index('by_episodeId', ['episodeId']),

  // 9. Longitudinal Daily Recovery Trend Summaries
  recoveryTrends: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    date: v.string(),
    dayLabel: v.string(),
    symptomTotal: v.number(),
    methodologyVersion: v.optional(v.string()),
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
    description: v.optional(v.string()),
    category: v.union(
      v.literal('cognitive_pacing'),
      v.literal('physical_activity'),
      v.literal('sleep_hygiene'),
      v.literal('medication'),
      v.literal('check_in'),
      v.literal('appointment'),
      v.literal('education'),
      v.literal('accommodations')
    ),
    /** Clinician-recorded medication instruction only — never AI-generated. */
    medicationInstruction: v.optional(v.string()),
    targetTime: v.optional(v.string()),
    scheduledDate: v.optional(v.string()),
    completionStatus: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('skipped'),
      v.literal('unable_to_complete')
    ),
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
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_completed', ['patientId', 'completed'])
    .index('by_patientId_and_completionStatus', ['patientId', 'completionStatus'])
    .index('by_episodeId', ['episodeId']),

  // 11b. Immutable care plan change history (audited, non-punitive adherence context)
  carePlanEvents: defineTable({
    patientId: v.id('patients'),
    carePlanId: v.optional(v.id('carePlans')),
    actorUserId: v.id('users'),
    actorRole: v.string(),
    eventType: v.union(
      v.literal('created'),
      v.literal('updated'),
      v.literal('completed'),
      v.literal('skipped'),
      v.literal('unable_to_complete'),
      v.literal('reopened')
    ),
    summary: v.string(),
    previousStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_patientId_and_createdAt', ['patientId', 'createdAt'])
    .index('by_carePlanId', ['carePlanId']),

  // 11c. Configurable plan reminders (respect consent, quiet hours, revocation)
  planReminders: defineTable({
    patientId: v.id('patients'),
    carePlanId: v.optional(v.id('carePlans')),
    title: v.string(),
    channel: v.union(v.literal('email'), v.literal('sms')),
    scheduledTime: v.string(),
    timeZone: v.string(),
    status: v.union(v.literal('active'), v.literal('paused'), v.literal('revoked')),
    createdByUserId: v.id('users'),
    createdByRole: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_status', ['patientId', 'status'])
    .index('by_carePlanId', ['carePlanId']),

  // 12. Clinical Safety Alerts & Triage
  alerts: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    orgId: v.id('organizations'),
    detail: v.string(),
    severity: v.union(v.literal('High'), v.literal('Medium'), v.literal('Low')),
    status: v.union(
      v.literal('active'),
      v.literal('acknowledged'),
      v.literal('resolved'),
      v.literal('snoozed')
    ),
    alertSource: v.optional(
      v.union(
        v.literal('safety_engine'),
        v.literal('missed_check_in'),
        v.literal('trend_rule')
      )
    ),
    ruleCode: v.optional(v.string()),
    safetyEvaluationId: v.optional(v.id('safetyEvaluations')),
    provenance: v.optional(
      v.object({
        schemaVersion: v.string(),
        sourceKind: v.union(
          v.literal('patient_report'),
          v.literal('symptom_total'),
          v.literal('computed_trend'),
          v.literal('pattern_insight'),
          v.literal('safety_outcome'),
          v.literal('clinician_content'),
          v.literal('ai_generated')
        ),
        sourceKindLabel: v.string(),
        plainLanguageRationale: v.string(),
        technicalDetail: v.optional(v.string()),
        dateRangeStart: v.union(v.string(), v.null()),
        dateRangeEnd: v.union(v.string(), v.null()),
        methodName: v.string(),
        methodVersion: v.string(),
        confidence: v.union(
          v.literal('high'),
          v.literal('moderate'),
          v.literal('low'),
          v.literal('insufficient'),
          v.literal('not_applicable')
        ),
        confidenceExplanation: v.string(),
        sourceRecords: v.array(
          v.object({
            label: v.string(),
            recordType: v.string(),
            recordId: v.optional(v.string()),
            date: v.optional(v.string()),
            visible: v.boolean(),
          })
        ),
        evidenceReferences: v.array(
          v.object({
            label: v.string(),
            citation: v.optional(v.string()),
            authority: v.optional(v.string()),
            ruleId: v.optional(v.string()),
            version: v.optional(v.string()),
          })
        ),
        contributingCategories: v.optional(
          v.array(
            v.object({
              label: v.string(),
              rating: v.union(v.number(), v.null()),
              visible: v.boolean(),
            })
          )
        ),
        recomputedFromAmendment: v.optional(v.boolean()),
        amendmentNote: v.optional(v.string()),
        nonDiagnosticDisclaimer: v.string(),
        restrictedDetailCount: v.optional(v.number()),
      })
    ),
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
    .index('by_orgId', ['orgId'])
    .index('by_patientId', ['patientId'])
    .index('by_status', ['status'])
    .index('by_severity', ['severity'])
    .index('by_status_and_severity', ['status', 'severity'])
    .index('by_orgId_and_status', ['orgId', 'status'])
    .index('by_orgId_and_createdAt', ['orgId', 'createdAt'])
    .index('by_orgId_and_assignedToUserId', ['orgId', 'assignedToUserId']),

  // 13. Secure Multi-Party Care Team Messaging
  messageThreads: defineTable({
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
    .index('by_externalThreadId', ['externalThreadId'])
    .index('by_patientId', ['patientId'])
    .index('by_orgId', ['orgId'])
    .index('by_episodeId', ['episodeId'])
    .index('by_patientId_and_status', ['patientId', 'status'])
    .index('by_orgId_and_lastMessageAt', ['orgId', 'lastMessageAt']),

  messages: defineTable({
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
    .index('by_threadId', ['threadId'])
    .index('by_senderUserId', ['senderUserId'])
    .index('by_patientId', ['patientId'])
    .index('by_threadId_and_createdAt', ['threadId', 'createdAt'])
    .index('by_threadId_and_read', ['threadId', 'read'])
    .index('by_threadId_and_clientMessageId', ['threadId', 'clientMessageId']),

  messageReadReceipts: defineTable({
    messageId: v.id('messages'),
    threadId: v.string(),
    userId: v.id('users'),
    readAt: v.number(),
  })
    .index('by_threadId_and_userId', ['threadId', 'userId'])
    .index('by_messageId_and_userId', ['messageId', 'userId'])
    .index('by_userId', ['userId']),

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
      v.literal('auth_failure'),
      v.literal('safety_notification'),
      v.literal('safety_acknowledgement')
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

  // 15. Deterministic Safety Engine Evaluations & Audit Trail
  safetyEvaluations: defineTable({
    patientId: v.optional(v.id('patients')),
    orgId: v.optional(v.id('organizations')),
    evaluatedByUserId: v.optional(v.id('users')),
    contextType: v.union(
      v.literal('check_in'),
      v.literal('onboarding'),
      v.literal('baseline'),
      v.literal('free_text'),
      v.literal('ai_query'),
      v.literal('longitudinal')
    ),
    status: v.union(
      v.literal('safe'),
      v.literal('warning'),
      v.literal('review'),
      v.literal('elevated'),
      v.literal('emergency')
    ),
    highestSeverity: v.union(
      v.literal('emergency'),
      v.literal('high'),
      v.literal('medium'),
      v.literal('low'),
      v.literal('info'),
      v.literal('none')
    ),
    ruleEngineVersion: v.string(),
    matchedRuleCodes: v.array(v.string()),
    matchedRuleIds: v.optional(v.array(v.string())),
    matchedEvidenceSummary: v.array(v.string()),
    primaryEscalation: v.string(),
    blockedActions: v.array(v.string()),
    failSafeApplied: v.boolean(),
    targetResourceId: v.optional(v.string()),
    followUpState: v.optional(
      v.union(
        v.literal('pending_acknowledgement'),
        v.literal('acknowledged'),
        v.literal('notification_sent'),
        v.literal('notification_skipped')
      )
    ),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedByUserId: v.optional(v.id('users')),
    notificationAttemptedAt: v.optional(v.number()),
    notificationOutcome: v.optional(
      v.union(
        v.literal('sent'),
        v.literal('skipped_no_consent'),
        v.literal('skipped_not_escalated')
      )
    ),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_orgId', ['orgId'])
    .index('by_contextType', ['contextType'])
    .index('by_status', ['status'])
    .index('by_patientId_and_createdAt', ['patientId', 'createdAt'])
    .index('by_createdAt', ['createdAt']),

  // 16. Resumable recovery onboarding drafts (server-side progress persistence)
  onboardingDrafts: defineTable({
    userId: v.id('users'),
    step: v.number(),
    trackingRelationship: v.optional(
      v.union(v.literal('patient'), v.literal('caregiver'), v.literal('professional'))
    ),
    preferredName: v.optional(v.string()),
    ageBand: v.optional(
      v.union(
        v.literal('13-17'),
        v.literal('18-24'),
        v.literal('25-39'),
        v.literal('40-54'),
        v.literal('55-plus')
      )
    ),
    incidentDate: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    diagnosisStatus: v.optional(
      v.union(v.literal('yes'), v.literal('no'), v.literal('unsure'))
    ),
    communicationPreferences: v.optional(
      v.object({
        emailReminders: v.boolean(),
        smsReminders: v.boolean(),
        weeklySummary: v.boolean(),
      })
    ),
    consentAcknowledged: v.optional(v.boolean()),
    privacyAcknowledged: v.optional(v.boolean()),
    limitationsAcknowledged: v.optional(v.boolean()),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  // 17. Versioned initial recovery baselines tied to a recovery episode
  recoveryBaselines: defineTable({
    patientId: v.id('patients'),
    episodeId: v.id('recoveryEpisodes'),
    orgId: v.id('organizations'),
    version: v.number(),
    isCurrent: v.boolean(),
    supersededAt: v.optional(v.number()),
    incidentDate: v.string(),
    incidentContext: v.string(),
    careReceived: v.optional(v.string()),
    diagnosisStatus: v.union(v.literal('yes'), v.literal('no'), v.literal('unsure')),
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
    methodologyVersion: v.optional(v.string()),
    sleepHours: v.optional(v.number()),
    schoolWorkDemand: v.optional(v.number()),
    physicalActivityLevel: v.optional(v.number()),
    cognitiveActivityLevel: v.optional(v.number()),
    screenTolerance: v.optional(v.number()),
    skippedFields: v.array(
      v.object({
        fieldId: v.string(),
        reason: v.string(),
      })
    ),
    dangerSignsPresent: v.boolean(),
    dangerSigns: v.array(v.string()),
    completionDurationMs: v.number(),
    submittedByUserId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_episodeId', ['episodeId'])
    .index('by_episodeId_and_version', ['episodeId', 'version'])
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_isCurrent', ['patientId', 'isCurrent'])
    .index('by_episodeId_and_isCurrent', ['episodeId', 'isCurrent']),

  // 18. Resumable initial recovery assessment drafts
  baselineAssessmentDrafts: defineTable({
    userId: v.id('users'),
    patientId: v.id('patients'),
    episodeId: v.id('recoveryEpisodes'),
    step: v.number(),
    startedAt: v.number(),
    incidentDate: v.optional(v.string()),
    incidentContext: v.optional(v.string()),
    careReceived: v.optional(v.string()),
    diagnosisStatus: v.optional(
      v.union(v.literal('yes'), v.literal('no'), v.literal('unsure'))
    ),
    symptoms: v.optional(
      v.object({
        headache: v.optional(v.number()),
        dizziness: v.optional(v.number()),
        nausea: v.optional(v.number()),
        lightSensitivity: v.optional(v.number()),
        noiseSensitivity: v.optional(v.number()),
        fatigue: v.optional(v.number()),
        concentration: v.optional(v.number()),
        sleepDifficulty: v.optional(v.number()),
      })
    ),
    sleepHours: v.optional(v.number()),
    schoolWorkDemand: v.optional(v.number()),
    physicalActivityLevel: v.optional(v.number()),
    cognitiveActivityLevel: v.optional(v.number()),
    screenTolerance: v.optional(v.number()),
    skippedFields: v.optional(
      v.array(
        v.object({
          fieldId: v.string(),
          reason: v.string(),
        })
      )
    ),
    dangerSigns: v.optional(v.array(v.string())),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  // 19. AI governance configuration (kill switch, cost limits, feature flags)
  aiGovernanceConfig: defineTable({
    scope: v.union(v.literal('global'), v.literal('org')),
    orgId: v.optional(v.id('organizations')),
    globalKillSwitch: v.boolean(),
    featureKillSwitches: v.object({
      nlp: v.boolean(),
      rag: v.boolean(),
      insights: v.boolean(),
      all: v.boolean(),
    }),
    dailyCostLimitCents: v.number(),
    currentDailyCostCents: v.number(),
    costResetDate: v.string(),
    updatedByUserId: v.id('users'),
    updatedAt: v.number(),
  })
    .index('by_scope', ['scope'])
    .index('by_orgId', ['orgId']),

  // 20. AI model/provider change approvals (requires re-evaluation)
  aiModelApprovals: defineTable({
    providerId: v.string(),
    modelId: v.string(),
    evaluationDatasetVersion: v.string(),
    evaluationRunId: v.optional(v.id('aiEvaluationRuns')),
    approvedByUserId: v.id('users'),
    approvedAt: v.number(),
    expiresAt: v.number(),
    notes: v.optional(v.string()),
    status: v.union(v.literal('active'), v.literal('expired'), v.literal('revoked')),
  })
    .index('by_providerId_and_modelId', ['providerId', 'modelId'])
    .index('by_status', ['status']),

  // 21. AI evaluation run results (release gate audit trail)
  aiEvaluationRuns: defineTable({
    datasetVersion: v.string(),
    totalCases: v.number(),
    passedCases: v.number(),
    failedCases: v.number(),
    metrics: v.object({
      safetyRefusalRate: v.number(),
      privacyNoPiiSent: v.number(),
      groundednessCitationValid: v.number(),
      injectionBlockedRate: v.number(),
      exfiltrationBlockedRate: v.number(),
      biasNeutralLanguage: v.number(),
    }),
    releaseBlocked: v.boolean(),
    criticalFailures: v.array(v.string()),
    runByUserId: v.optional(v.id('users')),
    runAt: v.number(),
  })
    .index('by_datasetVersion', ['datasetVersion'])
    .index('by_runAt', ['runAt']),

  // 22. AI request audit log (no prompts, no PII — metadata only)
  aiRequestAudit: defineTable({
    requestId: v.string(),
    ctxSessionId: v.string(),
    orgId: v.optional(v.id('organizations')),
    feature: v.union(
      v.literal('nlp'),
      v.literal('rag'),
      v.literal('insights'),
      v.literal('all')
    ),
    outcome: v.string(),
    providerId: v.optional(v.string()),
    modelId: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    tokenCount: v.optional(v.number()),
    promptFingerprint: v.string(),
    createdAt: v.number(),
  })
    .index('by_requestId', ['requestId'])
    .index('by_orgId_and_createdAt', ['orgId', 'createdAt'])
    .index('by_outcome', ['outcome'])
    .index('by_createdAt', ['createdAt']),

  // 23. Versioned longitudinal pattern insights (transparent statistical associations)
  patternInsights: defineTable({
    patientId: v.id('patients'),
    episodeId: v.optional(v.id('recoveryEpisodes')),
    patternType: v.union(
      v.literal('short_sleep_lagged_headache'),
      v.literal('high_screen_same_day_headache'),
      v.literal('high_physical_same_day_symptoms'),
      v.literal('high_cognitive_concentration'),
      v.literal('lower_physical_lower_dizziness')
    ),
    status: v.union(v.literal('available'), v.literal('insufficient'), v.literal('suppressed')),
    effectDirection: v.optional(
      v.union(v.literal('positive'), v.literal('negative'), v.literal('mixed'))
    ),
    strength: v.optional(v.number()),
    confidence: v.optional(
      v.union(v.literal('low'), v.literal('moderate'), v.literal('high'))
    ),
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
    .index('by_patientId', ['patientId'])
    .index('by_patientId_and_status', ['patientId', 'status'])
    .index('by_episodeId', ['episodeId'])
    .index('by_patientId_and_computedAt', ['patientId', 'computedAt']),

  // 24. Clerk webhook delivery ledger (idempotency + observability, no PII)
  clerkWebhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    status: v.union(
      v.literal('processed'),
      v.literal('failed'),
      v.literal('ignored'),
      v.literal('skipped_duplicate')
    ),
    errorCode: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.optional(v.number()),
    attemptCount: v.number(),
  })
    .index('by_eventId', ['eventId'])
    .index('by_status_and_receivedAt', ['status', 'receivedAt']),
})


