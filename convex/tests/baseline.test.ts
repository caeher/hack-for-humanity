/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const patientIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|new_patient_baseline',
  subject: 'new_patient_baseline',
  name: 'Jordan Lee',
  email: 'jordan.lee@example.com',
}

const validSymptoms = {
  headache: 3,
  dizziness: 2,
  nausea: 1,
  lightSensitivity: 2,
  noiseSensitivity: 1,
  fatigue: 3,
  concentration: 2,
  sleepDifficulty: 2,
}

async function completeOnboarding(t: ReturnType<typeof convexTest>) {
  return await t.withIdentity(patientIdentity).mutation(api.onboarding.completeOnboarding, {
    trackingRelationship: 'patient',
    preferredName: 'Jordan',
    ageBand: '18-24',
    incidentDate: '2026-08-20',
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
}

describe('Initial recovery baseline assessment', () => {
  test('saveDraft persists progress and submitBaseline creates versioned baseline', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(patientIdentity).mutation(api.users.syncCurrentUser, {
      name: 'Jordan Lee',
    })

    const onboardingResult = await completeOnboarding(t)
    expect(onboardingResult.nextRoute).toBe('/patient/assessment')

    const initialStatus = await t.withIdentity(patientIdentity).query(api.baseline.getStatus, {})
    expect(initialStatus.completed).toBe(false)

    await t.withIdentity(patientIdentity).mutation(api.baseline.saveDraft, {
      step: 2,
      startedAt: Date.now() - 120000,
      incidentDate: '2026-08-20',
      incidentContext: 'Hit head during soccer practice and felt dazed afterward.',
      diagnosisStatus: 'unsure',
      symptoms: { headache: 3, dizziness: 2 },
    })

    const draft = await t.withIdentity(patientIdentity).query(api.baseline.getDraft, {})
    expect(draft?.step).toBe(2)
    expect(draft?.symptoms?.headache).toBe(3)

    const startedAt = Date.now() - 180000
    const submitResult = await t.withIdentity(patientIdentity).mutation(api.baseline.submitBaseline, {
      incidentDate: '2026-08-20',
      incidentContext: 'Hit head during soccer practice and felt dazed afterward.',
      diagnosisStatus: 'unsure',
      symptoms: validSymptoms,
      skippedFields: [{ fieldId: 'careReceived', reason: 'Prefer not to answer right now' }],
      dangerSigns: [],
      completionDurationMs: 180000,
      startedAt,
    })

    expect(submitResult.blocked).toBe(false)
    expect(submitResult.baselineId).toBeDefined()
    expect(submitResult.nextRoute).toBe('/patient/check-in')

    const status = await t.withIdentity(patientIdentity).query(api.baseline.getStatus, {})
    expect(status.completed).toBe(true)
    expect(status.currentBaselineVersion).toBe(1)

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient?.baselineCompletedAt).toBeDefined()

    const baseline = await t
      .withIdentity(patientIdentity)
      .query(api.baseline.getCurrentForPatient, { patientId: patient!._id })
    expect(baseline?.version).toBe(1)
    expect(baseline?.symptomTotal).toBe(16)
    expect(baseline?.isCurrent).toBe(true)
  })

  test('rejects out-of-range symptom ratings', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    await t.withIdentity(patientIdentity).mutation(api.users.syncCurrentUser, { name: 'Jordan Lee' })
    await completeOnboarding(t)

    await expect(
      t.withIdentity(patientIdentity).mutation(api.baseline.submitBaseline, {
        incidentDate: '2026-08-20',
        incidentContext: 'Hit head during soccer practice and felt dazed afterward.',
        diagnosisStatus: 'unsure',
        symptoms: { ...validSymptoms, headache: 7 },
        skippedFields: [],
        dangerSigns: [],
        completionDurationMs: 120000,
        startedAt: Date.now() - 120000,
      })
    ).rejects.toThrow(/out of bounds/i)
  })

  test('blocks completion when danger signs are reported and creates safety evaluation', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    await t.withIdentity(patientIdentity).mutation(api.users.syncCurrentUser, { name: 'Jordan Lee' })
    await completeOnboarding(t)

    const result = await t.withIdentity(patientIdentity).mutation(api.baseline.submitBaseline, {
      incidentDate: '2026-08-20',
      incidentContext: 'Hit head during soccer practice and felt dazed afterward.',
      diagnosisStatus: 'unsure',
      symptoms: validSymptoms,
      skippedFields: [],
      dangerSigns: ['repeated-vomiting'],
      completionDurationMs: 150000,
      startedAt: Date.now() - 150000,
    })

    expect(result.blocked).toBe(true)
    expect(result.safetyResult.status).toBe('emergency')
    expect(result.baselineId).toBeUndefined()

    const status = await t.withIdentity(patientIdentity).query(api.baseline.getStatus, {})
    expect(status.completed).toBe(false)
  })

  test('correctBaseline creates a new version with audit trail', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    await t.withIdentity(patientIdentity).mutation(api.users.syncCurrentUser, { name: 'Jordan Lee' })
    await completeOnboarding(t)

    await t.withIdentity(patientIdentity).mutation(api.baseline.submitBaseline, {
      incidentDate: '2026-08-20',
      incidentContext: 'Hit head during soccer practice and felt dazed afterward.',
      diagnosisStatus: 'unsure',
      symptoms: validSymptoms,
      skippedFields: [],
      dangerSigns: [],
      completionDurationMs: 120000,
      startedAt: Date.now() - 120000,
    })

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    const corrected = await t.withIdentity(patientIdentity).mutation(api.baseline.correctBaseline, {
      patientId: patient!._id,
      incidentDate: '2026-08-20',
      incidentContext: 'Updated context: soccer header collision with brief dizziness.',
      diagnosisStatus: 'yes',
      symptoms: { ...validSymptoms, headache: 2 },
      skippedFields: [],
      dangerSigns: [],
      correctionReason: 'Corrected headache severity after reviewing notes with clinician.',
      completionDurationMs: 90000,
      startedAt: Date.now() - 90000,
    })

    expect(corrected.blocked).toBe(false)
    expect(corrected.baselineId).toBeDefined()

    const baseline = await t
      .withIdentity(patientIdentity)
      .query(api.baseline.getCurrentForPatient, { patientId: patient!._id })
    expect(baseline?.version).toBe(2)
    expect(baseline?.symptomTotal).toBe(15)
  })
})
