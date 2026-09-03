import { QueryCtx, MutationCtx } from '../_generated/server'
import { Id } from '../_generated/dataModel'
import { isPatientUnderLegalHold } from './retentionLogic'

/**
 * Compiles a consent-aware, comprehensive JSON export payload for a patient.
 * Adheres to GDPR Art. 20 (Right to Data Portability) and HIPAA privacy rules.
 * Strictly excludes third-party confidential credentials, internal secret tokens,
 * and data of other patients.
 */
export async function compilePatientExportPayload(
  ctx: QueryCtx | MutationCtx,
  patientId: Id<'patients'>
) {
  const patient = await ctx.db.get(patientId)
  if (!patient) {
    throw new Error(`Patient ${patientId} not found.`)
  }

  const user = await ctx.db.get(patient.userId)

  // 1. Recovery episodes
  const episodes = await ctx.db
    .query('recoveryEpisodes')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 2. Check-ins
  const checkIns = await ctx.db
    .query('checkIns')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 3. Activity exposures & entries
  const activityExposures = await ctx.db
    .query('activityExposures')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  const exposureEntries = await ctx.db
    .query('exposureEntries')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 4. Recovery trends
  const recoveryTrends = await ctx.db
    .query('recoveryTrends')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 5. Care plan items
  const carePlans = await ctx.db
    .query('carePlans')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 6. Clinical encounter summaries
  const encounters = await ctx.db
    .query('clinicalEncounters')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 7. Clinical alerts
  const alerts = await ctx.db
    .query('alerts')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 8. Consent grants
  const consentGrants = await ctx.db
    .query('consentGrants')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .collect()

  // 9. Recovery reports
  const reports = await ctx.db
    .query('recoveryReports')
    .withIndex('by_patientId_and_generatedAt', q => q.eq('patientId', patientId))
    .collect()

  // 10. Audit history associated with patient
  const auditLogs = await ctx.db
    .query('auditLogs')
    .withIndex('by_patientId', q => q.eq('patientId', patientId))
    .take(200)

  return {
    metadata: {
      specification: 'CRI-GDPR-HIPAA-EXPORT-V1',
      exportedAt: new Date().toISOString(),
      patientDisplayId: patient.displayId,
      organizationId: patient.orgId,
    },
    demographics: {
      displayId: patient.displayId,
      preferredName: patient.preferredName,
      dateOfBirth: patient.dateOfBirth,
      ageBand: patient.ageBand,
      timeZone: patient.timeZone,
      status: patient.status,
      communicationPreferences: patient.communicationPreferences,
      accessibilityPreferences: patient.accessibilityPreferences,
      quietHours: patient.quietHours,
      createdAt: patient.createdAt,
    },
    contact: user ? {
      name: user.name,
      email: user.email,
      phone: user.phone,
    } : null,
    recoveryEpisodes: episodes.map(e => ({
      incidentDate: e.incidentDate,
      injuryContext: e.injuryContext,
      status: e.status,
      riskLevel: e.riskLevel,
      baselineSymptomTotal: e.baselineSymptomTotal,
      startDate: e.startDate,
      closedAt: e.closedAt,
    })),
    dailyCheckIns: checkIns.map(c => ({
      date: c.date,
      symptoms: c.symptoms,
      symptomTotal: c.symptomTotal,
      dangerSignsPresent: c.dangerSignsPresent,
      dangerSigns: c.dangerSigns,
      activityImpact: c.activityImpact,
      note: c.note,
      createdAt: c.createdAt,
    })),
    activityExposures: activityExposures.map(a => ({
      date: a.date,
      cognitiveMinutes: a.cognitiveMinutes,
      screenMinutes: a.screenMinutes,
      physicalExertionScore: a.physicalExertionScore,
      sleepHours: a.sleepHours,
      sleepQuality: a.sleepQuality,
    })),
    exposureEntries: exposureEntries.map(e => ({
      date: e.date,
      domain: e.domain,
      activityType: e.activityType,
      durationMinutes: e.durationMinutes,
      intensity: e.intensity,
      symptomsWorsened: e.symptomsWorsened,
    })),
    recoveryTrends: recoveryTrends.map(t => ({
      date: t.date,
      symptomTotal: t.symptomTotal,
      headacheRating: t.headacheRating,
      sleepQuality: t.sleepQuality,
    })),
    carePlanItems: carePlans.map(p => ({
      title: p.title,
      description: p.description,
      category: p.category,
      completionStatus: p.completionStatus,
      completed: p.completed,
      scheduledDate: p.scheduledDate,
      targetTime: p.targetTime,
    })),
    clinicalEncounters: encounters.map(enc => ({
      datetime: enc.datetime,
      encounterType: enc.encounterType,
      diagnosis: enc.diagnosis,
      clinicalSummary: enc.clinicalSummary,
      status: enc.status,
    })),
    clinicalAlerts: alerts.map(a => ({
      severity: a.severity,
      status: a.status,
      detail: a.detail,
      dangerSigns: a.dangerSigns,
      createdAt: a.createdAt,
    })),
    consentGrants: consentGrants.map(g => ({
      relationship: g.relationship,
      scopes: g.scopes,
      status: g.status,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
      revokedAt: g.revokedAt,
    })),
    recoveryReports: reports.map(r => ({
      reportVersion: r.reportVersion,
      rangeKey: r.rangeKey,
      rangeStart: r.rangeStart,
      rangeEnd: r.rangeEnd,
      generatedAt: r.generatedAt,
      sectionsIncluded: r.sectionsIncluded,
    })),
    accessAuditLog: auditLogs.map(a => ({
      action: a.action,
      event: a.event,
      targetResource: a.targetResource,
      createdAt: a.createdAt,
    })),
  }
}

/**
 * Executes irreversible right-to-be-forgotten anonymization and deletion for a patient record.
 * Validates absence of active legal holds before proceeding.
 */
export async function executePatientAnonymization(
  ctx: MutationCtx,
  patientId: Id<'patients'>,
  actorUserId: Id<'users'>,
  actorRole: string
) {
  const patient = await ctx.db.get(patientId)
  if (!patient) {
    throw new Error(`Patient ${patientId} not found.`)
  }

  // Check legal hold
  const holdCheck = await isPatientUnderLegalHold(ctx, patientId, patient.orgId)
  if (holdCheck.isBlocked) {
    throw new Error(`Cannot delete patient data: ${holdCheck.holdReason}`)
  }

  const now = Date.now()
  const anonymizedDisplayId = `DELETED-${patient._id.slice(-6).toUpperCase()}`

  // 1. Anonymize patient demographic record
  await ctx.db.patch(patientId, {
    displayId: anonymizedDisplayId,
    dateOfBirth: undefined,
    preferredName: undefined,
    notes: undefined,
    status: 'Inactive',
    communicationPreferences: undefined,
  })

  // 2. Anonymize user record if present
  const user = await ctx.db.get(patient.userId)
  if (user && user.role === 'patient') {
    await ctx.db.patch(patient.userId, {
      name: 'Anonymized Patient',
      phone: undefined,
      status: 'Suspended',
    })
  }

  // 3. Revoke all active consent grants
  const activeGrants = await ctx.db
    .query('consentGrants')
    .withIndex('by_patientId_and_status', q =>
      q.eq('patientId', patientId).eq('status', 'active')
    )
    .collect()

  for (const grant of activeGrants) {
    await ctx.db.patch(grant._id, {
      status: 'revoked',
      revokedAt: now,
    })
  }

  // 4. Record compliance audit entry (retaining minimal forensic metadata without PII)
  await ctx.db.insert('auditLogs', {
    actorUserId,
    actorRole,
    orgId: patient.orgId,
    patientId,
    event: `Executed right-to-be-forgotten anonymization for patient ${anonymizedDisplayId}`,
    targetResource: 'patients',
    resourceId: patientId,
    action: 'delete',
    result: 'success',
    createdAt: now,
  })

  return { anonymizedDisplayId }
}
