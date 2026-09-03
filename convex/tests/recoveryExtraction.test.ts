/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Recovery extraction Convex integration', () => {
  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  test('extracts candidates and records audit metadata without raw note', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.run(async ctx => {
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', q => q.eq('email', 'maya.chen@example.com'))
        .first()
      if (!user) return null
      return await ctx.db
        .query('patients')
        .withIndex('by_userId', q => q.eq('userId', user._id))
        .first()
    })

    expect(patient).not.toBeNull()
    if (!patient) return

    const note = 'Headache after studying for two hours.'
    const response = await t.withIdentity(patientIdentity).mutation(api.recoveryExtraction.extractFromNote, {
      patientId: patient._id,
      noteText: note,
    })

    expect(response.candidates.length).toBeGreaterThan(0)
    expect(JSON.stringify(response)).not.toContain(note)

    const audits = await t.run(async ctx => ctx.db.query('recoveryExtractionAudit').collect())
    expect(audits.some(audit => audit.requestId === response.audit.requestId)).toBe(true)
    expect(audits.every(audit => !('noteText' in audit))).toBe(true)
  })

  test('evaluateConfirmedExtraction maps confirmed candidates to exposure entries', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.run(async ctx => {
      const user = await ctx.db
        .query('users')
        .withIndex('by_email', q => q.eq('email', 'maya.chen@example.com'))
        .first()
      if (!user) return null
      return await ctx.db
        .query('patients')
        .withIndex('by_userId', q => q.eq('userId', user._id))
        .first()
    })

    expect(patient).not.toBeNull()
    if (!patient) return

    const result = await t.withIdentity(patientIdentity).mutation(
      api.recoveryExtraction.evaluateConfirmedExtraction,
      {
        patientId: patient._id,
        candidates: [
          {
            id: 'c1',
            status: 'confirmed' as const,
            symptom: { field: 'headache' },
            activity: { domain: 'cognitive', activityType: 'studying' },
            duration: { minutes: 120 },
            confidence: 'high' as const,
            uncertain: false,
          },
          {
            id: 'c2',
            status: 'discarded' as const,
            confidence: 'low' as const,
            uncertain: true,
          },
        ],
      }
    )

    expect(result.confirmedCount).toBe(1)
    expect(result.discardedCount).toBe(1)
    expect(result.exposureEntries).toHaveLength(1)
    expect(result.exposureEntries[0]?.domain).toBe('cognitive')
  })
})
