import { describe, expect, it } from 'vitest'
import { COMPLETION_STATUS_DESCRIPTIONS, COMPLETION_STATUS_LABELS } from './carePlan'

describe('carePlan client helpers', () => {
  it('uses non-punitive language for skipped and unable states', () => {
    expect(COMPLETION_STATUS_LABELS.skipped).not.toMatch(/fail/i)
    expect(COMPLETION_STATUS_DESCRIPTIONS.skipped).toContain('not emergencies')
    expect(COMPLETION_STATUS_DESCRIPTIONS.unable_to_complete).toContain('not a failure')
  })
})
