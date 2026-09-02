/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const newPatientIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|new_patient_onboard',
  subject: 'new_patient_onboard',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
}

const clinicianIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
  subject: 'clinician_brooks',
  name: 'Dr. Olivia Brooks',
  email: 'dr.brooks@example.com',
}

describe('Recovery onboarding', () => {
  test('saveDraft persists progress and completeOnboarding creates profile + episode', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(newPatientIdentity).mutation(api.users.syncCurrentUser, {
      name: 'Alex Rivera',
    })

    const initialStatus = await t
      .withIdentity(newPatientIdentity)
      .query(api.onboarding.getStatus, {})
    expect(initialStatus.completed).toBe(false)
    expect(initialStatus.hasDraft).toBe(false)

    await t.withIdentity(newPatientIdentity).mutation(api.onboarding.saveDraft, {
      step: 2,
      trackingRelationship: 'patient',
      preferredName: 'Alex',
      ageBand: '18-24',
      incidentDate: '2026-08-15',
      timeZone: 'America/New_York',
      diagnosisStatus: 'unsure',
    })

    const draft = await t.withIdentity(newPatientIdentity).query(api.onboarding.getDraft, {})
    expect(draft?.step).toBe(2)
    expect(draft?.preferredName).toBe('Alex')
    expect(draft?.diagnosisStatus).toBe('unsure')

    const statusWithDraft = await t
      .withIdentity(newPatientIdentity)
      .query(api.onboarding.getStatus, {})
    expect(statusWithDraft.hasDraft).toBe(true)

    const result = await t.withIdentity(newPatientIdentity).mutation(api.onboarding.completeOnboarding, {
      trackingRelationship: 'patient',
      preferredName: 'Alex',
      ageBand: '18-24',
      incidentDate: '2026-08-15',
      timeZone: 'America/New_York',
      diagnosisStatus: 'unsure',
      communicationPreferences: {
        emailReminders: true,
        smsReminders: false,
        weeklySummary: true,
      },
      consentAcknowledged: true,
      privacyAcknowledged: true,
      limitationsAcknowledged: true,
    })

    expect(result.nextRoute).toBe('/patient/assessment')

    const patient = await t.withIdentity(newPatientIdentity).query(api.patients.getMePatient, {})
    expect(patient).not.toBeNull()
    expect(patient?.preferredName).toBe('Alex')
    expect(patient?.diagnosisStatus).toBe('unsure')
    expect(patient?.onboardingCompletedAt).toBeDefined()
    expect(patient?.trackingRelationship).toBe('patient')

    const completedStatus = await t
      .withIdentity(newPatientIdentity)
      .query(api.onboarding.getStatus, {})
    expect(completedStatus.completed).toBe(true)
    expect(completedStatus.hasDraft).toBe(false)

    const clearedDraft = await t.withIdentity(newPatientIdentity).query(api.onboarding.getDraft, {})
    expect(clearedDraft).toBeNull()
  })

  test('completeOnboarding rejects professional enrollment for patient role', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(newPatientIdentity).mutation(api.users.syncCurrentUser, {
      name: 'Alex Rivera',
    })

    await expect(
      t.withIdentity(newPatientIdentity).mutation(api.onboarding.completeOnboarding, {
        trackingRelationship: 'professional',
        preferredName: 'Casey',
        ageBand: '25-39',
        incidentDate: '2026-08-01',
        timeZone: 'America/Chicago',
        diagnosisStatus: 'yes',
        communicationPreferences: {
          emailReminders: true,
          smsReminders: false,
          weeklySummary: false,
        },
        consentAcknowledged: true,
        privacyAcknowledged: true,
        limitationsAcknowledged: true,
      })
    ).rejects.toThrow(/clinician or administrator/)
  })

  test('completeOnboarding allows professional enrollment for clinicians', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const result = await t.withIdentity(clinicianIdentity).mutation(api.onboarding.completeOnboarding, {
      trackingRelationship: 'professional',
      preferredName: 'Jordan',
      ageBand: '13-17',
      incidentDate: '2026-08-20',
      timeZone: 'America/Los_Angeles',
      diagnosisStatus: 'no',
      communicationPreferences: {
        emailReminders: true,
        smsReminders: false,
        weeklySummary: true,
      },
      consentAcknowledged: true,
      privacyAcknowledged: true,
      limitationsAcknowledged: true,
    })

    expect(result.nextRoute).toBe('/clinician/patients')
  })

  test('completeOnboarding requires all consent acknowledgments', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(newPatientIdentity).mutation(api.users.syncCurrentUser, {
      name: 'Alex Rivera',
    })

    await expect(
      t.withIdentity(newPatientIdentity).mutation(api.onboarding.completeOnboarding, {
        trackingRelationship: 'patient',
        preferredName: 'Alex',
        ageBand: '18-24',
        incidentDate: '2026-08-15',
        timeZone: 'America/New_York',
        diagnosisStatus: 'no',
        communicationPreferences: {
          emailReminders: true,
          smsReminders: false,
          weeklySummary: true,
        },
        consentAcknowledged: false,
        privacyAcknowledged: true,
        limitationsAcknowledged: true,
      })
    ).rejects.toThrow(/consent acknowledgments/)
  })

  test('seeded patients report onboarding as complete', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const status = await t
      .withIdentity({
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        subject: 'patient_maya',
        name: 'Maya Chen',
        email: 'maya.chen@example.com',
      })
      .query(api.onboarding.getStatus, {})

    expect(status.completed).toBe(true)
  })
})
