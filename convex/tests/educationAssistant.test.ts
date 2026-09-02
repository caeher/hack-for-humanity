/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Education assistant Convex integration', () => {
  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  test('seeds corpus and returns grounded answer with citations', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const response = await t.withIdentity(patientIdentity).mutation(api.educationAssistant.askQuestion, {
      queryText: 'What sleep hygiene practices are recommended during concussion recovery?',
    })

    expect(response.kind).toBe('grounded_answer')
    expect(response.citations.length).toBeGreaterThan(0)
    expect(response.corpusVersion).toBe('v1')
    expect(response.answerText).toContain('[CDC HEADS UP]')
  })

  test('refuses diagnostic clearance requests safely', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const response = await t.withIdentity(patientIdentity).mutation(api.educationAssistant.askQuestion, {
      queryText: 'Can I play in the soccer tournament tomorrow if I feel fine?',
    })

    expect(response.kind).toBe('safety_refusal')
    expect(response.citations).toHaveLength(0)
  })

  test('records AI audit metadata without prompts', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await t.withIdentity(patientIdentity).mutation(api.educationAssistant.askQuestion, {
      queryText: 'Is it normal for symptoms to fluctuate day to day during recovery?',
    })

    const audits = await t.run(async ctx => ctx.db.query('aiRequestAudit').collect())
    expect(audits.some(audit => audit.feature === 'rag')).toBe(true)
    expect(audits.every(audit => !('prompt' in audit))).toBe(true)
  })

  test('isolates corpus by environment', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const version = await t.withIdentity(patientIdentity).query(api.educationCorpus.getActiveVersion, {})
    expect(version?.environment).toBe('development')
    expect(version?.versionId).toBe('v1')
  })
})
