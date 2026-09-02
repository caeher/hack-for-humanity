export type ConsentScope =
  | 'view_symptoms'
  | 'view_trends'
  | 'view_plan'
  | 'log_proxy'
  | 'receive_alerts'
  | 'view_messages'
  | 'send_messages'

export const CONSENT_CATEGORY_OPTIONS: Array<{
  id: string
  label: string
  description: string
  scopes: ConsentScope[]
  relationshipHint?: string
}> = [
  {
    id: 'trends',
    label: 'Overall recovery trend',
    description: 'Symptom totals over time and check-in consistency',
    scopes: ['view_trends'],
  },
  {
    id: 'symptoms',
    label: 'Daily symptom check-ins',
    description: 'Patient-reported symptom ratings (not clinical notes)',
    scopes: ['view_symptoms'],
  },
  {
    id: 'tasks',
    label: 'Task support & care plan',
    description: 'Assigned pacing tasks and how you can help today',
    scopes: ['view_plan'],
  },
  {
    id: 'safety',
    label: 'Safety status',
    description: 'High-level safety guidance when escalation is active',
    scopes: ['receive_alerts'],
  },
  {
    id: 'messages_view',
    label: 'Read secure messages',
    description: 'View messages with the care team',
    scopes: ['view_messages'],
  },
  {
    id: 'messages_send',
    label: 'Send secure messages',
    description: 'Reply in the patient’s secure message thread',
    scopes: ['send_messages'],
  },
  {
    id: 'proxy',
    label: 'Log on their behalf',
    description:
      'Complete check-ins, reminders, or care-plan steps when delegated (common for parents/guardians)',
    scopes: ['log_proxy'],
    relationshipHint: 'Parent / Guardian',
  },
]

export const RELATIONSHIP_PRESETS = [
  'Spouse / Partner',
  'Parent / Guardian',
  'Family member',
  'Friend',
  'Other support person',
] as const

export function scopesFromCategoryIds(categoryIds: string[]): ConsentScope[] {
  const scopeSet = new Set<ConsentScope>()
  for (const category of CONSENT_CATEGORY_OPTIONS) {
    if (categoryIds.includes(category.id)) {
      for (const scope of category.scopes) {
        scopeSet.add(scope)
      }
    }
  }
  return [...scopeSet]
}

export function categoryIdsFromScopes(scopes: ConsentScope[]): string[] {
  return CONSENT_CATEGORY_OPTIONS.filter(category =>
    category.scopes.every(scope => scopes.includes(scope))
  ).map(category => category.id)
}
