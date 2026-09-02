/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Convex API Authorization & RBAC', () => {
  test('unauthenticated caller is rejected from accessing protected queries', async () => {
    const t = convexTest(schema, modules)
    await expect(t.query(api.patients.list, {})).rejects.toThrow(
      /Unauthorized|Authentication required/
    )
  })

  describe('Clerk Identity Synchronization & Lifecycle', () => {
    test('brand new Clerk user self-registers and is routed to onboarding', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const newClerkIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|user_new_123',
        subject: 'user_new_123',
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
      }

      // Sync user
      const syncResult = await t
        .withIdentity(newClerkIdentity)
        .mutation(api.users.syncCurrentUser, { name: 'Alex Rivera' })

      expect(syncResult.isNew).toBe(true)
      expect(syncResult.role).toBe('patient')
      expect(syncResult.status).toBe('Active')
      expect(syncResult.authorizedHome).toBe('/onboarding')
      expect(syncResult.user.tokenIdentifier).toBe(newClerkIdentity.tokenIdentifier)
      expect(syncResult.user.clerkId).toBe('user_new_123')

      // Recovery profile is created during onboarding — not at sign-up
      const patientProfile = await t
        .withIdentity(newClerkIdentity)
        .query(api.patients.getMePatient, {})
      expect(patientProfile).toBeNull()
    })

    test('invited user claims pending invitation on first sign-in with matching email', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const adminIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
        subject: 'admin_1',
        name: 'System Admin',
        email: 'admin@example.com',
      }

      // 1. Admin invites a new clinician
      const invitedUserId = await t.withIdentity(adminIdentity).mutation(api.users.inviteUser, {
        name: 'Dr. Sarah Connor',
        email: 'sarah.connor@hospital.org',
        role: 'clinician',
      })
      expect(invitedUserId).toBeDefined()

      // 2. Invited clinician signs in via Clerk with matching email
      const clinicianClerkIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clerk_sarah_connor',
        subject: 'clerk_sarah_connor',
        name: 'Dr. Sarah Connor',
        email: 'sarah.connor@hospital.org',
      }

      const syncResult = await t
        .withIdentity(clinicianClerkIdentity)
        .mutation(api.users.syncCurrentUser, {})

      expect(syncResult.isNew).toBe(false)
      expect(syncResult.role).toBe('clinician')
      expect(syncResult.status).toBe('Active')
      expect(syncResult.authorizedHome).toBe('/clinician/dashboard')
      expect(syncResult.user.tokenIdentifier).toBe(clinicianClerkIdentity.tokenIdentifier)
      expect(syncResult.user.clerkId).toBe('clerk_sarah_connor')
    })

    test('suspended user is blocked from syncCurrentUser and protected queries', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

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

      // Maya retrieves her profile initially
      const meBefore = await t.withIdentity(patientIdentity).query(api.users.getMe, {})
      expect(meBefore?.status).toBe('Active')

      // Admin suspends Maya
      await t.withIdentity(adminIdentity).mutation(api.users.updateStatus, {
        userId: meBefore!._id,
        status: 'Suspended',
      })

      // Subsequent syncCurrentUser call is blocked
      await expect(
        t.withIdentity(patientIdentity).mutation(api.users.syncCurrentUser, {})
      ).rejects.toThrow(/Forbidden: Account is suspended/)

      // Subsequent protected query is blocked
      await expect(
        t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
      ).rejects.toThrow(/Forbidden: Account is suspended/)
    })
  })

  describe('Role-Based Access Matrix (Allowed Operations)', () => {
    test('patient can view self profile, submit check-in, and toggle care plans', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const patientIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        subject: 'patient_maya',
        name: 'Maya Chen',
        email: 'maya.chen@example.com',
      }

      const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
      expect(patient?.displayId).toBe('P-1042')

      // Submit check-in
      const result = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
        patientId: patient!._id,
        date: '2026-09-02',
        symptoms: {
          headache: 1,
          dizziness: 0,
          nausea: 0,
          lightSensitivity: 1,
          noiseSensitivity: 0,
          fatigue: 1,
          concentration: 1,
          sleepDifficulty: 0,
        },
        activityImpact: 'none',
        dangerSigns: [],
        note: 'Feeling almost back to baseline.',
      })
      expect(result.checkInId).toBeDefined()

      // List care plans
      const plans = await t.withIdentity(patientIdentity).query(api.carePlans.listByPatient, {
        patientId: patient!._id,
      })
      expect(plans.length).toBeGreaterThan(0)
    })

    test('caregiver with active consent can view patient symptoms and care plan', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const caregiverIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
        subject: 'caregiver_david',
        name: 'David Chen',
        email: 'david.chen@example.com',
      }

      // Caregiver lists accessible patients
      const accessible = await t
        .withIdentity(caregiverIdentity)
        .query(api.consent.listAccessiblePatients, {})
      expect(accessible.length).toBe(1)
      expect(accessible[0].displayId).toBe('P-1042')

      // Caregiver views patient check-ins (scope 'view_symptoms')
      const checkIns = await t
        .withIdentity(caregiverIdentity)
        .query(api.checkIns.listByPatient, { patientId: accessible[0].patientId })
      const checkInList = Array.isArray(checkIns) ? checkIns : checkIns.page
      expect(checkInList.length).toBeGreaterThan(0)

      // Caregiver views patient care plan (scope 'view_plan')
      const carePlans = await t
        .withIdentity(caregiverIdentity)
        .query(api.carePlans.listByPatient, { patientId: accessible[0].patientId })
      expect(carePlans.length).toBeGreaterThan(0)
    })

    test('clinician can list caseload patients and resolve alerts', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const clinicianIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
        subject: 'clinician_brooks',
        name: 'Dr. Olivia Brooks',
        email: 'dr.brooks@example.com',
      }

      // Clinician views caseload
      const caseload = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
      expect(Array.isArray(caseload) ? caseload.length : caseload.page.length).toBeGreaterThan(0)

      // Clinician lists alerts
      const alerts = await t.withIdentity(clinicianIdentity).query(api.alerts.list, {
        paginationOpts: { numItems: 20, cursor: null },
      })
      expect(alerts.page.length).toBeGreaterThan(0)

      const activeAlert = alerts.page[0]
      await t.withIdentity(clinicianIdentity).mutation(api.alerts.resolveAlert, {
        alertId: activeAlert.alert._id,
      })
    })

    test('admin can manage users and access audit logs', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const adminIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
        subject: 'admin_1',
        name: 'System Admin',
        email: 'admin@example.com',
      }

      const users = await t.withIdentity(adminIdentity).query(api.users.list, {})
      expect(Array.isArray(users) ? users.length : users.page.length).toBeGreaterThan(0)

      const auditLogs = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {})
      expect(Array.isArray(auditLogs) ? auditLogs.length : auditLogs.page.length).toBeGreaterThan(0)
    })
  })

  describe('Role-Based Access Matrix (Denied Cross-Role Access)', () => {
    test('patient is rejected from accessing organization user management', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const patientIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        subject: 'patient_maya',
        name: 'Maya Chen',
        email: 'maya.chen@example.com',
      }

      await expect(
        t.withIdentity(patientIdentity).query(api.users.list, {})
      ).rejects.toThrow(/Forbidden: Requires one of \[admin, clinician\] roles/)

      await expect(
        t.withIdentity(patientIdentity).mutation(api.users.inviteUser, {
          name: 'Hacker',
          email: 'hacker@example.com',
          role: 'admin',
        })
      ).rejects.toThrow(/Forbidden: Requires one of \[admin\] roles/)
    })

    test('patient is rejected from viewing audit logs', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const patientIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        subject: 'patient_maya',
        name: 'Maya Chen',
        email: 'maya.chen@example.com',
      }

      await expect(
        t.withIdentity(patientIdentity).query(api.auditLogs.listRecent, {})
      ).rejects.toThrow(/Forbidden: Requires one of \[admin\] roles/)
    })

    test('patient is rejected from accessing another patient check-in records', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const mayaIdentity = {
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

      // Daniel Ortiz patient profile
      const danielPatient = await t
        .withIdentity(adminIdentity)
        .query(api.patients.getByDisplayId, { displayId: 'P-1038' })
      expect(danielPatient).toBeDefined()

      // Maya attempts to query Daniel's check-ins directly
      await expect(
        t.withIdentity(mayaIdentity).query(api.checkIns.listByPatient, {
          patientId: danielPatient!._id,
        })
      ).rejects.toThrow(/Forbidden: Access to patient .* denied/)
    })

    test('caregiver without active consent grant is rejected from accessing patient data', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const adminIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
        subject: 'admin_1',
        name: 'System Admin',
        email: 'admin@example.com',
      }

      const caregiverIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
        subject: 'caregiver_david',
        name: 'David Chen',
        email: 'david.chen@example.com',
      }

      // Daniel Ortiz (P-1038) has NOT granted consent to David Chen
      const danielPatient = await t
        .withIdentity(adminIdentity)
        .query(api.patients.getByDisplayId, { displayId: 'P-1038' })

      await expect(
        t.withIdentity(caregiverIdentity).query(api.checkIns.listByPatient, {
          patientId: danielPatient!._id,
        })
      ).rejects.toThrow(/Forbidden: Caregiver does not have active consent/)
    })

    test('caregiver with revoked consent is rejected from accessing patient data', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const mayaIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        subject: 'patient_maya',
        name: 'Maya Chen',
        email: 'maya.chen@example.com',
      }

      const caregiverIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
        subject: 'caregiver_david',
        name: 'David Chen',
        email: 'david.chen@example.com',
      }

      const mayaPatient = await t.withIdentity(mayaIdentity).query(api.patients.getMePatient, {})
      const grants = await t
        .withIdentity(mayaIdentity)
        .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
      expect(grants.length).toBeGreaterThan(0)

      // Maya revokes David's consent
      await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
        consentGrantId: grants[0]._id,
      })

      // David tries to access Maya's check-ins after revocation
      await expect(
        t.withIdentity(caregiverIdentity).query(api.checkIns.listByPatient, {
          patientId: mayaPatient!._id,
        })
      ).rejects.toThrow(/Forbidden: Caregiver does not have active consent/)
    })
  })
})

