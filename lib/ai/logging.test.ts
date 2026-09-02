import { describe, expect, test } from 'vitest'

import {
  createAuditEntry,
  formatAuditLogLine,
  redactErrorForLog,
  validateLogEntry,
} from './logging'

describe('logging', () => {
  test('createAuditEntry never includes prompt content', () => {
    const entry = createAuditEntry({
      requestId: 'req-123',
      ctxSessionId: 'ctx-456',
      feature: 'rag',
      outcome: 'success',
      promptContent: 'What sleep hygiene helps during recovery?',
    })

    expect(entry).not.toHaveProperty('prompt')
    expect(entry).not.toHaveProperty('response')
    expect(entry.promptFingerprint).toBeTruthy()
    expect(entry.promptFingerprint.length).toBeGreaterThan(0)
  })

  test('validateLogEntry rejects forbidden fields', () => {
    const result = validateLogEntry({
      requestId: 'req-1',
      prompt: 'full prompt text',
      outcome: 'success',
    })
    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes('prompt'))).toBe(true)
  })

  test('validateLogEntry rejects API keys in content', () => {
    const result = validateLogEntry({
      requestId: 'req-1',
      apiKey: 'sk-abcdefghijklmnopqrstuvwxyz123456',
    })
    expect(result.safe).toBe(false)
  })

  test('formatAuditLogLine contains metadata only', () => {
    const entry = createAuditEntry({
      requestId: 'req-abc-def-ghi',
      ctxSessionId: 'ctx-session-id',
      feature: 'insights',
      outcome: 'blocked_injection',
      promptContent: 'secret prompt',
    })
    const line = formatAuditLogLine(entry)
    expect(line).toContain('[AI_AUDIT]')
    expect(line).toContain('outcome=blocked_injection')
    expect(line).not.toContain('secret prompt')
  })

  test('redactErrorForLog strips secrets from errors', () => {
    const redacted = redactErrorForLog(new Error('Failed with sk-abcdefghijklmnopqrstuvwxyz123456'))
    expect(redacted).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123456')
    expect(redacted).toContain('[REDACTED_KEY]')
  })
})
