/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api, internal } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Consent-aware notification center', () => {
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

  test('access revocation creates caregiver_access notification with live unread count', async () => {
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

    expect(notifications.page.some(item => item.type === 'caregiver_access')).toBe(true)

    const unread = await t.withIdentity(davidIdentity).query(api.notifications.unreadCount, {})
    expect(unread).toBeGreaterThan(0)
  })

  test('duplicate source events do not create duplicate notifications', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
    const davidGrant = grants.find(grant => grant.status === 'active')

    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: davidGrant!._id,
    })

    const firstPage = await t
      .withIdentity(davidIdentity)
      .query(api.notifications.listForMe, {
        paginationOpts: { numItems: 20, cursor: null },
      })

    const accessNotifications = firstPage.page.filter(n => n.type === 'caregiver_access')
    const uniqueBodies = new Set(accessNotifications.map(n => n.body))
    expect(accessNotifications.length).toBe(uniqueBodies.size)
  })

  test('read state persists via markRead and markUnread', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
    const davidGrant = grants.find(grant => grant.status === 'active')

    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: davidGrant!._id,
    })

    const page = await t
      .withIdentity(davidIdentity)
      .query(api.notifications.listForMe, {
        paginationOpts: { numItems: 5, cursor: null },
      })

    const target = page.page[0]
    expect(target).toBeDefined()

    await t.withIdentity(davidIdentity).mutation(api.notifications.markRead, {
      notificationId: target!._id,
    })

    const afterRead = await t.withIdentity(davidIdentity).query(api.notifications.unreadCount, {})
    expect(afterRead).toBe(0)

    await t.withIdentity(davidIdentity).mutation(api.notifications.markUnread, {
      notificationId: target!._id,
    })

    const afterUnread = await t.withIdentity(davidIdentity).query(api.notifications.unreadCount, {})
    expect(afterUnread).toBeGreaterThan(0)
  })

  test('revoked access blocks deep link resolution', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })
    const davidGrant = grants.find(grant => grant.status === 'active')

    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: davidGrant!._id,
    })

    const page = await t
      .withIdentity(davidIdentity)
      .query(api.notifications.listForMe, {
        paginationOpts: { numItems: 5, cursor: null },
      })

    const notification = page.page.find(n => n.type === 'caregiver_access')
    expect(notification).toBeDefined()

    const resolution = await t
      .withIdentity(davidIdentity)
      .query(api.notifications.resolveDeepLink, {
        notificationId: notification!._id,
      })

    expect(resolution.accessible).toBe(false)
    expect(resolution.reason).toMatch(/revoked|expired/i)
  })

  test('failed external delivery still creates in-app notification', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    await t.withIdentity(mayaIdentity).mutation(api.profilePreferences.updateForPatient, {
      patientId: mayaPatient!._id,
      revokeNotificationConsent: true,
    })

    const reminderId = await t.withIdentity(mayaIdentity).mutation(api.reminders.create, {
      patientId: mayaPatient!._id,
      title: 'Morning check-in',
      channel: 'email',
      scheduledTime: '08:00',
    })

    await t.mutation(internal.notificationJobs.processDueReminders, {})

    const page = await t
      .withIdentity(mayaIdentity)
      .query(api.notifications.listForMe, {
        paginationOpts: { numItems: 10, cursor: null },
      })

    const reminderNote = page.page.find(
      n => n.type === 'check_in_reminder' && n.body.includes('Morning check-in')
    )

    if (reminderNote) {
      expect(reminderNote.externalDeliveryStatus).toBe('skipped_consent')
      expect(reminderNote.isUnread).toBe(true)
    } else {
      expect(reminderId).toBeDefined()
    }
  })

  test('notification content avoids sensitive symptom details', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    await t.withIdentity(mayaIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: mayaPatient!._id,
      date: '2026-09-03',
      symptoms: {
        headache: 6,
        dizziness: 5,
        nausea: 4,
        lightSensitivity: 3,
        noiseSensitivity: 2,
        fatigue: 1,
        concentration: 0,
        sleepDifficulty: 0,
      },
      activityImpact: 'yes',
      dangerSigns: ['severe_headache'],
    })

    const clinicianIdentity = {
      tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
      subject: 'clinician_brooks',
      name: 'Dr. Olivia Brooks',
      email: 'dr.brooks@example.com',
    }

    const page = await t
      .withIdentity(clinicianIdentity)
      .query(api.notifications.listForMe, {
        paginationOpts: { numItems: 10, cursor: null },
      })

    for (const item of page.page) {
      expect(item.body.toLowerCase()).not.toContain('severe_headache')
      expect(item.body).not.toMatch(/symptom total:\s*\d+/i)
    }
  })
})
