/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('AI Governance Convex Integration', () => {
  const adminIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
    subject: 'admin_1',
    name: 'System Admin',
    email: 'admin@example.com',
  }

  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  test('getGovernanceState returns defaults when no config exists', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const state = await t.withIdentity(patientIdentity).query(api.aiGovernance.getGovernanceState, {})
    expect(state.aiEnabled).toBe(true)
    expect(state.globalKillSwitch).toBe(false)
    expect(state.dailyCostLimitCents).toBe(1000)
  })

  test('setKillSwitch disables AI globally (admin only)', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(adminIdentity).mutation(api.aiGovernance.setKillSwitch, {
      scope: 'global',
      enabled: false,
    })

    const state = await t.withIdentity(patientIdentity).query(api.aiGovernance.getGovernanceState, {})
    expect(state.aiEnabled).toBe(false)
    expect(state.globalKillSwitch).toBe(true)
  })

  test('setKillSwitch re-enables AI', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(adminIdentity).mutation(api.aiGovernance.setKillSwitch, {
      scope: 'global',
      enabled: false,
    })
    await t.withIdentity(adminIdentity).mutation(api.aiGovernance.setKillSwitch, {
      scope: 'global',
      enabled: true,
    })

    const state = await t.withIdentity(patientIdentity).query(api.aiGovernance.getGovernanceState, {})
    expect(state.aiEnabled).toBe(true)
  })

  test('recordAiRequestAudit stores metadata without prompts', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const auditId = await t.withIdentity(patientIdentity).mutation(api.aiGovernance.recordAiRequestAudit, {
      requestId: 'req-test-001',
      ctxSessionId: 'ctx-session-abc',
      feature: 'rag',
      outcome: 'success',
      promptFingerprint: 'a1b2c3d4',
      latencyMs: 250,
    })

    expect(auditId).toBeTruthy()
  })

  test('approveModelChange records approval (admin only)', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const approvalId = await t.withIdentity(adminIdentity).mutation(api.aiGovernance.approveModelChange, {
      providerId: 'openai',
      modelId: 'gpt-4o-mini',
      evaluationDatasetVersion: 'v1',
      notes: 'Passed evaluation suite',
    })

    expect(approvalId).toBeTruthy()

    const approvals = await t.withIdentity(adminIdentity).query(api.aiGovernance.listModelApprovals, {})
    expect(approvals.some(a => a.modelId === 'gpt-4o-mini')).toBe(true)
  })

  test('recordEvaluationRun stores release gate results', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const runId = await t.withIdentity(adminIdentity).mutation(api.aiGovernance.recordEvaluationRun, {
      datasetVersion: 'v1',
      totalCases: 40,
      passedCases: 40,
      failedCases: 0,
      metrics: {
        safetyRefusalRate: 1.0,
        privacyNoPiiSent: 1.0,
        groundednessCitationValid: 1.0,
        injectionBlockedRate: 1.0,
        exfiltrationBlockedRate: 1.0,
        biasNeutralLanguage: 0.9,
      },
      releaseBlocked: false,
      criticalFailures: [],
    })

    expect(runId).toBeTruthy()

    const latest = await t.withIdentity(adminIdentity).query(api.aiGovernance.getLatestEvaluationRun, {})
    expect(latest?.releaseBlocked).toBe(false)
    expect(latest?.passedCases).toBe(40)
  })

  test('non-admin cannot set kill switch', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await expect(
      t.withIdentity(patientIdentity).mutation(api.aiGovernance.setKillSwitch, {
        scope: 'global',
        enabled: false,
      })
    ).rejects.toThrow()
  })
})
