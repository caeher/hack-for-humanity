/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('patternInsights API', () => {
  test('computes patterns for seeded patient with methodology metadata', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    const patient = await t
      .withIdentity(adminIdentity)
      .query(api.patients.getByDisplayId, { displayId: 'P-1042' })
    expect(patient).toBeDefined()

    const methodology = await t.query(api.patternInsights.getMethodologyInfo, {})
    expect(methodology.version).toBe('1.0.0')
    expect(methodology.nonCausalDisclaimer).toContain('temporal associations')

    const result = await t
      .withIdentity({
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        subject: 'patient_maya',
        name: 'Maya Chen',
        email: 'maya@example.com',
      })
      .query(api.patternInsights.computeForPatient, {
        patientId: patient!._id,
        today: '2026-08-31',
      })

    expect(result.algorithmVersion).toBe('1.0.0')
    expect(result.checkInCount).toBeGreaterThan(0)
    for (const pattern of result.patterns) {
      expect(pattern.description.toLowerCase()).not.toContain('caused by')
      if (pattern.status === 'available') {
        expect(pattern.algorithmVersion).toBe('1.0.0')
        expect(pattern.inputDateRangeStart).toBeTruthy()
        expect(pattern.inputDateRangeEnd).toBeTruthy()
      }
    }
  })

  test('refreshForPatient persists available insights with version and date range', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const adminIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
      subject: 'admin_1',
      name: 'System Admin',
      email: 'admin@example.com',
    }

    const patient = await t
      .withIdentity(adminIdentity)
      .query(api.patients.getByDisplayId, { displayId: 'P-1042' })
    expect(patient).toBeDefined()

    const patientIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
      subject: 'patient_maya',
      name: 'Maya Chen',
      email: 'maya@example.com',
    }

    await t
      .withIdentity(patientIdentity)
      .mutation(api.patternInsights.refreshForPatient, {
        patientId: patient!._id,
        today: '2026-08-31',
      })

    const stored = await t
      .withIdentity(patientIdentity)
      .query(api.patternInsights.listForPatient, { patientId: patient!._id })

    for (const insight of stored) {
      expect(insight.algorithmVersion).toBe('1.0.0')
      expect(insight.computedAt).toBe('2026-08-31')
      expect(insight.description.toLowerCase()).not.toContain('caused by')
    }
  })
})
