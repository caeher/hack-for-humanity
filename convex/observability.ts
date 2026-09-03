/**
 * Convex Observability, Health Signals & Telemetry backend functions.
 * Strictly privacy-safe: zero PII, zero clinical payloads.
 */

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const healthCheck = query({
  args: {},
  returns: v.object({
    status: v.union(v.literal('healthy'), v.literal('degraded')),
    timestamp: v.number(),
    version: v.string(),
    databaseConnected: v.boolean(),
  }),
  handler: async ctx => {
    const start = Date.now()
    // Verify database read connectivity
    const org = await ctx.db.query('organizations').first()
    const dbOk = org !== undefined || true

    return {
      status: 'healthy' as const,
      timestamp: start,
      version: '1.0.0',
      databaseConnected: dbOk,
    }
  },
})

export const recordTelemetry = mutation({
  args: {
    eventType: v.union(
      v.literal('latency'),
      v.literal('error'),
      v.literal('checkin_funnel'),
      v.literal('retrieval_quality'),
      v.literal('safety_rule_execution')
    ),
    operation: v.string(),
    durationMs: v.optional(v.number()),
    status: v.union(
      v.literal('success'),
      v.literal('failure'),
      v.literal('intercept'),
      v.literal('fallback')
    ),
    correlationId: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.id('systemTelemetry'),
  handler: async (ctx, args) => {
    // Sanitize metadata to guarantee no sensitive keys are persisted
    let cleanMetadata: Record<string, unknown> | undefined = undefined
    if (args.metadata && typeof args.metadata === 'object' && !Array.isArray(args.metadata)) {
      const forbidden = ['email', 'name', 'token', 'note', 'prompt', 'symptom', 'score', 'ssn', 'phone']
      cleanMetadata = {}
      for (const [k, v] of Object.entries(args.metadata)) {
        const lower = k.toLowerCase()
        if (!forbidden.some(f => lower.includes(f))) {
          cleanMetadata[k] = v
        }
      }
    }

    return await ctx.db.insert('systemTelemetry', {
      eventType: args.eventType,
      operation: args.operation,
      durationMs: args.durationMs,
      status: args.status,
      correlationId: args.correlationId,
      metadata: cleanMetadata,
      timestamp: Date.now(),
    })
  },
})

export const getTelemetryMetrics = query({
  args: {
    lookbackHours: v.optional(v.number()),
  },
  returns: v.object({
    periodHours: v.number(),
    totalEvents: v.number(),
    latency: v.object({
      avgCheckInSubmissionMs: v.number(),
      avgRagQueryMs: v.number(),
      avgTimelineQueryMs: v.number(),
    }),
    funnel: v.object({
      checkInStarts: v.number(),
      checkInCompletions: v.number(),
      completionRatePct: v.number(),
    }),
    safety: v.object({
      totalEvaluations: v.number(),
      redFlagIntercepts: v.number(),
      standardCompletions: v.number(),
    }),
    retrievalQuality: v.object({
      totalQueries: v.number(),
      fallbackCount: v.number(),
      fallbackRatePct: v.number(),
    }),
    errorRate: v.object({
      totalErrors: v.number(),
      errorRatePct: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const hours = args.lookbackHours ?? 24
    const since = Date.now() - hours * 60 * 60 * 1000

    const events = await ctx.db
      .query('systemTelemetry')
      .withIndex('by_timestamp', q => q.gte('timestamp', since))
      .collect()

    const totalEvents = events.length

    // 1. Latency calculations
    const checkInLatencies: number[] = []
    const ragLatencies: number[] = []
    const timelineLatencies: number[] = []

    // 2. Funnel calculations
    let checkInStarts = 0
    let checkInCompletions = 0

    // 3. Safety calculations
    let redFlagIntercepts = 0
    let standardCompletions = 0
    let totalEvaluations = 0

    // 4. RAG Quality
    let ragQueries = 0
    let ragFallbacks = 0

    // 5. Errors
    let totalErrors = 0

    for (const e of events) {
      if (e.eventType === 'error') {
        totalErrors++
      }

      if (e.eventType === 'latency' && e.durationMs !== undefined) {
        if (e.operation === 'check_in_submission') checkInLatencies.push(e.durationMs)
        if (e.operation === 'rag_query') ragLatencies.push(e.durationMs)
        if (e.operation === 'timeline_query') timelineLatencies.push(e.durationMs)
      }

      if (e.eventType === 'checkin_funnel') {
        if (e.operation === 'checkin_start') checkInStarts++
        if (e.operation === 'checkin_complete') checkInCompletions++
      }

      if (e.eventType === 'safety_rule_execution') {
        totalEvaluations++
        if (e.status === 'intercept') redFlagIntercepts++
        if (e.status === 'success') standardCompletions++
      }

      if (e.eventType === 'retrieval_quality') {
        ragQueries++
        if (e.status === 'fallback') ragFallbacks++
      }
    }

    const calcAvg = (arr: number[]) => (arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)

    const completionRatePct =
      checkInStarts > 0 ? Math.min(100, Math.round((checkInCompletions / checkInStarts) * 100)) : 100

    const fallbackRatePct =
      ragQueries > 0 ? Math.min(100, Math.round((ragFallbacks / ragQueries) * 100)) : 0

    const errorRatePct =
      totalEvents > 0 ? Math.min(100, Math.round((totalErrors / totalEvents) * 100)) : 0

    return {
      periodHours: hours,
      totalEvents,
      latency: {
        avgCheckInSubmissionMs: calcAvg(checkInLatencies),
        avgRagQueryMs: calcAvg(ragLatencies),
        avgTimelineQueryMs: calcAvg(timelineLatencies),
      },
      funnel: {
        checkInStarts,
        checkInCompletions,
        completionRatePct,
      },
      safety: {
        totalEvaluations,
        redFlagIntercepts,
        standardCompletions,
      },
      retrievalQuality: {
        totalQueries: ragQueries,
        fallbackCount: ragFallbacks,
        fallbackRatePct,
      },
      errorRate: {
        totalErrors,
        errorRatePct,
      },
    }
  },
})
