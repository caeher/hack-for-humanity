/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Convex Observability & Telemetry API', () => {
  test('healthCheck returns healthy status and DB connectivity', async () => {
    const t = convexTest(schema, modules)
    const res = await t.query(api.observability.healthCheck, {})
    expect(res.status).toBe('healthy')
    expect(res.databaseConnected).toBe(true)
    expect(res.version).toBe('1.0.0')
    expect(res.timestamp).toBeGreaterThan(0)
  })

  test('recordTelemetry persists telemetry events with sanitized metadata', async () => {
    const t = convexTest(schema, modules)

    const eventId = await t.mutation(api.observability.recordTelemetry, {
      eventType: 'latency',
      operation: 'check_in_submission',
      durationMs: 145,
      status: 'success',
      correlationId: 'cri_corr_1710000000000_test123',
      metadata: {
        stepCount: 8,
        email: 'secret@hospital.org', // forbidden key, must be stripped
        symptomScore: 5, // forbidden key, must be stripped
      },
    })

    expect(eventId).toBeDefined()

    const saved = (await t.run(async ctx => ctx.db.get(eventId))) as Doc<'systemTelemetry'> | null
    expect(saved).not.toBeNull()
    expect(saved?.operation).toBe('check_in_submission')
    expect(saved?.durationMs).toBe(145)
    expect(saved?.correlationId).toBe('cri_corr_1710000000000_test123')
    expect(saved?.metadata).toEqual({ stepCount: 8 })
    expect(saved?.metadata).not.toHaveProperty('email')
    expect(saved?.metadata).not.toHaveProperty('symptomScore')
  })

  test('getTelemetryMetrics aggregates funnel, latency, safety, and retrieval metrics', async () => {
    const t = convexTest(schema, modules)

    // Insert test telemetry events
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'latency',
      operation: 'check_in_submission',
      durationMs: 200,
      status: 'success',
      correlationId: 'cri_corr_1710000000000_t1',
    })
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'latency',
      operation: 'check_in_submission',
      durationMs: 300,
      status: 'success',
      correlationId: 'cri_corr_1710000000000_t2',
    })

    // Funnel events: 2 starts, 1 complete
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'checkin_funnel',
      operation: 'checkin_start',
      status: 'success',
      correlationId: 'cri_corr_1710000000000_f1',
    })
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'checkin_funnel',
      operation: 'checkin_start',
      status: 'success',
      correlationId: 'cri_corr_1710000000000_f2',
    })
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'checkin_funnel',
      operation: 'checkin_complete',
      status: 'success',
      correlationId: 'cri_corr_1710000000000_f1',
    })

    // Safety executions: 1 safe, 1 red flag intercept
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'safety_rule_execution',
      operation: 'checkin_safety_eval',
      status: 'success',
      correlationId: 'cri_corr_1710000000000_s1',
    })
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'safety_rule_execution',
      operation: 'checkin_safety_eval',
      status: 'intercept',
      correlationId: 'cri_corr_1710000000000_s2',
    })

    // Retrieval quality
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'retrieval_quality',
      operation: 'rag_query',
      status: 'success',
      correlationId: 'cri_corr_1710000000000_r1',
    })
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'retrieval_quality',
      operation: 'rag_query',
      status: 'fallback',
      correlationId: 'cri_corr_1710000000000_r2',
    })

    // Error
    await t.mutation(api.observability.recordTelemetry, {
      eventType: 'error',
      operation: 'network_fetch',
      status: 'failure',
      correlationId: 'cri_corr_1710000000000_e1',
    })

    const metrics = await t.query(api.observability.getTelemetryMetrics, { lookbackHours: 1 })

    expect(metrics.totalEvents).toBe(10)
    expect(metrics.latency.avgCheckInSubmissionMs).toBe(250)
    expect(metrics.funnel.checkInStarts).toBe(2)
    expect(metrics.funnel.checkInCompletions).toBe(1)
    expect(metrics.funnel.completionRatePct).toBe(50)
    expect(metrics.safety.totalEvaluations).toBe(2)
    expect(metrics.safety.redFlagIntercepts).toBe(1)
    expect(metrics.retrievalQuality.totalQueries).toBe(2)
    expect(metrics.retrievalQuality.fallbackCount).toBe(1)
    expect(metrics.retrievalQuality.fallbackRatePct).toBe(50)
    expect(metrics.errorRate.totalErrors).toBe(1)
  })
})
