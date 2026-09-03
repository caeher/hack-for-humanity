import { describe, it, expect } from 'vitest'
import {
  evaluatePerformanceBudgets,
  PERFORMANCE_BUDGETS,
} from './performanceBudgets'

describe('Performance budgets evaluation', () => {
  it('passes when mobile metrics comply with budgets', () => {
    const measurements = {
      initialPageLoadLcpMs: 1400,
      inpMs: 80,
      cls: 0.02,
      stepTransitionMs: 40,
      checkInSubmissionMs: 250,
      dangerSignInterceptMs: 20,
      clientBundleSizeKb: 210,
    }

    const result = evaluatePerformanceBudgets('mobile', measurements)
    expect(result.passed).toBe(true)
    expect(result.violations.length).toBe(0)
    expect(result.passedCount).toBe(7)
  })

  it('detects violations when mobile metrics exceed budget thresholds', () => {
    const measurements = {
      initialPageLoadLcpMs: 2800, // exceeds 2500ms
      stepTransitionMs: 150, // exceeds 100ms
      cls: 0.04, // passes <= 0.1
    }

    const result = evaluatePerformanceBudgets('mobile', measurements)
    expect(result.passed).toBe(false)
    expect(result.violations.length).toBe(2)
    expect(result.violations[0].metric).toBe('initialPageLoadLcpMs')
    expect(result.violations[0].diff).toBe(300)
    expect(result.violations[1].metric).toBe('stepTransitionMs')
    expect(result.violations[1].diff).toBe(50)
  })

  it('passes when desktop metrics comply with budgets', () => {
    const measurements = {
      initialPageLoadLcpMs: 950,
      inpMs: 40,
      cls: 0.01,
      dashboardTelemetryLoadMs: 180,
      ragResponseMs: 450,
      reportGenerationPreviewMs: 320,
      clientBundleSizeKb: 260,
    }

    const result = evaluatePerformanceBudgets('desktop', measurements)
    expect(result.passed).toBe(true)
    expect(result.violations.length).toBe(0)
    expect(result.passedCount).toBe(7)
  })

  it('detects desktop violations when query latency exceeds threshold', () => {
    const measurements = {
      ragResponseMs: 1200, // exceeds 800ms
      dashboardTelemetryLoadMs: 450, // exceeds 400ms
    }

    const result = evaluatePerformanceBudgets('desktop', measurements)
    expect(result.passed).toBe(false)
    expect(result.violations.length).toBe(2)
  })

  it('contains valid budget definitions for both profiles', () => {
    expect(PERFORMANCE_BUDGETS.mobile.initialPageLoadLcpMs).toBe(2500)
    expect(PERFORMANCE_BUDGETS.desktop.initialPageLoadLcpMs).toBe(1800)
    expect(PERFORMANCE_BUDGETS.mobile.dangerSignInterceptMs).toBe(50)
    expect(PERFORMANCE_BUDGETS.desktop.dangerSignInterceptMs).toBe(30)
  })
})
