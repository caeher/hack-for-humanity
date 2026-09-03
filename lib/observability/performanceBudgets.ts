/**
 * Performance budgets for CRI across Mobile and Desktop viewports.
 * Concussion recovery interfaces require strict latency caps to prevent
 * visual disorientation and cognitive fatigue.
 */

export interface DeviceBudget {
  initialPageLoadLcpMs: number
  inpMs: number
  cls: number
  stepTransitionMs: number
  checkInSubmissionMs: number
  dangerSignInterceptMs: number
  dashboardTelemetryLoadMs: number
  ragResponseMs: number
  reportGenerationPreviewMs: number
  clientBundleSizeKb: number
}

export const PERFORMANCE_BUDGETS: Record<'mobile' | 'desktop', DeviceBudget> = {
  mobile: {
    initialPageLoadLcpMs: 2500,
    inpMs: 200,
    cls: 0.1,
    stepTransitionMs: 100,
    checkInSubmissionMs: 500,
    dangerSignInterceptMs: 50,
    dashboardTelemetryLoadMs: 500,
    ragResponseMs: 1000,
    reportGenerationPreviewMs: 800,
    clientBundleSizeKb: 250,
  },
  desktop: {
    initialPageLoadLcpMs: 1800,
    inpMs: 100,
    cls: 0.05,
    stepTransitionMs: 80,
    checkInSubmissionMs: 350,
    dangerSignInterceptMs: 30,
    dashboardTelemetryLoadMs: 400,
    ragResponseMs: 800,
    reportGenerationPreviewMs: 600,
    clientBundleSizeKb: 300,
  },
}

export interface BudgetViolation {
  metric: string
  expectedMax: number
  actual: number
  diff: number
  device: 'mobile' | 'desktop'
}

export interface BudgetEvaluationResult {
  device: 'mobile' | 'desktop'
  passed: boolean
  totalChecked: number
  passedCount: number
  violations: BudgetViolation[]
}

/**
 * Evaluates measured metrics against the target device budget.
 */
export function evaluatePerformanceBudgets(
  device: 'mobile' | 'desktop',
  measurements: Partial<Record<keyof DeviceBudget, number>>
): BudgetEvaluationResult {
  const budget = PERFORMANCE_BUDGETS[device]
  const violations: BudgetViolation[] = []
  let totalChecked = 0
  let passedCount = 0

  for (const [key, value] of Object.entries(measurements)) {
    const metricName = key as keyof DeviceBudget
    if (value !== undefined && budget[metricName] !== undefined) {
      totalChecked++
      const expectedMax = budget[metricName]
      if (value > expectedMax) {
        violations.push({
          metric: metricName,
          expectedMax,
          actual: value,
          diff: value - expectedMax,
          device,
        })
      } else {
        passedCount++
      }
    }
  }

  return {
    device,
    passed: violations.length === 0,
    totalChecked,
    passedCount,
    violations,
  }
}
