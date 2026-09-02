/**
 * Citation-grounded concussion education assistant API.
 */

import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { requireUser } from './lib/auth'
import {
  getCorpusEnvironment,
  loadActiveCorpusChunks,
  loadGovernanceState,
  seedEducationCorpusIfMissing,
} from './lib/educationLogic'
import { computePromptFingerprintSync } from '@/lib/ai/logging'
import { processEducationQuestion } from '@/lib/education/assistant'
import { EDUCATION_CORPUS_VERSION } from '@/lib/education/types'

const citationValidator = v.object({
  chunkId: v.string(),
  sourceTitle: v.string(),
  sourceAuthority: v.string(),
  section: v.string(),
  version: v.string(),
  effectiveDate: v.string(),
  excerpt: v.string(),
})

const responseValidator = v.object({
  kind: v.union(
    v.literal('grounded_answer'),
    v.literal('safety_refusal'),
    v.literal('guardrail_refusal'),
    v.literal('insufficient_evidence'),
    v.literal('app_help'),
    v.literal('personal_data_redirect'),
    v.literal('out_of_scope'),
    v.literal('ai_disabled_fallback')
  ),
  answerText: v.string(),
  citations: v.array(citationValidator),
  classification: v.union(
    v.literal('education'),
    v.literal('app_help'),
    v.literal('personal_data'),
    v.literal('unsafe_diagnostic'),
    v.literal('out_of_scope')
  ),
  corpusVersion: v.string(),
  environment: v.string(),
  safetyStatus: v.optional(v.string()),
  safetyGuidance: v.optional(v.string()),
  requestId: v.string(),
  ctxSessionId: v.string(),
  auditOutcome: v.string(),
})

export const askQuestion = mutation({
  args: {
    queryText: v.string(),
    patientId: v.optional(v.id('patients')),
  },
  returns: responseValidator,
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx)
    const trimmed = args.queryText.trim()

    if (trimmed.length === 0) {
      throw new Error('Question cannot be empty.')
    }
    if (trimmed.length > 2000) {
      throw new Error('Question exceeds maximum length.')
    }

    let orgId = undefined
    if (args.patientId) {
      const patient = await ctx.db.get(args.patientId)
      if (!patient) throw new Error('Patient not found.')
      if (patient.userId !== user._id && user.role !== 'clinician' && user.role !== 'admin') {
        throw new Error('Unauthorized to ask on behalf of this patient.')
      }
      orgId = patient.orgId
    } else if (user.role === 'patient') {
      const patient = await ctx.db
        .query('patients')
        .withIndex('by_userId', q => q.eq('userId', user._id))
        .first()
      orgId = patient?.orgId
    }

    await seedEducationCorpusIfMissing(ctx)
    const { version, chunks } = await loadActiveCorpusChunks(ctx)
    const governance = await loadGovernanceState(ctx, orgId)
    const requestId = crypto.randomUUID()

    const response = processEducationQuestion({
      requestId,
      queryText: trimmed,
      chunks: chunks.map(chunk => ({
        chunkId: chunk.chunkId,
        sourceTitle: chunk.sourceTitle,
        sourceAuthority: chunk.sourceAuthority,
        section: chunk.section,
        effectiveDate: chunk.effectiveDate,
        text: chunk.text,
        keywords: chunk.keywords,
      })),
      corpusVersion: version?.versionId ?? EDUCATION_CORPUS_VERSION,
      environment: version?.environment ?? getCorpusEnvironment(),
      governance,
      orgId,
    })

    await ctx.db.insert('aiRequestAudit', {
      requestId: response.requestId,
      ctxSessionId: response.ctxSessionId,
      orgId,
      feature: 'rag',
      outcome: response.auditOutcome,
      promptFingerprint: computePromptFingerprintSync(trimmed),
      createdAt: Date.now(),
    })

    return response
  },
})
