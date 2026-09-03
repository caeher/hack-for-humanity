/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'
import { isCoreTrackingFeature } from '../../lib/ai/killSwitch'

const modules = import.meta.glob('../**/*.ts')

const patientIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
  subject: 'patient_maya',
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
}

const adminIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
  subject: 'admin_1',
  name: 'System Admin',
  email: 'admin@example.com',
}

const symptomsData = {
  headache: 1,
  dizziness: 0,
  nausea: 0,
  lightSensitivity: 0,
  noiseSensitivity: 0,
  fatigue: 1,
  concentration: 1,
  sleepDifficulty: 1,
}

describe('System Resilience & Graceful Degradation', () => {
  test('core tracking features are explicitly separated from AI-dependent features', () => {
    expect(isCoreTrackingFeature('check_in')).toBe(true)
    expect(isCoreTrackingFeature('dashboard')).toBe(true)
    expect(isCoreTrackingFeature('timeline')).toBe(true)
    expect(isCoreTrackingFeature('care_plan')).toBe(true)
    expect(isCoreTrackingFeature('reports')).toBe(true)
    expect(isCoreTrackingFeature('nlp')).toBe(false)
    expect(isCoreTrackingFeature('rag')).toBe(false)
    expect(isCoreTrackingFeature('insights')).toBe(false)
  })

  test('daily check-ins and recovery reports continue successfully when AI is disabled', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    // Disable AI globally using admin kill switch
    await t.withIdentity(adminIdentity).mutation(api.aiGovernance.setKillSwitch, {
      scope: 'global',
      enabled: false,
    })

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeDefined()

    // 1. Submit check-in — MUST SUCCEED with zero reliance on AI
    const checkInResult = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-08',
      symptoms: symptomsData,
      activityImpact: 'none',
    })
    expect(checkInResult.checkInId).toBeDefined()
    expect(checkInResult.safetyResult.status).toBe('safe')

    // 2. Generate recovery report — MUST SUCCEED using deterministic clinical records
    const report = await t.withIdentity(patientIdentity).mutation(api.recoveryReports.generate, {
      patientId: patient!._id,
      today: '2026-09-08',
      range: '30',
    })
    expect(report.reportId).toBeDefined()
  })

  test('education assistant returns graceful fallback response when AI is disabled', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    // Disable AI globally using admin kill switch
    await t.withIdentity(adminIdentity).mutation(api.aiGovernance.setKillSwitch, {
      scope: 'global',
      enabled: false,
    })

    // Query education assistant
    const response = await t.withIdentity(patientIdentity).mutation(api.educationAssistant.askQuestion, {
      queryText: 'What are common sleep strategies during recovery?',
    })

    // Must return fallback kind with safe, reassuring explanation rather than throwing an uncaught error
    expect(response.kind).toBe('ai_disabled_fallback')
    expect(response.answerText).toContain('temporarily unavailable')
    expect(response.auditOutcome).toBe('blocked_kill_switch')
  })
})
