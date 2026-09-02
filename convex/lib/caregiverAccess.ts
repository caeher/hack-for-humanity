import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'
import type { ConsentScope } from './auth'

export type RestrictedSection = {
  section: string
  reason: string
  requiredScope?: ConsentScope
}

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

export function hasScope(scopes: ConsentScope[], required: ConsentScope): boolean {
  return scopes.includes(required)
}

export function buildRestrictedSections(scopes: ConsentScope[]): RestrictedSection[] {
  const restricted: RestrictedSection[] = []

  if (!hasScope(scopes, 'view_symptoms')) {
    restricted.push({
      section: 'Symptom check-ins',
      reason: 'The patient has not shared daily symptom details with you.',
      requiredScope: 'view_symptoms',
    })
  }

  if (!hasScope(scopes, 'view_trends')) {
    restricted.push({
      section: 'Recovery trend',
      reason: 'Overall recovery trend data is not included in your access.',
      requiredScope: 'view_trends',
    })
  }

  if (!hasScope(scopes, 'view_plan')) {
    restricted.push({
      section: 'Care plan & reminders',
      reason: 'Task support and reminders are not shared with your account.',
      requiredScope: 'view_plan',
    })
  }

  if (!hasScope(scopes, 'receive_alerts')) {
    restricted.push({
      section: 'Safety status',
      reason: 'Safety escalation details are limited to authorized contacts.',
      requiredScope: 'receive_alerts',
    })
  }

  if (!hasScope(scopes, 'view_messages') && !hasScope(scopes, 'send_messages')) {
    restricted.push({
      section: 'Secure messages',
      reason: 'Messaging with the care team is not enabled for your access.',
      requiredScope: 'view_messages',
    })
  }

  restricted.push({
    section: 'Private notes & clinical records',
    reason: 'Clinician notes, encounter summaries, and diagnosis details are never shared via caregiver access.',
  })

  if (!hasScope(scopes, 'log_proxy')) {
    restricted.push({
      section: 'Medication specifics',
      reason: 'Medication instructions require delegated logging permission.',
      requiredScope: 'log_proxy',
    })
  }

  return restricted
}

export function redactCarePlanForCaregiver(
  task: Doc<'carePlans'>,
  scopes: ConsentScope[]
): Doc<'carePlans'> {
  if (hasScope(scopes, 'log_proxy')) {
    return task
  }

  if (task.category !== 'medication') {
    return task
  }

  return {
    ...task,
    medicationInstruction: undefined,
    description: task.description
      ? 'Medication task details are restricted. Ask the patient or care team if you need specifics.'
      : undefined,
  }
}

export async function getActiveCaregiverGrant(
  ctx: QueryCtx | MutationCtx,
  patientId: Doc<'patients'>['_id'],
  granteeUserId: Doc<'users'>['_id'],
  nowMs: number
): Promise<Doc<'consentGrants'> | null> {
  const grant = await ctx.db
    .query('consentGrants')
    .withIndex('by_patientId_and_granteeUserId', q =>
      q.eq('patientId', patientId).eq('granteeUserId', granteeUserId)
    )
    .first()

  if (!grant || grant.status !== 'active') {
    return null
  }

  if (grant.expiresAt !== undefined && grant.expiresAt <= nowMs) {
    return null
  }

  return grant
}
