/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'
import { SYMPTOM_METHODOLOGY_VERSION } from '../lib/symptomMethodology'

const modules = import.meta.glob('../**/*.ts')

const patientIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
  subject: 'patient_maya',
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
}

describe('symptomSummaries API', () => {
  it('returns versioned methodology metadata', async () => {
    const t = convexTest(schema, modules)
    const info = await t.query(api.symptomSummaries.getMethodologyInfo, {})

    expect(info.version).toBe(SYMPTOM_METHODOLOGY_VERSION)
    expect(info.metricName).toContain('Patient-Reported Symptom Total')
    expect(info.notRecoveryScore).not.toMatch(/^Recovery Score/i)
  })

  it('stores methodologyVersion on submitted check-ins', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    const result = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-10',
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
    })

    const checkIn = await t.run(async ctx => ctx.db.get('checkIns', result.checkInId))
    expect(checkIn?.methodologyVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
    expect(checkIn?.symptomTotal).toBe(10)
  })

  it('computes descriptive trend summary from seeded check-ins', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})
    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    const trend = await t
      .withIdentity(patientIdentity)
      .query(api.symptomSummaries.getTrendSummary, { patientId: patient!._id })

    expect(trend.readiness).toBe('sufficient')
    expect(trend.direction).toBe('decreasing')
    expect(trend.methodologyVersion).toBe(SYMPTOM_METHODOLOGY_VERSION)
    expect(trend.summaryText).toMatch(/decreased/i)
    expect(trend.disclaimerText).toContain('do not establish medical causation')
  })
})
