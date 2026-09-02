/**
 * Canonical danger-sign options for the daily check-in UI.
 * Maps stable UI ids to CDC-aligned labels consumed by the Safety Engine.
 */

export interface DangerSignOption {
  id: string
  label: string
  cdcLabel: string
}

export const DANGER_SIGN_OPTIONS: readonly DangerSignOption[] = [
  {
    id: 'worsening-headache',
    label: 'A headache that is getting worse and does not go away',
    cdcLabel: 'Worsening headache that does not go away',
  },
  {
    id: 'repeated-vomiting',
    label: 'Repeated vomiting',
    cdcLabel: 'Repeated vomiting or nausea',
  },
  {
    id: 'seizure',
    label: 'A seizure or convulsion',
    cdcLabel: 'Seizures or convulsions',
  },
  {
    id: 'slurred-speech',
    label: 'Slurred speech or unusual behavior',
    cdcLabel: 'Slurred speech, weakness, numbness, or decreased coordination',
  },
  {
    id: 'confusion',
    label: 'Increasing confusion, restlessness, or agitation',
    cdcLabel: 'Increasing confusion, restlessness, or agitation',
  },
  {
    id: 'weakness',
    label: 'Weakness, numbness, or decreased coordination',
    cdcLabel: 'Slurred speech, weakness, numbness, or decreased coordination',
  },
  {
    id: 'unequal-pupils',
    label: 'One pupil larger than the other',
    cdcLabel: 'One pupil larger than the other',
  },
  {
    id: 'cannot-wake',
    label: 'Extreme drowsiness, loss of consciousness, or difficulty waking up',
    cdcLabel: 'Extreme drowsiness, loss of consciousness, or inability to wake up',
  },
] as const

const DANGER_SIGN_CDC_BY_ID = new Map(DANGER_SIGN_OPTIONS.map(option => [option.id, option.cdcLabel]))

/**
 * Converts selected UI danger-sign ids into canonical CDC labels for persistence.
 */
export function mapDangerSignIdsToCdcLabels(selectedIds: string[]): string[] {
  const labels = new Set<string>()
  for (const id of selectedIds) {
    const label = DANGER_SIGN_CDC_BY_ID.get(id)
    if (label) {
      labels.add(label)
    }
  }
  return [...labels]
}
