/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Clinician caseload & alerts', () => {
  const clinicianIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
    subject: 'clinician_brooks',
    name: 'Dr. Olivia Brooks',
    email: 'dr.brooks@example.com',
  }

  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  test('clinician caseload is org-scoped with stable pagination', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const page = await t.withIdentity(clinicianIdentity).query(api.caseload.listPatients, {
      today: '2026-09-02',
      paginationOpts: { numItems: 3, cursor: null },
    })

    expect(page.page.length).toBeGreaterThan(0)
    expect(page.page[0].displayId).toBeDefined()
    expect(page.page[0].riskRationale.length).toBeGreaterThan(10)
    expect(['Routine', 'Review', 'Safety']).toContain(page.page[0].attention)
  })

  test('clinician cannot access alerts outside organization membership', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    const outsiderIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|outsider_clinician',
      subject: 'outsider_clinician',
      name: 'Dr. Outside Org',
      email: 'outside@example.com',
    }

    await t.withIdentity(adminIdentity).mutation(api.users.inviteUser, {
      name: 'Dr. Outside Org',
      email: 'outside@example.com',
      role: 'clinician',
    })

    await t.withIdentity(outsiderIdentity).mutation(api.users.syncCurrentUser, {})

    await expect(
      t.withIdentity(outsiderIdentity).query(api.alerts.list, {
        paginationOpts: { numItems: 5, cursor: null },
      })
    ).rejects.toThrow(/No active clinician organization membership/)
  })

  test('alert actions are audited and org-scoped', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const alerts = await t.withIdentity(clinicianIdentity).query(api.alerts.list, {
      paginationOpts: { numItems: 10, cursor: null },
    })

    const active = alerts.page.find(item => item.alert.status === 'active')
    expect(active).toBeDefined()

    await t.withIdentity(clinicianIdentity).mutation(api.alerts.acknowledgeAlert, {
      alertId: active!.alert._id,
    })

    await t.withIdentity(clinicianIdentity).mutation(api.alerts.snoozeAlert, {
      alertId: active!.alert._id,
      snoozeUntil: Date.now() + 60_000,
      reason: 'Awaiting caregiver callback confirmation.',
    })

    const logs = await t
      .withIdentity({
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
        subject: 'admin_1',
        name: 'System Admin',
        email: 'admin@example.com',
      })
      .query(api.auditLogs.listRecent, { paginationOpts: { numItems: 20, cursor: null } })

    const logPage = 'page' in logs ? logs.page : logs
    const alertLogs = logPage.filter(entry => entry.targetResource === 'alerts')
    expect(alertLogs.some(entry => entry.event.includes('Acknowledged'))).toBe(true)
    expect(alertLogs.some(entry => entry.event.includes('Snoozed alert'))).toBe(true)
  })

  test('safety-triggered alerts include provenance for clinicians', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-04',
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
    })

    const alerts = await t.withIdentity(clinicianIdentity).query(api.alerts.list, {
      severity: 'High',
      paginationOpts: { numItems: 10, cursor: null },
    })

    const safetyAlert = alerts.page.find(item => item.alert.detail.includes('Safety Engine'))
    expect(safetyAlert).toBeDefined()
    expect(safetyAlert?.provenance?.sourceKind).toBe('safety_outcome')
    expect(safetyAlert?.provenance?.evidenceReferences.length).toBeGreaterThan(0)
  })
})
