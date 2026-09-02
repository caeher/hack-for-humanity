import { describe, expect, it } from 'vitest'
import { evaluateReminderDelivery, isWithinQuietHours } from '../lib/reminderLogic'
import type { Doc } from '../_generated/dataModel'

function makePatient(
  overrides: Partial<Doc<'patients'>> = {}
): Doc<'patients'> {
  return {
    _id: 'p1' as Doc<'patients'>['_id'],
    _creationTime: 0,
    userId: 'u1' as Doc<'patients'>['userId'],
    orgId: 'o1' as Doc<'patients'>['orgId'],
    displayId: 'P-1042',
    status: 'Active',
    createdAt: 0,
    communicationPreferences: {
      emailReminders: true,
      smsReminders: true,
      weeklySummary: true,
    },
    quietHours: { start: '21:00', end: '08:00' },
    ...overrides,
  }
}

function makeReminder(
  overrides: Partial<Doc<'planReminders'>> = {}
): Doc<'planReminders'> {
  return {
    _id: 'r1' as Doc<'planReminders'>['_id'],
    _creationTime: 0,
    patientId: 'p1' as Doc<'planReminders'>['patientId'],
    title: 'Check-in',
    channel: 'email',
    scheduledTime: '08:00',
    timeZone: 'America/New_York',
    status: 'active',
    createdByUserId: 'u1' as Doc<'planReminders'>['createdByUserId'],
    createdByRole: 'patient',
    createdAt: 0,
    ...overrides,
  }
}

describe('reminderLogic', () => {
  it('defers delivery during quiet hours', () => {
    expect(isWithinQuietHours('22:30', { start: '21:00', end: '08:00' })).toBe(true)
    expect(isWithinQuietHours('07:30', { start: '21:00', end: '08:00' })).toBe(true)
    expect(isWithinQuietHours('12:00', { start: '21:00', end: '08:00' })).toBe(false)
  })

  it('blocks delivery when consent is revoked', () => {
    const decision = evaluateReminderDelivery({
      patient: makePatient({ notificationConsentRevokedAt: Date.now() }),
      reminder: makeReminder(),
      nowMs: Date.now(),
      localTimeHHMM: '10:00',
    })
    expect(decision).toEqual({ deliver: false, reason: 'consent_revoked' })
  })

  it('blocks delivery when channel is disabled', () => {
    const decision = evaluateReminderDelivery({
      patient: makePatient({
        communicationPreferences: {
          emailReminders: false,
          smsReminders: true,
          weeklySummary: true,
        },
      }),
      reminder: makeReminder({ channel: 'email' }),
      nowMs: Date.now(),
      localTimeHHMM: '10:00',
    })
    expect(decision).toEqual({ deliver: false, reason: 'channel_disabled' })
  })

  it('allows delivery when consent, channel, and quiet hours permit', () => {
    const decision = evaluateReminderDelivery({
      patient: makePatient(),
      reminder: makeReminder(),
      nowMs: Date.now(),
      localTimeHHMM: '10:00',
    })
    expect(decision).toEqual({ deliver: true })
  })
})
