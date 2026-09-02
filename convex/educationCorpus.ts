/**
 * Education corpus queries and seeding.
 */

import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { requireUser } from './lib/auth'
import {
  getActiveCorpusVersion,
  getCorpusEnvironment,
  loadActiveCorpusChunks,
  seedEducationCorpusIfMissing,
} from './lib/educationLogic'

export const getActiveVersion = query({
  args: {},
  returns: v.union(
    v.object({
      versionId: v.string(),
      environment: v.string(),
      effectiveDate: v.string(),
      chunkCount: v.number(),
    }),
    v.null()
  ),
  handler: async ctx => {
    await requireUser(ctx)
    const version = await getActiveCorpusVersion(ctx)
    if (!version) return null

    return {
      versionId: version.versionId,
      environment: version.environment,
      effectiveDate: version.effectiveDate,
      chunkCount: version.chunkCount,
    }
  },
})

export const listActiveChunks = query({
  args: {},
  returns: v.array(
    v.object({
      chunkId: v.string(),
      sourceTitle: v.string(),
      sourceAuthority: v.string(),
      section: v.string(),
      effectiveDate: v.string(),
      text: v.string(),
      keywords: v.array(v.string()),
    })
  ),
  handler: async ctx => {
    await requireUser(ctx)
    const { chunks } = await loadActiveCorpusChunks(ctx)
    return chunks.map(chunk => ({
      chunkId: chunk.chunkId,
      sourceTitle: chunk.sourceTitle,
      sourceAuthority: chunk.sourceAuthority,
      section: chunk.section,
      effectiveDate: chunk.effectiveDate,
      text: chunk.text,
      keywords: chunk.keywords,
    }))
  },
})

export const seedCorpus = internalMutation({
  args: {},
  returns: v.object({
    seeded: v.boolean(),
    versionId: v.union(v.id('educationCorpusVersions'), v.null()),
  }),
  handler: async ctx => seedEducationCorpusIfMissing(ctx),
})

export const getEnvironment = query({
  args: {},
  returns: v.string(),
  handler: async () => getCorpusEnvironment(),
})
