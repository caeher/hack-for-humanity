/**
 * Recovery note extraction API — de-identified NLP with user confirmation.
 */

import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requirePatientAccess, requireUser } from './lib/auth'
import { loadGovernanceState } from './lib/educationLogic'
import { computePromptFingerprintSync } from '@/lib/ai/logging'
import {
  extractRecoveryEvents,
  evaluateConfirmedCandidatesSafety,
  mapConfirmedCandidatesToExposureEntries,
  type RecoveryEventCandidate,
} from '@/lib/extraction'
import { safetyEvaluationResultValidator } from './lib/validators'
import { evaluateFreeText } from './lib/safetyEngine'
import { sanitizeInput } from './lib/businessLogic'

const extractionSymptomValidator = v.object({
  field: v.string(),
  severity: v.optional(v.number()),
  uncertain: v.optional(v.boolean()),
})

const extractionActivityValidator = v.object({
  domain: v.string(),
  activityType: v.string(),
  trigger: v.optional(v.string()),
  uncertain: v.optional(v.boolean()),
  rejected: v.optional(v.boolean()),
})

const extractionDurationValidator = v.object({
  minutes: v.optional(v.number()),
  text: v.optional(v.string()),
  uncertain: v.optional(v.boolean()),
})

const extractionTimingValidator = v.object({
  relative: v.optional(v.string()),
  timeOfDay: v.optional(v.string()),
  uncertain: v.optional(v.boolean()),
})

const candidateValidator = v.object({
  id: v.string(),
  symptom: v.optional(extractionSymptomValidator),
  activity: v.optional(extractionActivityValidator),
  duration: v.optional(extractionDurationValidator),
  timing: v.optional(extractionTimingValidator),
  confidence: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
  uncertain: v.boolean(),
  status: v.union(
    v.literal('pending'),
    v.literal('confirmed'),
    v.literal('discarded')
  ),
})

const extractionAuditValidator = v.object({
  requestId: v.string(),
  ctxSessionId: v.string(),
  schemaVersion: v.string(),
  promptVersion: v.string(),
  modelId: v.string(),
  validationOutcome: v.string(),
  latencyMs: v.number(),
  auditOutcome: v.string(),
  candidateCount: v.number(),
  promptFingerprint: v.optional(v.string()),
})

const extractionResponseValidator = v.object({
  kind: v.union(
    v.literal('candidates'),
    v.literal('ai_disabled'),
    v.literal('blocked'),
    v.literal('parse_failed'),
    v.literal('empty')
  ),
  candidates: v.array(candidateValidator),
  message: v.optional(v.string()),
  audit: extractionAuditValidator,
  rawTextSafety: v.optional(safetyEvaluationResultValidator),
})

export const extractFromNote = mutation({
  args: {
    patientId: v.id('patients'),
    noteText: v.string(),
    daysSinceInjury: v.optional(v.number()),
    symptomTotal: v.optional(v.number()),
  },
  returns: extractionResponseValidator,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const patient = await ctx.db.get(args.patientId)
    if (!patient) throw new Error('Patient not found.')
    if (patient.userId !== user._id && user.role !== 'clinician' && user.role !== 'admin') {
      throw new Error('Unauthorized.')
    }

    const trimmed = args.noteText.trim()
    if (trimmed.length > 2000) {
      throw new Error('Note exceeds maximum length.')
    }

    const governance = await loadGovernanceState(ctx, patient.orgId)
    const requestId = crypto.randomUUID()

    const rawTextSafety = evaluateFreeText(sanitizeInput(trimmed))

    const response = extractRecoveryEvents({
      requestId,
      noteText: trimmed,
      governance,
      orgId: patient.orgId,
      daysSinceInjury: args.daysSinceInjury,
      symptomTotal: args.symptomTotal,
    })

    const promptFingerprint = computePromptFingerprintSync(trimmed)

    await ctx.db.insert('aiRequestAudit', {
      requestId: response.audit.requestId,
      ctxSessionId: response.audit.ctxSessionId,
      orgId: patient.orgId,
      feature: 'nlp',
      outcome: response.audit.auditOutcome,
      modelId: response.audit.modelId,
      latencyMs: response.audit.latencyMs,
      promptFingerprint,
      createdAt: Date.now(),
    })

    await ctx.db.insert('recoveryExtractionAudit', {
      requestId: response.audit.requestId,
      ctxSessionId: response.audit.ctxSessionId,
      patientId: args.patientId,
      orgId: patient.orgId,
      schemaVersion: response.audit.schemaVersion,
      promptVersion: response.audit.promptVersion,
      modelId: response.audit.modelId,
      validationOutcome: response.audit.validationOutcome,
      candidateCount: response.audit.candidateCount,
      latencyMs: response.audit.latencyMs,
      outcome: response.audit.auditOutcome,
      promptFingerprint,
      createdAt: Date.now(),
    })

    return {
      ...response,
      rawTextSafety,
    }
  },
})

export const evaluateConfirmedExtraction = mutation({
  args: {
    patientId: v.id('patients'),
    candidates: v.array(candidateValidator),
    rawNote: v.optional(v.string()),
    requestId: v.optional(v.string()),
  },
  returns: v.object({
    safetyResult: safetyEvaluationResultValidator,
    exposureEntries: v.array(
      v.object({
        domain: v.string(),
        activityType: v.string(),
        symptomsWorsened: v.string(),
        durationMinutes: v.optional(v.number()),
        symptomMagnitude: v.optional(v.number()),
        symptomOnsetMinutes: v.optional(v.number()),
        sleepHours: v.optional(v.number()),
      })
    ),
    confirmedCount: v.number(),
    discardedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireUser(ctx)
    await requirePatientAccess(ctx, args.patientId, 'view_symptoms')

    const confirmed = args.candidates.filter(c => c.status === 'confirmed')
    const discardedCount = args.candidates.filter(c => c.status === 'discarded').length

    const safetyResult = evaluateConfirmedCandidatesSafety(
      args.candidates as RecoveryEventCandidate[],
      args.rawNote
    )

    const exposureEntries = mapConfirmedCandidatesToExposureEntries(
      confirmed as RecoveryEventCandidate[]
    )

    if (args.requestId) {
      const audit = await ctx.db
        .query('recoveryExtractionAudit')
        .withIndex('by_requestId', q => q.eq('requestId', args.requestId!))
        .first()

      if (audit) {
        await ctx.db.patch(audit._id, {
          confirmedCount: confirmed.length,
          discardedCount,
        })
      }
    }

    return {
      safetyResult,
      exposureEntries,
      confirmedCount: confirmed.length,
      discardedCount,
    }
  },
})
