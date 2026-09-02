import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  ageBandValidator,
  communicationPreferencesValidator,
  diagnosisStatusValidator,
  onboardingDraftPayloadValidator,
  onboardingStatusValidator,
  trackingRelationshipValidator,
} from './lib/validators'
import { requireUser } from './lib/auth'
import { validateStringLength } from './lib/businessLogic'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

function injuryContextFromDiagnosis(status: 'yes' | 'no' | 'unsure'): string {
  switch (status) {
    case 'yes':
      return 'Self-reported: user indicated a professional concussion or mTBI diagnosis exists.'
    case 'no':
      return 'Self-reported: user indicated no professional diagnosis at time of onboarding.'
    case 'unsure':
      return 'Self-reported: professional diagnosis status is unknown or pending evaluation.'
  }
}

function resolveNextRoute(
  trackingRelationship: 'patient' | 'caregiver' | 'professional',
  userRole: Doc<'users'>['role']
): string {
  if (trackingRelationship === 'professional' && (userRole === 'clinician' || userRole === 'admin')) {
    return '/clinician/patients'
  }
  if (trackingRelationship === 'caregiver' && userRole === 'caregiver') {
    return '/caregiver/dashboard'
  }
  return '/patient/assessment'
}

function generateDisplayId(): string {
  return `P-${Math.floor(1000 + Math.random() * 9000)}`
}

async function getPatientForUser(ctx: QueryCtx | MutationCtx, userId: Id<'users'>) {
  return await ctx.db
    .query('patients')
    .withIndex('by_userId', q => q.eq('userId', userId))
    .first()
}

/**
 * Returns onboarding completion status for the authenticated user.
 */
export const getStatus = query({
  args: {},
  returns: onboardingStatusValidator,
  handler: async ctx => {
    const { user } = await requireUser(ctx)

    const patient = await getPatientForUser(ctx, user._id)
    const completed = Boolean(patient?.onboardingCompletedAt)

    const draft = await ctx.db
      .query('onboardingDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    return {
      completed,
      hasDraft: Boolean(draft),
      nextRoute:
        completed && patient?.trackingRelationship
          ? resolveNextRoute(patient.trackingRelationship, user.role)
          : undefined,
    }
  },
})

/**
 * Retrieves the authenticated user's saved onboarding draft, if any.
 */
export const getDraft = query({
  args: {},
  returns: v.union(onboardingDraftPayloadValidator, v.null()),
  handler: async ctx => {
    const { user } = await requireUser(ctx)

    const draft = await ctx.db
      .query('onboardingDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    if (!draft) {
      return null
    }

    return {
      step: draft.step,
      trackingRelationship: draft.trackingRelationship,
      preferredName: draft.preferredName,
      ageBand: draft.ageBand,
      incidentDate: draft.incidentDate,
      timeZone: draft.timeZone,
      diagnosisStatus: draft.diagnosisStatus,
      communicationPreferences: draft.communicationPreferences,
      consentAcknowledged: draft.consentAcknowledged,
      privacyAcknowledged: draft.privacyAcknowledged,
      limitationsAcknowledged: draft.limitationsAcknowledged,
    }
  },
})

/**
 * Persists partial onboarding progress so users can resume after refresh or interruption.
 */
export const saveDraft = mutation({
  args: onboardingDraftPayloadValidator,
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const existingPatient = await getPatientForUser(ctx, user._id)
    if (existingPatient?.onboardingCompletedAt) {
      throw new Error('Onboarding is already complete.')
    }

    if (
      args.trackingRelationship === 'professional' &&
      user.role !== 'clinician' &&
      user.role !== 'admin'
    ) {
      throw new Error('Professional enrollment requires a clinician or administrator account.')
    }

    if (args.preferredName) {
      validateStringLength(args.preferredName, 'Preferred name', 1, 80)
    }

    const now = Date.now()
    const existingDraft = await ctx.db
      .query('onboardingDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()

    const draftData = {
      userId: user._id,
      step: args.step,
      trackingRelationship: args.trackingRelationship,
      preferredName: args.preferredName,
      ageBand: args.ageBand,
      incidentDate: args.incidentDate,
      timeZone: args.timeZone,
      diagnosisStatus: args.diagnosisStatus,
      communicationPreferences: args.communicationPreferences,
      consentAcknowledged: args.consentAcknowledged,
      privacyAcknowledged: args.privacyAcknowledged,
      limitationsAcknowledged: args.limitationsAcknowledged,
      updatedAt: now,
    }

    if (existingDraft) {
      await ctx.db.patch(existingDraft._id, draftData)
    } else {
      await ctx.db.insert('onboardingDrafts', draftData)
    }

    return null
  },
})

/**
 * Completes onboarding by creating a recovery profile and active episode owned by the user.
 */
export const completeOnboarding = mutation({
  args: {
    trackingRelationship: trackingRelationshipValidator,
    preferredName: v.string(),
    ageBand: ageBandValidator,
    incidentDate: v.string(),
    timeZone: v.string(),
    diagnosisStatus: diagnosisStatusValidator,
    communicationPreferences: communicationPreferencesValidator,
    consentAcknowledged: v.boolean(),
    privacyAcknowledged: v.boolean(),
    limitationsAcknowledged: v.boolean(),
  },
  returns: v.object({
    patientId: v.id('patients'),
    episodeId: v.id('recoveryEpisodes'),
    nextRoute: v.string(),
  }),
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)

    const existingPatient = await getPatientForUser(ctx, user._id)
    if (existingPatient?.onboardingCompletedAt) {
      throw new Error('Onboarding is already complete.')
    }

    if (
      args.trackingRelationship === 'professional' &&
      user.role !== 'clinician' &&
      user.role !== 'admin'
    ) {
      throw new Error('Professional enrollment requires a clinician or administrator account.')
    }

    if (!args.consentAcknowledged || !args.privacyAcknowledged || !args.limitationsAcknowledged) {
      throw new Error('All consent acknowledgments are required before saving your recovery profile.')
    }

    const preferredName = validateStringLength(args.preferredName, 'Preferred name', 1, 80)
    const timeZone = validateStringLength(args.timeZone, 'Time zone', 1, 64)

    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.incidentDate)) {
      throw new Error('Event date must be in YYYY-MM-DD format.')
    }

    const defaultOrg = await ctx.db.query('organizations').first()
    if (!defaultOrg) {
      throw new Error('No organization configured. Please contact support.')
    }

    const now = Date.now()
    let displayId = generateDisplayId()
    let collision = await ctx.db
      .query('patients')
      .withIndex('by_displayId', q => q.eq('displayId', displayId))
      .first()

    while (collision) {
      displayId = generateDisplayId()
      collision = await ctx.db
        .query('patients')
        .withIndex('by_displayId', q => q.eq('displayId', displayId))
        .first()
    }

    const trackingNotes =
      args.trackingRelationship === 'caregiver'
        ? 'Recovery profile created by parent/caregiver during onboarding.'
        : args.trackingRelationship === 'professional'
          ? 'Recovery profile created during clinician-led enrollment.'
          : 'Self-directed recovery profile created during onboarding.'

    let patientId: Id<'patients'>

    if (existingPatient) {
      patientId = existingPatient._id
      await ctx.db.patch(patientId, {
        preferredName,
        ageBand: args.ageBand,
        timeZone,
        trackingRelationship: args.trackingRelationship,
        diagnosisStatus: args.diagnosisStatus,
        communicationPreferences: args.communicationPreferences,
        onboardingCompletedAt: now,
        notes: trackingNotes,
      })
    } else {
      patientId = await ctx.db.insert('patients', {
        userId: user._id,
        orgId: defaultOrg._id,
        displayId,
        preferredName,
        ageBand: args.ageBand,
        timeZone,
        trackingRelationship: args.trackingRelationship,
        diagnosisStatus: args.diagnosisStatus,
        communicationPreferences: args.communicationPreferences,
        onboardingCompletedAt: now,
        status: 'Active',
        notes: trackingNotes,
        createdAt: now,
      })
    }

    const episodeId = await ctx.db.insert('recoveryEpisodes', {
      patientId,
      orgId: defaultOrg._id,
      incidentDate: args.incidentDate,
      injuryContext: injuryContextFromDiagnosis(args.diagnosisStatus),
      status: 'active',
      riskLevel: 'Stable',
      startDate: args.incidentDate,
      createdAt: now,
    })

    const draft = await ctx.db
      .query('onboardingDrafts')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .first()
    if (draft) {
      await ctx.db.delete(draft._id)
    }

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      orgId: defaultOrg._id,
      patientId,
      event: `Completed recovery onboarding (${args.trackingRelationship} tracking, diagnosis: ${args.diagnosisStatus})`,
      targetResource: 'patients',
      resourceId: patientId,
      action: 'create',
      createdAt: now,
    })

    return {
      patientId,
      episodeId,
      nextRoute: resolveNextRoute(args.trackingRelationship, user.role),
    }
  },
})
