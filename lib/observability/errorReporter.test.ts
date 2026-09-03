import { describe, it, expect, vi } from 'vitest'
import {
  sanitizeErrorMessage,
  classifyError,
  createStructuredErrorReport,
  reportError,
} from './errorReporter'

describe('Privacy-safe error reporter', () => {
  it('strips API keys and bearer tokens from error messages', () => {
    const raw = 'Failed to connect to provider with key sk-abcdef123456789012345678 and Bearer eyJhbGciOiJIUzI1NiJ9.token.sig'
    const sanitized = sanitizeErrorMessage(raw)
    expect(sanitized).not.toContain('sk-abcdef123456789012345678')
    expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiJ9.token.sig')
    expect(sanitized).toContain('[REDACTED_API_KEY]')
    expect(sanitized).toContain('Bearer [REDACTED_TOKEN]')
  })

  it('strips email addresses and phone numbers', () => {
    const raw = 'User clinician@hospital.org with phone +1 (555) 234-5678 encountered an error'
    const sanitized = sanitizeErrorMessage(raw)
    expect(sanitized).not.toContain('clinician@hospital.org')
    expect(sanitized).not.toContain('555')
    expect(sanitized).toContain('[REDACTED_EMAIL]')
    expect(sanitized).toContain('[REDACTED_PHONE]')
  })

  it('strips symptom scores and Likert ratings from error logs', () => {
    const raw = 'Check-in validation failed: headache: 5 and nausea: 3 with symptomTotal: 28'
    const sanitized = sanitizeErrorMessage(raw)
    expect(sanitized).not.toContain('headache: 5')
    expect(sanitized).not.toContain('nausea: 3')
    expect(sanitized).not.toContain('symptomTotal: 28')
    expect(sanitized).toContain('headache:[REDACTED_SCORE]')
    expect(sanitized).toContain('nausea:[REDACTED_SCORE]')
    expect(sanitized).toContain('symptomTotal:[REDACTED_SCORE]')
  })

  it('strips emergency danger sign text and clinical free text', () => {
    const raw = 'Danger sign selected: repeated vomiting. Notes: clinicalNote=patient reported stumble after dinner'
    const sanitized = sanitizeErrorMessage(raw)
    expect(sanitized).not.toContain('repeated vomiting')
    expect(sanitized).not.toContain('stumble after dinner')
    expect(sanitized).toContain('[REDACTED_DANGER_SIGN]')
    expect(sanitized).toContain('clinicalNote=[REDACTED_CLINICAL_NOTE]')
  })

  it('classifies errors into standard non-sensitive categories', () => {
    expect(classifyError(new Error('Unauthorized JWT missing')).category).toBe('AUTH_FAILURE')
    expect(classifyError(new Error('Rate limit exceeded 429')).category).toBe('RATE_LIMITED')
    expect(classifyError(new Error('Convex database connection refused')).category).toBe('DATABASE_UNAVAILABLE')
    expect(classifyError(new Error('fetch failed network error')).category).toBe('NETWORK_ERROR')
    expect(classifyError(new Error('AI provider kill switch active')).category).toBe('AI_PROVIDER_ERROR')
    expect(classifyError(new Error('Validation error: field is required')).category).toBe('VALIDATION_ERROR')
    expect(classifyError(new Error('Cannot read property of undefined')).category).toBe('CLIENT_RUNTIME_ERROR')
    expect(classifyError(new Error('Something unusual happened')).category).toBe('UNKNOWN')
  })

  it('creates structured error report with valid correlation ID and no sensitive payload', () => {
    const error = new Error('Database connection dropped while loading clinicalNote=confidential note')
    const report = createStructuredErrorReport(error, {
      component: 'PatientDashboard',
      path: '/patient/dashboard',
    })

    expect(report.correlationId).toMatch(/^cri_corr_/)
    expect(report.errorCategory).toBe('DATABASE_UNAVAILABLE')
    expect(report.sanitizedMessage).not.toContain('confidential note')
    expect(report.sanitizedMessage).toContain('clinicalNote=[REDACTED_CLINICAL_NOTE]')
    expect(report.component).toBe('PatientDashboard')
    expect(report.path).toBe('/patient/dashboard')
    expect(report.timestamp).toBeGreaterThan(0)
  })

  it('reportError logs structured single line and returns report', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('network failed')

    const report = reportError(error, { component: 'CheckInWizard' })
    expect(consoleSpy).toHaveBeenCalledOnce()
    const loggedStr = consoleSpy.mock.calls[0][0]
    expect(loggedStr).toContain('[OPERATOR_ERROR]')
    expect(loggedStr).toContain(report.correlationId)
    expect(loggedStr).toContain('category=NETWORK_ERROR')

    consoleSpy.mockRestore()
  })
})
