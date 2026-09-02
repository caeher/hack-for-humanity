/**
 * Education corpus seeding and environment-scoped retrieval helpers.
 */

import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { Doc, Id } from '../_generated/dataModel'
import { APPROVED_CORPUS_CHUNKS_V1, EDUCATION_CORPUS_VERSION } from '@/lib/education'

export function getCorpusEnvironment(): string {
  return process.env.CONVEX_ENVIRONMENT ?? 'development'
}

export async function getActiveCorpusVersion(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<'educationCorpusVersions'> | null> {
  const environment = getCorpusEnvironment()

  return await ctx.db
    .query('educationCorpusVersions')
    .withIndex('by_environment_and_status', q =>
      q.eq('environment', environment).eq('status', 'active')
    )
    .first()
}

export async function loadActiveCorpusChunks(ctx: QueryCtx | MutationCtx) {
  const version = await getActiveCorpusVersion(ctx)
  if (!version) return { version: null, chunks: [] as Doc<'educationCorpusChunks'>[] }

  const chunks = await ctx.db
    .query('educationCorpusChunks')
    .withIndex('by_corpusVersionId', q => q.eq('corpusVersionId', version._id))
    .collect()

  return { version, chunks }
}

export async function seedEducationCorpusIfMissing(ctx: MutationCtx): Promise<{
  seeded: boolean
  versionId: Id<'educationCorpusVersions'> | null
}> {
  const environment = getCorpusEnvironment()
  const existing = await ctx.db
    .query('educationCorpusVersions')
    .withIndex('by_versionId_and_environment', q =>
      q.eq('versionId', EDUCATION_CORPUS_VERSION).eq('environment', environment)
    )
    .first()

  if (existing) {
    return { seeded: false, versionId: existing._id }
  }

  const now = Date.now()
  const versionId = await ctx.db.insert('educationCorpusVersions', {
    versionId: EDUCATION_CORPUS_VERSION,
    environment,
    effectiveDate: '2025-01-01',
    status: 'active',
    chunkCount: APPROVED_CORPUS_CHUNKS_V1.length,
    createdAt: now,
  })

  for (const chunk of APPROVED_CORPUS_CHUNKS_V1) {
    await ctx.db.insert('educationCorpusChunks', {
      corpusVersionId: versionId,
      chunkId: chunk.chunkId,
      sourceTitle: chunk.sourceTitle,
      sourceAuthority: chunk.sourceAuthority,
      section: chunk.section,
      effectiveDate: chunk.effectiveDate,
      text: chunk.text,
      keywords: chunk.keywords,
    })
  }

  return { seeded: true, versionId }
}

export async function loadGovernanceState(ctx: QueryCtx | MutationCtx, orgId?: Id<'organizations'>) {
  const globalConfig = await ctx.db
    .query('aiGovernanceConfig')
    .withIndex('by_scope', q => q.eq('scope', 'global'))
    .first()

  let orgConfig = null
  if (orgId) {
    orgConfig = await ctx.db
      .query('aiGovernanceConfig')
      .withIndex('by_orgId', q => q.eq('orgId', orgId))
      .first()
  }

  return {
    globalKillSwitch: (globalConfig?.globalKillSwitch ?? false) || (orgConfig?.globalKillSwitch ?? false),
    orgKillSwitches: orgId && orgConfig?.globalKillSwitch ? { [orgId]: true } : {},
    featureKillSwitches: {
      ...(globalConfig?.featureKillSwitches ?? {}),
    },
    dailyCostLimitCents: globalConfig?.dailyCostLimitCents ?? 1000,
    currentDailyCostCents: globalConfig?.currentDailyCostCents ?? 0,
  }
}
