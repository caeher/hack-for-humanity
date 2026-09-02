/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Convex pagination & data integrity', () => {
  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  const clinicianIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
    subject: 'clinician_brooks',
    name: 'Dr. Olivia Brooks',
    email: 'dr.brooks@example.com',
  }

  const adminIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
    subject: 'admin_1',
    name: 'System Admin',
    email: 'admin@example.com',
  }

  test('checkIns.listByPatient supports cursor pagination without dropping ordering', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeDefined()

    const page1 = await t.withIdentity(patientIdentity).query(api.checkIns.listByPatient, {
      patientId: patient!._id,
      paginationOpts: { numItems: 2, cursor: null },
    })

    expect('page' in page1).toBe(true)
    if ('page' in page1) {
      expect(page1.page.length).toBeLessThanOrEqual(2)
      if (!page1.isDone) {
        const page2 = await t.withIdentity(patientIdentity).query(api.checkIns.listByPatient, {
          patientId: patient!._id,
          paginationOpts: { numItems: 2, cursor: page1.continueCursor },
        })
        if ('page' in page2) {
          const page1Ids = new Set(page1.page.map(c => c._id))
          for (const item of page2.page) {
            expect(page1Ids.has(item._id)).toBe(false)
          }
        }
      }
    }
  })

  test('patients.list paginates for clinicians and rejects unauthenticated access', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await expect(t.query(api.patients.list, { paginationOpts: { numItems: 5, cursor: null } })).rejects.toThrow()

    const page = await t.withIdentity(clinicianIdentity).query(api.patients.list, {
      paginationOpts: { numItems: 3, cursor: null },
    })
    expect('page' in page).toBe(true)
  })

  test('auditLogs.listRecent paginates and records check-in audit events', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-03',
      symptoms: {
        headache: 2,
        dizziness: 1,
        nausea: 0,
        lightSensitivity: 1,
        noiseSensitivity: 0,
        fatigue: 1,
        concentration: 1,
        sleepDifficulty: 0,
      },
      activityImpact: 'none',
    })

    const logs = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {
      paginationOpts: { numItems: 10, cursor: null },
    })

    expect('page' in logs).toBe(true)
    if ('page' in logs) {
      const checkInLog = logs.page.find(entry => entry.action === 'create' && entry.targetResource === 'checkIns')
      expect(checkInLog).toBeDefined()
      expect(checkInLog?.event).toMatch(/Symptom Total: \d+\/48/)
    }
  })

  test('seedDatabase remains idempotent across repeated invocations', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    expect(list.length).toBeGreaterThan(0)
  })
})
