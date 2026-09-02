/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Caregiver invitation & support dashboard', () => {
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

  const strangerIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|stranger_caregiver',
    subject: 'stranger_caregiver',
    name: 'Stranger Caregiver',
    email: 'stranger@example.com',
  }

  test('patient can invite caregiver with pending status until acceptance', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grantId = await t.withIdentity(mayaIdentity).mutation(api.consent.inviteCaregiver, {
      patientId: mayaPatient!._id,
      inviteeEmail: 'stranger@example.com',
      inviteeName: 'Stranger Caregiver',
      scopes: ['view_trends', 'view_symptoms'],
      relationship: 'Friend',
      expiresInDays: 14,
    })

    const grant = await t.withIdentity(mayaIdentity).query(api.consent.listGrantsByPatient, {
      patientId: mayaPatient!._id,
    })
    const pendingGrant = grant.find(item => item._id === grantId)
    expect(pendingGrant?.status).toBe('pending')

    await expect(
      t.withIdentity(strangerIdentity).query(api.caregiverDashboard.getSupportSummary, {
        patientId: mayaPatient!._id,
        today: '2026-09-02',
      })
    ).rejects.toThrow(/Forbidden|not registered/)

    await t.withIdentity(strangerIdentity).mutation(api.users.syncCurrentUser, {
      name: 'Stranger Caregiver',
    })

    const pending = await t
      .withIdentity(strangerIdentity)
      .query(api.consent.listPendingInvitations, {})
    expect(pending.some(item => item.grant._id === grantId)).toBe(true)

    await expect(
      t.withIdentity(strangerIdentity).query(api.caregiverDashboard.getSupportSummary, {
        patientId: mayaPatient!._id,
        today: '2026-09-02',
      })
    ).rejects.toThrow(/Forbidden|active consent/)

    await t.withIdentity(strangerIdentity).mutation(api.consent.acceptInvitation, {
      consentGrantId: grantId,
    })

    const summary = await t
      .withIdentity(strangerIdentity)
      .query(api.caregiverDashboard.getSupportSummary, {
        patientId: mayaPatient!._id,
        today: '2026-09-02',
      })

    expect(summary.patientName).toBeTruthy()
    expect(summary.restrictedSections.length).toBeGreaterThan(0)
    expect(summary.chartPoints).not.toBeNull()
    expect(summary.carePlanTasks).toBeNull()
  })

  test('caregiver cannot access patient by display ID without consent', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await expect(
      t.withIdentity(strangerIdentity).query(api.patients.getByDisplayId, { displayId: 'P-1042' })
    ).rejects.toThrow(/Forbidden|not registered/)
  })

  test('revocation removes caregiver dashboard access immediately', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
    const davidGrant = grants.find(grant => grant.status === 'active')
    expect(davidGrant).toBeDefined()

    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: davidGrant!._id,
    })

    await expect(
      t.withIdentity(davidIdentity).query(api.caregiverDashboard.getSupportSummary, {
        patientId: mayaPatient!._id,
        today: '2026-09-02',
      })
    ).rejects.toThrow(/Forbidden|active consent/)
  })

  test('access change creates notification for affected user', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
    const davidGrant = grants.find(grant => grant.status === 'active')
    expect(davidGrant).toBeDefined()

    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: davidGrant!._id,
    })

    const notifications = await t
      .withIdentity(davidIdentity)
      .query(api.notifications.listForMe, {
        paginationOpts: { numItems: 10, cursor: null },
      })
    expect(notifications.page.some((item: { type: string }) => item.type === 'caregiver_access')).toBe(
      true
    )
  })
})
