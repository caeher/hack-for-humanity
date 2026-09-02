/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'
import {
  buildRecoveryReportPayload,
  RECOVERY_REPORT_SCHEMA_VERSION,
  resolveIncludedSections,
  resolveReportAccess,
} from '../lib/recoveryReportLogic'
import { SYMPTOM_METHODOLOGY_VERSION } from '../lib/symptomMethodology'

const modules = import.meta.glob('../**/*.ts')

describe('recoveryReportLogic', () => {
  test('caregiver without receive_alerts omits safety section server-side', () => {
    const access = resolveReportAccess('caregiver', ['view_symptoms', 'view_trends', 'view_plan'])
    const { included, omitted } = resolveIncludedSections(access)

    expect(included).not.toContain('safety')
    expect(included).not.toContain('encounters')
    expect(omitted.some(item => item.section === 'safety')).toBe(true)
    expect(omitted.some(item => item.section === 'encounters')).toBe(true)
  })

  test('clinician access includes clinical encounter section', () => {
    const access = resolveReportAccess('clinician', null)
    const { included } = resolveIncludedSections(access)
    expect(included).toContain('encounters')
  })
})

describe('recoveryReports', () => {
  const mayaIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  const davidIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
    subject: 'caregiver_david',
    name: 'David Chen',
    email: 'david.chen@example.com',
  }

  test('patient generates versioned report reconciled with seeded check-ins', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(mayaIdentity).query(api.patients.getMePatient, {})
    expect(patient).not.toBeNull()

    const result = await t.withIdentity(mayaIdentity).mutation(api.recoveryReports.generate, {
      patientId: patient!._id,
      today: '2026-09-01',
      range: '14',
    })

    expect(result.reportVersion).toBe(RECOVERY_REPORT_SCHEMA_VERSION)
    expect(result.payload.metadata.dataSource).toBe('live')
    expect(result.payload.symptoms?.methodologyVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
    expect(result.payload.symptoms?.checkInCount).toBe(12)
    expect(result.payload.symptoms?.latestSymptomTotal).toBe(15)
    expect(result.payload.disclaimer).toMatch(/does not diagnose/)

    const stored = await t.withIdentity(mayaIdentity).query(api.recoveryReports.getById, {
      reportId: result.reportId,
    })
    expect(stored?.contentHash).toBe(result.contentHash)
    expect(stored?.sourceRecordRefs.length).toBeGreaterThan(0)
  })

  test('report generation writes audit log entry', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(mayaIdentity).query(api.patients.getMePatient, {})
    const result = await t.withIdentity(mayaIdentity).mutation(api.recoveryReports.generate, {
      patientId: patient!._id,
      today: '2026-09-02',
      range: '7',
    })

    const auditLogs = await t.run(async ctx => {
      return await ctx.db
        .query('auditLogs')
        .withIndex('by_targetResource', q => q.eq('targetResource', 'recoveryReports'))
        .collect()
    })

    expect(auditLogs.some(log => log.resourceId === result.reportId && log.action === 'report_generate')).toBe(
      true
    )
  })

  test('caregiver report omits encounters and unauthorized sections', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(mayaIdentity).query(api.patients.getMePatient, {})

    const result = await t.withIdentity(davidIdentity).mutation(api.recoveryReports.generate, {
      patientId: patient!._id,
      today: '2026-09-02',
      range: '14',
    })

    expect(result.payload.encounters).toBeNull()
    expect(result.payload.sectionsOmitted.some((item: { section: string }) => item.section === 'Clinical encounters')).toBe(true)
    expect(result.payload.symptoms?.checkInCount).toBeGreaterThan(0)
  })

  test('buildRecoveryReportPayload uses check-in totals from source records', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(mayaIdentity).query(api.patients.getMePatient, {})
    const checkInsRaw = await t.withIdentity(mayaIdentity).query(api.checkIns.listByPatient, {
      patientId: patient!._id,
    })
    const checkIns = Array.isArray(checkInsRaw) ? checkInsRaw : checkInsRaw.page
    const latest = checkIns[0]

    const built = buildRecoveryReportPayload({
      patient: patient!,
      patientUser: null,
      episode: null,
      checkIns,
      exposures: [],
      encounters: [],
      carePlans: [],
      amendments: [],
      safetyEvaluations: [],
      access: resolveReportAccess('patient', null),
      range: '14',
      today: '2026-09-02',
      timeZone: 'UTC',
      dataCutoffAt: Date.now(),
      generatedAt: Date.now(),
      requestedByUserId: patient!.userId,
      requestedByRole: 'patient',
      requestedByName: 'Maya Chen',
      dataSource: 'live',
    })

    expect(built.payload.symptoms?.latestSymptomTotal).toBe(latest.symptomTotal)
  })
})
