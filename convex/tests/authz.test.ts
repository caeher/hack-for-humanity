/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Convex API Authorization & RBAC', () => {
  test('unauthenticated caller is rejected from accessing protected queries', async () => {
    const t = convexTest(schema, modules)
    await expect(t.query(api.patients.list, {})).rejects.toThrow(
      /Unauthorized|Authentication required/
    )
  })

  test('admin user can seed the database and list caseload patients', async () => {
    const t = convexTest(schema, modules)
    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    // Seed database
    const seedResult = await t.mutation(api.seed.seedDatabase, {})
    expect(seedResult.success).toBe(true)

    // Admin queries patient list
    const patients = await t.withIdentity(adminIdentity).query(api.patients.list, {})
    expect(Array.isArray(patients) ? patients.length : patients.page.length).toBeGreaterThan(0)
  })

  test('patient can submit 8-symptom check-in and retrieve their history', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patientIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
      subject: 'patient_maya',
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
    }

    // Get Maya's patient profile
    const mayaPatient = await t
      .withIdentity(patientIdentity)
      .query(api.patients.getMePatient, {})
    expect(mayaPatient).not.toBeNull()
    expect(mayaPatient?.displayId).toBe('P-1042')

    // Submit 8-symptom check-in as Maya Chen
    const checkInId = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: mayaPatient!._id,
      date: '2026-09-02',
      symptoms: {
        headache: 2,
        dizziness: 1,
        nausea: 0,
        lightSensitivity: 2,
        noiseSensitivity: 1,
        fatigue: 2,
        concentration: 1,
        sleepDifficulty: 1,
      },
      activityImpact: 'no',
      dangerSigns: [],
      note: 'Feeling clearer today.',
    })
    expect(checkInId).toBeDefined()

    // Get latest check-in
    const latest = await t
      .withIdentity(patientIdentity)
      .query(api.checkIns.getLatest, { patientId: mayaPatient!._id })
    expect(latest?.symptomTotal).toBe(10)
    expect(latest?.symptoms.headache).toBe(2)
  })

  test('non-admin user is rejected from viewing audit logs', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patientIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
      subject: 'patient_maya',
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
    }

    await expect(
      t.withIdentity(patientIdentity).query(api.auditLogs.listRecent, {})
    ).rejects.toThrow(/Forbidden|Requires one of \[admin\] roles/)
  })
})

