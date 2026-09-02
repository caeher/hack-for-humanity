/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Safety Engine Convex Integration & Persistence', () => {
  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  const caregiverIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
    subject: 'caregiver_david',
    name: 'David Chen',
    email: 'david.chen@example.com',
  }

  const clinicianIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
    subject: 'clinician_brooks',
    name: 'Dr. Olivia Brooks',
    email: 'dr.brooks@example.com',
  }

  test('submitting a check-in automatically evaluates safety and persists a safety evaluation audit record', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeDefined()

    // Submit daily check-in with mild symptoms
    const checkInId = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-02',
      symptoms: {
        headache: 1,
        dizziness: 0,
        nausea: 0,
        lightSensitivity: 1,
        noiseSensitivity: 0,
        fatigue: 1,
        concentration: 1,
        sleepDifficulty: 0,
      },
      activityImpact: 'none',
      dangerSigns: [],
      note: 'Routine morning check-in.',
    })
    expect(checkInId).toBeDefined()

    // Verify safety evaluation record was generated and persisted
    const latestEvaluation = await t
      .withIdentity(patientIdentity)
      .query(api.safety.getLatestForPatient, { patientId: patient!._id })

    expect(latestEvaluation).not.toBeNull()
    expect(latestEvaluation?.targetResourceId).toBe(checkInId)
    expect(latestEvaluation?.contextType).toBe('check_in')
    expect(latestEvaluation?.status).toBe('safe')
    expect(latestEvaluation?.ruleEngineVersion).toBe('1.0.0')
  })

  test('submitting a check-in with acute danger signs triggers emergency status and creates clinical alert', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    // Submit check-in with Tier 1 CDC Danger Sign
    const checkInId = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-02',
      symptoms: {
        headache: 5,
        dizziness: 4,
        nausea: 4,
        lightSensitivity: 3,
        noiseSensitivity: 3,
        fatigue: 4,
        concentration: 3,
        sleepDifficulty: 2,
      },
      activityImpact: 'yes',
      dangerSigns: ['Repeated vomiting or nausea'],
      note: 'Felt severe nausea and vomited twice after lunch.',
    })
    expect(checkInId).toBeDefined()

    // Verify safety evaluation doc has emergency status
    const latestEvaluation = await t
      .withIdentity(patientIdentity)
      .query(api.safety.getLatestForPatient, { patientId: patient!._id })

    expect(latestEvaluation?.status).toBe('emergency')
    expect(latestEvaluation?.highestSeverity).toBe('emergency')
    expect(latestEvaluation?.primaryEscalation).toBe('emergency_911_ed')
    expect(latestEvaluation?.blockedActions).toContain('allow_routine_completion')

    // Verify clinical alert was generated in alerts table
    const alerts = await t.withIdentity(clinicianIdentity).query(api.alerts.list, {
      severity: 'High',
    })
    const alertList = Array.isArray(alerts) ? alerts : alerts.page
    expect(alertList.length).toBeGreaterThan(0)
    expect(alertList.some(a => a.detail.includes('Safety Engine'))).toBe(true)
  })

  test('getRuleRegistry returns versioned active rules with governance citations', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const registry = await t.withIdentity(clinicianIdentity).query(api.safety.getRuleRegistry, {})
    expect(registry.version).toBe('1.0.0')
    expect(registry.rules.length).toBeGreaterThanOrEqual(15)

    const rule = registry.rules.find(r => r.ruleId === 'RULE-RED-FLAG-VOMITING')
    expect(rule).toBeDefined()
    expect(rule?.evidenceSource.authority).toBe('CDC HEADS UP')
    expect(rule?.evidenceSource.approvedBy).toContain('Dr. Sarah Lin')
  })

  test('enforces RBAC and consent permissions on safety evaluation queries', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    // 1. Patient can view self evaluations
    const patientEvals = await t
      .withIdentity(patientIdentity)
      .query(api.safety.listByPatient, { patientId: patient!._id })
    expect(patientEvals).toBeDefined()

    // 2. Caregiver David Chen (with active consent) can view Maya's evaluations
    const caregiverEvals = await t
      .withIdentity(caregiverIdentity)
      .query(api.safety.listByPatient, { patientId: patient!._id })
    expect(caregiverEvals).toBeDefined()

    // 3. Unauthorized caregiver without consent is rejected
    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }
    const danielPatient = await t
      .withIdentity(adminIdentity)
      .query(api.patients.getByDisplayId, { displayId: 'P-1038' })

    await expect(
      t
        .withIdentity(caregiverIdentity)
        .query(api.safety.listByPatient, { patientId: danielPatient!._id })
    ).rejects.toThrow(/Forbidden: Caregiver does not have active consent/)
  })

  test('evaluateAiQuerySafety screens queries and records audit document', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    // Call evaluateAiQuerySafety with diagnostic question
    const result = await t.withIdentity(patientIdentity).mutation(api.safety.evaluateAiQuerySafety, {
      queryText: 'Can you diagnose if I have a grade 2 concussion?',
      patientId: patient!._id,
    })

    expect(result.status).toBe('elevated')
    expect(result.blockedActions).toContain('invoke_llm')
    expect(result.matchedRules[0].outputCode).toBe('GUARDRAIL_DIAGNOSTIC_ATTEMPT')
  })
})
