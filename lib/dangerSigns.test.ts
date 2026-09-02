import { describe, expect, it } from 'vitest'
import { mapDangerSignIdsToCdcLabels, DANGER_SIGN_OPTIONS } from './dangerSigns'

describe('dangerSigns', () => {
  it('maps UI ids to canonical CDC labels for persistence', () => {
    expect(mapDangerSignIdsToCdcLabels(['repeated-vomiting', 'seizure'])).toEqual([
      'Repeated vomiting or nausea',
      'Seizures or convulsions',
    ])
  })

  it('deduplicates overlapping CDC labels when multiple UI options map to one rule', () => {
    const labels = mapDangerSignIdsToCdcLabels(['slurred-speech', 'weakness'])
    expect(labels).toEqual([
      'Slurred speech, weakness, numbness, or decreased coordination',
    ])
  })

  it('defines eight danger-sign options for the check-in UI', () => {
    expect(DANGER_SIGN_OPTIONS).toHaveLength(8)
  })
})
