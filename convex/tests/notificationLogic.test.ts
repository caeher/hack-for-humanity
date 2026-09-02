import { describe, expect, it } from 'vitest'
import {
  buildSourceEventKey,
  NOTIFICATION_DISCLAIMER,
  sanitizeNotificationBody,
} from '../lib/notificationLogic'

describe('notificationLogic helpers', () => {
  it('builds stable deduplication keys', () => {
    const key = buildSourceEventKey('message', 'messages', 'msg1', 'user1')
    expect(key).toBe('message:messages:msg1:user1')
  })

  it('truncates long notification bodies', () => {
    const long = 'a'.repeat(400)
    const result = sanitizeNotificationBody(long, 100)
    expect(result.length).toBeLessThanOrEqual(100)
    expect(result.endsWith('…')).toBe(true)
  })

  it('includes non-emergency disclaimer copy', () => {
    expect(NOTIFICATION_DISCLAIMER).toMatch(/not emergency monitoring/i)
    expect(NOTIFICATION_DISCLAIMER).toMatch(/may be delayed/i)
  })
})
