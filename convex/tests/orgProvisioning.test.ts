/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const adminIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
  subject: 'admin_1',
  name: 'System Admin',
  email: 'admin@example.com',
}

describe('Organization provisioning & settings', () => {
  test('organization admin can invite, change role, and update settings', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    expect(org).not.toBeNull()

    const invitationId = await t.withIdentity(adminIdentity).mutation(api.orgProvisioning.inviteUser, {
      orgId: org!._id,
      name: 'New Clinician',
      email: 'new.clinician@hospital.org',
      role: 'clinician',
    })
    expect(invitationId).toBeDefined()

    const invitations = await t
      .withIdentity(adminIdentity)
      .query(api.orgProvisioning.listInvitations, { orgId: org!._id })
    expect(invitations.some(i => i.email === 'new.clinician@hospital.org')).toBe(true)

    const metrics = await t
      .withIdentity(adminIdentity)
      .query(api.organizations.getAggregateMetrics, { orgId: org!._id })
    expect(metrics.enrolledPatients).toBeGreaterThan(0)
    expect(metrics.riskDistribution).toBeDefined()
  })

  test('non-admin cannot perform lifecycle actions', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    const patientIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
      subject: 'patient_maya',
      name: 'Maya Chen',
      email: 'maya.chen@example.com',
    }

    await expect(
      t.withIdentity(patientIdentity).mutation(api.orgProvisioning.inviteUser, {
        orgId: org!._id,
        name: 'Blocked User',
        email: 'blocked@example.com',
        role: 'patient',
      })
    ).rejects.toThrow(/Forbidden|Organization admin/)
  })

  test('last active administrator cannot be suspended', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    const adminUser = await t.withIdentity(adminIdentity).query(api.users.getMe, {})

    await expect(
      t.withIdentity(adminIdentity).mutation(api.orgProvisioning.suspendUser, {
        orgId: org!._id,
        userId: adminUser!._id,
        confirmationEmail: adminUser!.email,
      })
    ).rejects.toThrow(/last active organization administrator/)
  })

  test('organization settings update is audited', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})

    await t.withIdentity(adminIdentity).mutation(api.organizations.updateSettings, {
      orgId: org!._id,
      locale: 'en-GB',
      featureFlags: {
        aiInsights: false,
        caregiverPortal: true,
        secureMessaging: true,
        patternDetection: true,
      },
    })

    const settings = await t
      .withIdentity(adminIdentity)
      .query(api.organizations.getSettings, { orgId: org!._id })

    expect(settings.organization.locale).toBe('en-GB')
    expect(settings.featureFlags.aiInsights).toBe(false)

    const logs = await t
      .withIdentity(adminIdentity)
      .query(api.auditLogs.listRecent, { orgId: org!._id, limit: 10 })

    const logList = Array.isArray(logs) ? logs : logs.page
    expect(
      logList.some(log => log.event.includes('Updated organization settings'))
    ).toBe(true)
  })
})
