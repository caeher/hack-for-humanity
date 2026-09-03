/**
 * End-to-end correlation ID generator and extraction utility.
 * Formats: cri_corr_<timestamp_ms>_<random_hex>
 * No PII or clinical information is encoded.
 */

export const CORRELATION_HEADER_NAME = 'x-correlation-id'
export const REQUEST_ID_HEADER_NAME = 'x-request-id'

const CORRELATION_ID_REGEX = /^cri_corr_\d{10,14}_[a-f0-9]{8,16}$/

/**
 * Generates a privacy-safe, unique correlation ID.
 */
export function generateCorrelationId(prefix = 'cri_corr'): string {
  const timestamp = Date.now()
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : Math.random().toString(36).slice(2, 12)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * Validates whether an ID matches the CRI correlation ID format.
 */
export function isValidCorrelationId(id: unknown): id is string {
  if (typeof id !== 'string') return false
  return CORRELATION_ID_REGEX.test(id)
}

/**
 * Extracts correlation ID from Headers or plain object, or returns null.
 */
export function extractCorrelationId(
  headers: Headers | Record<string, string | undefined | null>
): string | null {
  if (!headers) return null

  if (typeof (headers as Headers).get === 'function') {
    const val = (headers as Headers).get(CORRELATION_HEADER_NAME) || (headers as Headers).get(REQUEST_ID_HEADER_NAME)
    return val?.trim() || null
  }

  const record = headers as Record<string, string | undefined | null>
  const found =
    record[CORRELATION_HEADER_NAME] ||
    record[CORRELATION_HEADER_NAME.toLowerCase()] ||
    record[REQUEST_ID_HEADER_NAME] ||
    record[REQUEST_ID_HEADER_NAME.toLowerCase()]

  return found ? String(found).trim() : null
}

/**
 * Extracts existing correlation ID or creates a fresh one.
 */
export function getOrCreateCorrelationId(
  headers?: Headers | Record<string, string | undefined | null>
): string {
  if (headers) {
    const extracted = extractCorrelationId(headers)
    if (extracted && isValidCorrelationId(extracted)) {
      return extracted
    }
  }
  return generateCorrelationId()
}
