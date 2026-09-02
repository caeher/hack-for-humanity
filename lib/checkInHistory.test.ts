import { describe, expect, test } from 'vitest'
import {
  formatReporterRole,
  formatSafetyStatus,
  getLocalDateString,
  isPermissionDeniedMessage,
} from './checkInHistory'

describe('checkInHistory client helpers', () => {
  test('getLocalDateString respects an explicit time zone', () => {
    const formatted = getLocalDateString(new Date('2026-09-01T04:00:00.000Z'), 'America/New_York')
    expect(formatted).toMatch(/2026-08-31|2026-09-01/)
  })

  test('formatSafetyStatus maps clinical statuses to UI labels', () => {
    expect(formatSafetyStatus('safe').label).toBe('Routine')
    expect(formatSafetyStatus('elevated').tone).toBe('bad')
  })

  test('formatReporterRole humanizes roles', () => {
    expect(formatReporterRole('caregiver')).toBe('Caregiver')
  })

  test('isPermissionDeniedMessage detects auth failures', () => {
    expect(isPermissionDeniedMessage('Forbidden: Caregiver consent grant lacks permission')).toBe(true)
    expect(isPermissionDeniedMessage('Network request failed')).toBe(false)
  })
})
