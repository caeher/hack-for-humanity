import { describe, expect, it } from 'vitest'
import {
  formatCheckInConsistencyValue,
  formatTrendChangeText,
  formatTrendStatusText,
  mapChartPointsToTrendData,
} from './patientDashboard'

describe('patientDashboard helpers', () => {
  it('formats trend status conservatively when data is insufficient', () => {
    expect(formatTrendStatusText(null, 'insufficient')).toBe('Within-person comparison pending')
    expect(formatTrendChangeText('insufficient', null, 7)).toBe('Trend pending additional check-ins')
  })

  it('maps chart points for the trend chart component', () => {
    expect(
      mapChartPointsToTrendData([
        { dayLabel: 'Today', symptomBurden: 15, headache: 2 },
      ])
    ).toEqual([{ day: 'Today', symptomBurden: 15, headache: 2 }])
  })

  it('does not fabricate consistency percentages', () => {
    expect(formatCheckInConsistencyValue(null)).toBe('—')
    expect(formatCheckInConsistencyValue(92)).toBe('92%')
  })
})
