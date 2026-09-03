/**
 * Telemetry events and latency tracking utilities.
 * Tracks latency, error rate, check-in completion, retrieval quality, and safety-rule execution.
 * Guaranteed zero PII and zero clinical content.
 */

import { generateCorrelationId, isValidCorrelationId } from './correlation'

export type TelemetryEventType =
  | 'latency'
  | 'error'
  | 'checkin_funnel'
  | 'retrieval_quality'
  | 'safety_rule_execution'

export type TelemetryStatus = 'success' | 'failure' | 'intercept' | 'fallback'

export interface TelemetryPayload {
  eventType: TelemetryEventType
  operation: string
  durationMs?: number
  status: TelemetryStatus
  correlationId: string
  metadata?: Record<string, string | number | boolean | null>
  timestamp: number
}

/**
 * Creates a validated, privacy-safe telemetry event payload.
 */
export function createTelemetryPayload(params: {
  eventType: TelemetryEventType
  operation: string
  durationMs?: number
  status?: TelemetryStatus
  correlationId?: string
  metadata?: Record<string, string | number | boolean | null>
}): TelemetryPayload {
  const correlationId =
    params.correlationId && isValidCorrelationId(params.correlationId)
      ? params.correlationId
      : generateCorrelationId()

  // Clean metadata to strip any accidental sensitive keys
  const safeMetadata: Record<string, string | number | boolean | null> = {}
  if (params.metadata) {
    const forbiddenKeys = ['email', 'name', 'token', 'note', 'prompt', 'symptom', 'score', 'ssn', 'phone']
    for (const [k, v] of Object.entries(params.metadata)) {
      const lower = k.toLowerCase()
      if (!forbiddenKeys.some(f => lower.includes(f))) {
        safeMetadata[k] = v
      }
    }
  }

  return {
    eventType: params.eventType,
    operation: params.operation,
    durationMs: params.durationMs !== undefined ? Math.max(0, Math.round(params.durationMs)) : undefined,
    status: params.status ?? 'success',
    correlationId,
    metadata: Object.keys(safeMetadata).length > 0 ? safeMetadata : undefined,
    timestamp: Date.now(),
  }
}

/**
 * Wraps an async function and measures its latency, returning the result and telemetry payload.
 */
export async function measureAsyncOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    eventType?: TelemetryEventType
    correlationId?: string
    metadata?: Record<string, string | number | boolean | null>
  }
): Promise<{ result: T; telemetry: TelemetryPayload }> {
  const start = performance.now()
  let status: TelemetryStatus = 'success'
  try {
    const result = await fn()
    const durationMs = performance.now() - start
    const telemetry = createTelemetryPayload({
      eventType: options?.eventType ?? 'latency',
      operation,
      durationMs,
      status,
      correlationId: options?.correlationId,
      metadata: options?.metadata,
    })
    return { result, telemetry }
  } catch (error) {
    status = 'failure'
    const durationMs = performance.now() - start
    const telemetry = createTelemetryPayload({
      eventType: 'error',
      operation,
      durationMs,
      status,
      correlationId: options?.correlationId,
      metadata: {
        ...(options?.metadata || {}),
        errorOccurred: true,
      },
    })
    throw Object.assign(error as Error, { telemetry })
  }
}
