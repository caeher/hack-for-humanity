/**
 * Deterministic keyword retrieval over approved corpus chunks.
 * No model general knowledge — only indexed corpus content.
 */

import type { EducationCorpusChunk, RetrievedChunk } from './types'

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'what',
  'how',
  'can',
  'do',
  'does',
  'should',
  'my',
  'i',
  'me',
  'for',
  'during',
  'after',
  'about',
  'when',
  'if',
  'to',
  'in',
  'on',
  'of',
  'and',
  'or',
  'this',
  'that',
  'with',
  'have',
  'has',
  'been',
  'be',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token))
}

function scoreChunk(queryTokens: string[], chunk: EducationCorpusChunk): number {
  const haystack = `${chunk.text} ${chunk.section} ${chunk.keywords.join(' ')}`.toLowerCase()
  let score = 0

  for (const token of queryTokens) {
    if (haystack.includes(token)) {
      score += 2
    }
  }

  for (const keyword of chunk.keywords) {
    const normalizedKeyword = keyword.toLowerCase()
    if (queryTokens.some(token => normalizedKeyword.includes(token) || token.includes(normalizedKeyword))) {
      score += 3
    }
  }

  return score
}

export function retrieveCorpusChunks(params: {
  queryText: string
  chunks: EducationCorpusChunk[]
  limit?: number
  minScore?: number
}): RetrievedChunk[] {
  const queryTokens = tokenize(params.queryText)
  const limit = params.limit ?? 3
  const minScore = params.minScore ?? 2

  const scored = params.chunks
    .map(chunk => ({ ...chunk, score: scoreChunk(queryTokens, chunk) }))
    .filter(chunk => chunk.score >= minScore)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}

export function filterChunksByClassification(
  chunks: EducationCorpusChunk[],
  classification: 'education' | 'app_help'
): EducationCorpusChunk[] {
  if (classification === 'app_help') {
    return chunks.filter(chunk => chunk.chunkId.startsWith('cri-app-') || chunk.sourceAuthority === 'CRI Clinical Scope')
  }
  return chunks.filter(chunk => !chunk.chunkId.startsWith('cri-app-'))
}
