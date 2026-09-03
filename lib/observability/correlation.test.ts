import { describe, it, expect } from 'vitest'
import {
  generateCorrelationId,
  isValidCorrelationId,
  extractCorrelationId,
  getOrCreateCorrelationId,
  CORRELATION_HEADER_NAME,
  REQUEST_ID_HEADER_NAME,
} from './correlation'

describe('Correlation ID utility', () => {
  it('generates valid correlation IDs with timestamp and hex random', () => {
    const id = generateCorrelationId()
    expect(isValidCorrelationId(id)).toBe(true)
    expect(id).toMatch(/^cri_corr_\d{10,14}_[a-f0-9]{8,16}$/)
  })

  it('generates unique IDs on consecutive calls', () => {
    const id1 = generateCorrelationId()
    const id2 = generateCorrelationId()
    expect(id1).not.toBe(id2)
  })

  it('validates correlation ID format accurately', () => {
    expect(isValidCorrelationId('cri_corr_1710000000000_abc12345')).toBe(true)
    expect(isValidCorrelationId('invalid_id')).toBe(false)
    expect(isValidCorrelationId('')).toBe(false)
    expect(isValidCorrelationId(null)).toBe(false)
    expect(isValidCorrelationId(12345)).toBe(false)
  })

  it('extracts correlation ID from Headers object', () => {
    const headers = new Headers()
    headers.set(CORRELATION_HEADER_NAME, 'cri_corr_1710000000000_abc12345')
    expect(extractCorrelationId(headers)).toBe('cri_corr_1710000000000_abc12345')
  })

  it('extracts correlation ID from x-request-id fallback in Headers', () => {
    const headers = new Headers()
    headers.set(REQUEST_ID_HEADER_NAME, 'cri_corr_1710000000000_req12345')
    expect(extractCorrelationId(headers)).toBe('cri_corr_1710000000000_req12345')
  })

  it('extracts correlation ID from plain object record', () => {
    const record = { 'x-correlation-id': 'cri_corr_1710000000000_rec12345' }
    expect(extractCorrelationId(record)).toBe('cri_corr_1710000000000_rec12345')
  })

  it('getOrCreateCorrelationId reuses valid extracted ID or creates a fresh one', () => {
    const valid = 'cri_corr_1710000000000_abc12345'
    const headers = { 'x-correlation-id': valid }
    expect(getOrCreateCorrelationId(headers)).toBe(valid)

    const emptyHeaders = {}
    const fresh = getOrCreateCorrelationId(emptyHeaders)
    expect(isValidCorrelationId(fresh)).toBe(true)
  })
})
