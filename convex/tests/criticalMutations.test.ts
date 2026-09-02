/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

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

const validSymptoms = {
  headache: 2,
  dizziness: 1,
  nausea: 0,
  lightSensitivity: 1,
  noiseSensitivity: 0,
  fatigue: 1,
  concentration: 1,
  sleepDifficulty: 0,
}

describe('Critical mutation authorization & validation matrix', () => {
  test('checkIns.submitCheckIn: success, validation failure, and unauthorized', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    const checkInId = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-04',
      symptoms: validSymptoms,
      activityImpact: 'none',
    })
    expect(checkInId).toBeDefined()

    const duplicateId = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-04',
      symptoms: validSymptoms,
      activityImpact: 'none',
    })
    expect(duplicateId).toBe(checkInId)

    await expect(
      t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
        patientId: patient!._id,
        date: '2026-09-05',
        symptoms: { ...validSymptoms, headache: 9 },
        activityImpact: 'none',
      })
    ).rejects.toThrow(/out of bounds/)

    await expect(
      t.mutation(api.checkIns.submitCheckIn, {
        patientId: patient!._id,
        date: '2026-09-06',
        symptoms: validSymptoms,
        activityImpact: 'none',
      })
    ).rejects.toThrow()
  })

  test('alerts.acknowledgeAlert: success and unauthorized', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const alerts = await t.withIdentity(clinicianIdentity).query(api.alerts.list, {})
    const list = Array.isArray(alerts) ? alerts : alerts.page
    const active = list.find(a => a.status === 'active')
    expect(active).toBeDefined()

    await t.withIdentity(clinicianIdentity).mutation(api.alerts.acknowledgeAlert, {
      alertId: active!._id,
    })

    await expect(
      t.withIdentity(patientIdentity).mutation(api.alerts.acknowledgeAlert, {
        alertId: active!._id,
      })
    ).rejects.toThrow()
  })

  test('encounters.createEncounter: validation and clinician-only access', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]
    expect(target).toBeDefined()

    const encounterId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.createEncounter, {
      patientId: target!._id,
      encounterType: 'in-person',
      diagnosis: 'Concussion follow-up',
      datetime: '2026-09-04T14:00:00.000Z',
      clinicalSummary: 'Patient reports improving headache severity.',
      notes: 'Routine follow-up after symptom plateau.',
    })
    expect(encounterId).toBeDefined()

    await expect(
      t.withIdentity(patientIdentity).mutation(api.encounters.createEncounter, {
        patientId: target!._id,
        encounterType: 'in-person',
        diagnosis: 'Concussion follow-up',
        datetime: '2026-09-04T14:00:00.000Z',
        clinicalSummary: 'Should be denied.',
        notes: 'Should be denied.',
      })
    ).rejects.toThrow()
  })

  test('users.inviteUser: admin success and patient unauthorized', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const invited = await t.withIdentity(adminIdentity).mutation(api.users.inviteUser, {
      name: 'Test Clinician',
      email: 'test.clinician@hospital.org',
      role: 'clinician',
    })
    expect(invited).toBeDefined()

    await expect(
      t.withIdentity(patientIdentity).mutation(api.users.inviteUser, {
        name: 'Blocked Invite',
        email: 'blocked@example.com',
        role: 'admin',
      })
    ).rejects.toThrow()
  })

  test('safety.evaluateAiQuerySafety: blocks diagnostic queries for patients', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    const result = await t.withIdentity(patientIdentity).mutation(api.safety.evaluateAiQuerySafety, {
      patientId: patient!._id,
      queryText: 'Do I have post-concussion syndrome?',
    })

    expect(result.status).not.toBe('safe')
    expect(result.blockedActions).toContain('invoke_llm')
  })

  test('consent.revokeConsent immediately blocks caregiver access', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    const grants = await t
      .withIdentity(patientIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: patient!._id })
    expect(grants.length).toBeGreaterThan(0)

    await t.withIdentity(patientIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: grants[0]._id,
    })

    const caregiverIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
      subject: 'caregiver_david',
      name: 'David Chen',
      email: 'david.chen@example.com',
    }

    await expect(
      t
        .withIdentity(caregiverIdentity)
        .query(api.checkIns.listByPatient, { patientId: patient!._id })
    ).rejects.toThrow()
  })
})
