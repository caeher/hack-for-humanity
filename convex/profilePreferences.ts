import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  accessibilityPreferencesValidator,
  communicationPreferencesValidator,
  profilePreferencesValidator,
  quietHoursValidator,
} from './lib/validators'
import { requirePatientAccess, requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'

const DEFAULT_COMMUNICATION: {
  emailReminders: boolean
  smsReminders: boolean
  weeklySummary: boolean
} = {
  emailReminders: true,
  smsReminders: false,
  weeklySummary: true,
}

const DEFAULT_ACCESSIBILITY: {
  largeText: boolean
  highContrast: boolean
  reducedMotion: boolean
} = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
}

const DEFAULT_QUIET_HOURS: { start: string; end: string } = {
  start: '21:00',
  end: '08:00',
}

/**
 * Load profile preferences for the authenticated patient.
 */
export const getForPatient = query({
  args: { patientId: v.id('patients') },
  returns: profilePreferencesValidator,
  handler: async (ctx, args) => {
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    return {
      timeZone: patient.timeZone,
      communicationPreferences: patient.communicationPreferences ?? DEFAULT_COMMUNICATION,
      accessibilityPreferences: patient.accessibilityPreferences ?? DEFAULT_ACCESSIBILITY,
      quietHours: patient.quietHours ?? DEFAULT_QUIET_HOURS,
      notificationConsentRevokedAt: patient.notificationConsentRevokedAt,
      wearableSyncStatus: 'planned_disabled' as const,
    }
  },
})

/**
 * Update patient-owned profile preferences with audit logging.
 */
export const updateForPatient = mutation({
  args: {
    patientId: v.id('patients'),
    timeZone: v.optional(v.string()),
    communicationPreferences: v.optional(communicationPreferencesValidator),
    accessibilityPreferences: v.optional(accessibilityPreferencesValidator),
    quietHours: v.optional(quietHoursValidator),
    revokeNotificationConsent: v.optional(v.boolean()),
    restoreNotificationConsent: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const { patient } = await requirePatientAccess(ctx, args.patientId)

    if (user.role === 'caregiver') {
      throw new Error('Caregivers cannot modify patient profile preferences.')
    }

    if (user.role !== 'patient' && user.role !== 'admin') {
      throw new Error('Only the patient (or an administrator) can update profile preferences.')
    }

    if (patient.userId !== user._id && user.role !== 'admin') {
      throw new Error('Forbidden: Cannot update another patient\'s preferences.')
    }

    const now = Date.now()
    const patch: {
      timeZone?: string
      communicationPreferences?: {
        emailReminders: boolean
        smsReminders: boolean
        weeklySummary: boolean
      }
      accessibilityPreferences?: {
        largeText: boolean
        highContrast: boolean
        reducedMotion: boolean
      }
      quietHours?: { start: string; end: string }
      notificationConsentRevokedAt?: number
    } = {}

    if (args.timeZone !== undefined) {
      patch.timeZone = validateStringLength(args.timeZone, 'Time zone', 2, 64)
    }
    if (args.communicationPreferences !== undefined) {
      patch.communicationPreferences = args.communicationPreferences
    }
    if (args.accessibilityPreferences !== undefined) {
      patch.accessibilityPreferences = args.accessibilityPreferences
    }
    if (args.quietHours !== undefined) {
      patch.quietHours = args.quietHours
    }
    if (args.revokeNotificationConsent) {
      patch.notificationConsentRevokedAt = now
    }
    if (args.restoreNotificationConsent) {
      patch.notificationConsentRevokedAt = undefined
    }

    await ctx.db.patch(patient._id, patch)

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: patient.orgId,
      patientId: patient._id,
      event: 'Updated profile preferences',
      targetResource: 'patients',
      resourceId: patient._id,
      action: 'update',
      createdAt: now,
    })

    return null
  },
})
