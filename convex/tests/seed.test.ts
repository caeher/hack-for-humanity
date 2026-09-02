/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Synthetic Concussion Seed Dataset & Determinism (Issue #7)', () => {
  test('seeds complete longitudinal concussion database and enforces idempotency', async () => {
    const t = convexTest(schema, modules)

    // 1. First Seed Run
    const firstResult = await t.mutation(api.seed.seedDatabase, {})
    expect(firstResult.success).toBe(true)
    expect(firstResult.message).toContain('seeded successfully')

    // Capture baseline counts
    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    const usersFirst = await t.withIdentity(adminIdentity).query(api.users.list, {})
    const patientsFirst = await t.withIdentity(adminIdentity).query(api.patients.list, {})
    const alertsFirst = await t.withIdentity(adminIdentity).query(api.alerts.list, {
      paginationOpts: { numItems: 50, cursor: null },
    })
    const auditLogsFirst = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {})

    const usersCount1 = Array.isArray(usersFirst) ? usersFirst.length : usersFirst.page.length
    const patientsCount1 = Array.isArray(patientsFirst) ? patientsFirst.length : patientsFirst.page.length
    const alertsCount1 = alertsFirst.page.length
    const auditCount1 = Array.isArray(auditLogsFirst) ? auditLogsFirst.length : auditLogsFirst.page.length

    expect(usersCount1).toBeGreaterThanOrEqual(11) // admin, 2 clinicians, 6 patients, 2 caregivers
    expect(patientsCount1).toBe(6) // Maya, Daniel, Ava, James, Nora, Leo

    // 2. Second Seed Run (Idempotency Check)
    const secondResult = await t.mutation(api.seed.seedDatabase, {})
    expect(secondResult.success).toBe(true)

    const usersSecond = await t.withIdentity(adminIdentity).query(api.users.list, {})
    const patientsSecond = await t.withIdentity(adminIdentity).query(api.patients.list, {})
    const alertsSecond = await t.withIdentity(adminIdentity).query(api.alerts.list, {
      paginationOpts: { numItems: 50, cursor: null },
    })
    const auditLogsSecond = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {})

    const usersCount2 = Array.isArray(usersSecond) ? usersSecond.length : usersSecond.page.length
    const patientsCount2 = Array.isArray(patientsSecond) ? patientsSecond.length : patientsSecond.page.length
    const alertsCount2 = alertsSecond.page.length
    const auditCount2 = Array.isArray(auditLogsSecond) ? auditLogsSecond.length : auditLogsSecond.page.length

    // Exact count matching proves strict idempotency
    expect(usersCount2).toBe(usersCount1)
    expect(patientsCount2).toBe(patientsCount1)
    expect(alertsCount2).toBe(alertsCount1)
    expect(auditCount2).toBe(auditCount1)
  })

  test('reconciles 8-symptom ratings mathematically with 0–48 symptom totals', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    const patients = ['P-1042', 'P-1038', 'P-1055', 'P-1027']

    for (const displayId of patients) {
      const patient = await t
        .withIdentity(adminIdentity)
        .query(api.patients.getByDisplayId, { displayId })
      expect(patient).toBeDefined()

      const checkIns = await t
        .withIdentity(adminIdentity)
        .query(api.checkIns.listByPatient, { patientId: patient!._id })

      const checkInList = Array.isArray(checkIns) ? checkIns : checkIns.page
      expect(checkInList.length).toBeGreaterThan(0)

      for (const checkIn of checkInList) {
        const s = checkIn.symptoms
        const computedSum =
          s.headache +
          s.dizziness +
          s.nausea +
          s.lightSensitivity +
          s.noiseSensitivity +
          s.fatigue +
          s.concentration +
          s.sleepDifficulty

        // Mathematical equivalence
        expect(checkIn.symptomTotal).toBe(computedSum)
        expect(checkIn.symptomTotal).toBeGreaterThanOrEqual(0)
        expect(checkIn.symptomTotal).toBeLessThanOrEqual(48)

        // All symptom ratings within 0-6 Likert scale
        for (const val of Object.values(s)) {
          expect(val).toBeGreaterThanOrEqual(0)
          expect(val).toBeLessThanOrEqual(6)
          expect(Number.isInteger(val)).toBe(true)
        }
      }
    }
  })

  test('validates longitudinal recovery trajectory and authentic missing data gaps for Maya Chen (P-1042)', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
      subject: 'patient_maya',
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
    }

    const maya = await t.withIdentity(mayaIdentity).query(api.patients.getMePatient, {})
    expect(maya?.displayId).toBe('P-1042')

    const checkIns = await t
      .withIdentity(mayaIdentity)
      .query(api.checkIns.listByPatient, { patientId: maya!._id })
    const checkInList = Array.isArray(checkIns) ? checkIns : checkIns.page

    // 12 check-ins over 14 days demonstrating two authentic non-interpolated missing day gaps
    expect(checkInList.length).toBe(12)

    // Verify downward progression from initial 27 to latest 15
    const latest = checkInList[0] // sorted desc
    const oldest = checkInList[checkInList.length - 1]

    expect(oldest.date).toBe('2026-08-19')
    expect(oldest.symptomTotal).toBe(27)
    expect(latest.date).toBe('2026-09-01')
    expect(latest.symptomTotal).toBe(15)

    // Verify recovery trends data points
    const trends = await t
      .withIdentity(mayaIdentity)
      .query(api.recoveryTrends.listByPatient, { patientId: maya!._id })
    expect(trends.length).toBe(7)
    expect(trends[trends.length - 1].symptomTotal).toBe(15)

    // Verify activity exposures
    const exposures = await t
      .withIdentity(mayaIdentity)
      .query(api.activityExposures.listByPatient, { patientId: maya!._id })
    expect(exposures.length).toBe(12)
  })

  test('validates pediatric Return-to-Learn scenario with proxy caregiver consent (Leo Miller P-1055)', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const sarahIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_sarah',
      subject: 'caregiver_sarah',
      name: 'Sarah Miller',
      email: 'sarah.miller@example.com',
    }

    // Caregiver Sarah Miller lists accessible patients
    const accessible = await t
      .withIdentity(sarahIdentity)
      .query(api.consent.listAccessiblePatients, {})

    expect(accessible.length).toBe(1)
    expect(accessible[0].displayId).toBe('P-1055')
    expect(accessible[0].relationship).toBe('Parent / Guardian')
    expect(accessible[0].scopes).toContain('log_proxy')

    // Sarah views Leo's check-ins logged by proxy
    const checkIns = await t
      .withIdentity(sarahIdentity)
      .query(api.checkIns.listByPatient, { patientId: accessible[0].patientId })
    const checkInList = Array.isArray(checkIns) ? checkIns : checkIns.page
    expect(checkInList.length).toBe(10)

    // Sarah views Return-to-Learn care plan accommodations
    const plans = await t
      .withIdentity(sarahIdentity)
      .query(api.carePlans.listByPatient, { patientId: accessible[0].patientId })
    expect(plans.some(p => p.category === 'accommodations')).toBe(true)
  })

  test('exercises backend Safety Engine trigger for acute danger signs (James Kim P-1027)', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

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

    const james = await t
      .withIdentity(adminIdentity)
      .query(api.patients.getByDisplayId, { displayId: 'P-1027' })
    expect(james).toBeDefined()

    // Clinician reviews alerts and verifies High severity Tier 1 safety trigger
    const alerts = await t.withIdentity(clinicianIdentity).query(api.alerts.list, {
      paginationOpts: { numItems: 50, cursor: null },
    })
    const alertList = alerts.page

    const jamesAlert = alertList.find(a => a.alert.patientId === james!._id)
    expect(jamesAlert).toBeDefined()
    expect(jamesAlert?.alert.severity).toBe('High')
    expect(jamesAlert?.alert.status).toBe('active')
    expect(jamesAlert?.alert.dangerSigns).toContain('Repeated vomiting or nausea')
    expect(jamesAlert?.alert.dangerSigns).toContain(
      'Extreme drowsiness, loss of consciousness, or inability to wake up'
    )
  })

  test('validates simulated demo labeling on synthetic entities', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    const mayaPatient = await t
      .withIdentity(adminIdentity)
      .query(api.patients.getByDisplayId, { displayId: 'P-1042' })

    const encounters = await t
      .withIdentity(adminIdentity)
      .query(api.encounters.listByPatient, {
        patientId: mayaPatient!._id,
      })

    const encounterList = Array.isArray(encounters) ? encounters : encounters.page
    expect(encounterList.length).toBeGreaterThan(0)
    for (const enc of encounterList) {
      expect(enc.notes).toContain('[SIMULATED DEMO]')
    }

    const auditLogs = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {})
    const auditList = Array.isArray(auditLogs) ? auditLogs : auditLogs.page
    for (const log of auditList) {
      expect(log.event).toContain('[SIMULATED DEMO]')
    }
  })
})
