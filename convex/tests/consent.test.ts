/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Consent Governance & Caregiver Delegated Access', () => {
  const mayaIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  const davidIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
    subject: 'caregiver_david',
    name: 'David Chen',
    email: 'david.chen@example.com',
  }

  const adminIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
    subject: 'admin_1',
    name: 'System Admin',
    email: 'admin@example.com',
  }

  const unauthorizedCaregiverIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|stranger_caregiver',
    subject: 'stranger_caregiver',
    name: 'Stranger Caregiver',
    email: 'stranger@example.com',
  }

  test('caregiver with active consent can view symptoms and recovery trends', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    // Find Maya's patient ID
    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})
    expect(mayaPatient).not.toBeNull()

    // Caregiver David Chen lists accessible patients
    const accessiblePatients = await t
      .withIdentity(davidIdentity)
      .query(api.consent.listAccessiblePatients, {})
    expect(accessiblePatients.length).toBe(1)
    expect(accessiblePatients[0].displayId).toBe('P-1042')

    // Caregiver David Chen queries Maya's check-ins
    const checkIns = await t
      .withIdentity(davidIdentity)
      .query(api.checkIns.listByPatient, { patientId: mayaPatient!._id })
    expect(Array.isArray(checkIns) ? checkIns.length : checkIns.page.length).toBeGreaterThan(0)

    // Caregiver David Chen queries Maya's recovery trends
    const trends = await t
      .withIdentity(davidIdentity)
      .query(api.recoveryTrends.listByPatient, { patientId: mayaPatient!._id })
    expect(trends.length).toBeGreaterThan(0)
  })

  test('caregiver without active consent is rejected from accessing patient data', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    // Register unauthorized caregiver user in system as admin
    await t.withIdentity(adminIdentity).mutation(api.users.inviteUser, {
      name: 'Stranger Caregiver',
      email: 'stranger@example.com',
      role: 'caregiver',
    })


    // Stranger caregiver attempts to query Maya's check-ins -> Rejected
    await expect(
      t
        .withIdentity(unauthorizedCaregiverIdentity)
        .query(api.checkIns.listByPatient, { patientId: mayaPatient!._id })
    ).rejects.toThrow(/Forbidden|does not have active consent/)
  })

  test('revoking consent immediately terminates caregiver access', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    // List grants for Maya
    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
    expect(grants.length).toBe(1)
    expect(grants[0].status).toBe('active')

    // Maya revokes David's consent
    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: grants[0]._id,
    })

    // David Chen now attempts to query Maya's check-ins -> Rejected
    await expect(
      t
        .withIdentity(davidIdentity)
        .query(api.checkIns.listByPatient, { patientId: mayaPatient!._id })
    ).rejects.toThrow(/Forbidden|does not have active consent/)
  })

  test('patient can grant new scoped consent with expiration', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const davidUser = await t
      .withIdentity(davidIdentity)
      .query(api.users.getMe, {})

    // Grant consent with specific scopes and 30-day expiration
    const grantId = await t.withIdentity(mayaIdentity).mutation(api.consent.grantConsent, {
      patientId: mayaPatient!._id,
      granteeUserId: davidUser!._id,
      granteeRole: 'caregiver',
      scopes: ['view_symptoms', 'view_trends'],
      relationship: 'Spouse',
      expiresInDays: 30,
    })

    expect(grantId).toBeDefined()

    // Verify David has access
    const accessible = await t
      .withIdentity(davidIdentity)
      .query(api.consent.listAccessiblePatients, {})
    expect(accessible.length).toBe(1)
  })
})
