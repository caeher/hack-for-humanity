import { v } from 'convex/values'
import { Role } from './auth'

export const clerkWebhookEventStatusValidator = v.union(
  v.literal('processed'),
  v.literal('failed'),
  v.literal('ignored'),
  v.literal('skipped_duplicate')
)

export const clerkWebhookEventDocValidator = v.object({
  _id: v.id('clerkWebhookEvents'),
  _creationTime: v.number(),
  eventId: v.string(),
  eventType: v.string(),
  status: clerkWebhookEventStatusValidator,
  errorCode: v.optional(v.string()),
  receivedAt: v.number(),
  processedAt: v.optional(v.number()),
  attemptCount: v.number(),
})

export const clerkWebhookProcessResultValidator = v.object({
  outcome: v.union(
    v.literal('processed'),
    v.literal('failed'),
    v.literal('ignored'),
    v.literal('skipped_duplicate')
  ),
  errorCode: v.optional(v.string()),
})

export interface ClerkEmailAddress {
  id: string
  email_address: string
}

export interface ClerkUserData {
  id: string
  first_name: string | null
  last_name: string | null
  image_url?: string
  banned?: boolean
  deleted?: boolean
  primary_email_address_id?: string | null
  email_addresses?: ClerkEmailAddress[]
  public_metadata?: Record<string, unknown>
  updated_at?: number
}

export interface ClerkOrganizationData {
  id: string
  name: string
  slug: string
  updated_at?: number
  deleted?: boolean
}

export interface ClerkOrganizationMembershipData {
  id: string
  role: string
  organization: ClerkOrganizationData
  public_user_data: {
    user_id: string
    first_name?: string | null
    last_name?: string | null
    identifier?: string
  }
  updated_at?: number
}

export interface ClerkWebhookEnvelope {
  type: string
  data: ClerkUserData | ClerkOrganizationData | ClerkOrganizationMembershipData
  object: string
}

export interface ClerkOrganizationInvitationData {
  id: string
  email_address: string
  organization_id: string
  role: string
  status?: string
  updated_at?: number
}

export const SUPPORTED_CLERK_EVENT_TYPES = [
  'user.created',
  'user.updated',
  'user.deleted',
  'organization.created',
  'organization.updated',
  'organization.deleted',
  'organizationMembership.created',
  'organizationMembership.updated',
  'organizationMembership.deleted',
  'organizationInvitation.created',
  'organizationInvitation.accepted',
  'organizationInvitation.revoked',
] as const

export type SupportedClerkEventType = (typeof SUPPORTED_CLERK_EVENT_TYPES)[number]

export function isSupportedClerkEventType(value: string): value is SupportedClerkEventType {
  return (SUPPORTED_CLERK_EVENT_TYPES as readonly string[]).includes(value)
}

export function isRole(value: unknown): value is Role {
  return (
    value === 'patient' ||
    value === 'caregiver' ||
    value === 'clinician' ||
    value === 'admin'
  )
}

export function getPrimaryEmail(userData: ClerkUserData): string | null {
  const emails = userData.email_addresses ?? []
  if (emails.length === 0) {
    return null
  }

  const primary = emails.find(email => email.id === userData.primary_email_address_id)
  return (primary ?? emails[0])?.email_address ?? null
}

export function buildDisplayName(userData: ClerkUserData): string {
  const parts = [userData.first_name, userData.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  const email = getPrimaryEmail(userData)
  if (email) {
    return email.split('@')[0] ?? 'User'
  }
  return 'User'
}

export function buildTokenIdentifier(issuerDomain: string, clerkUserId: string): string {
  return `${issuerDomain}|${clerkUserId}`
}

export function mapMembershipClinicalRole(
  membershipRole: string
): 'lead' | 'attending' | 'staff' | 'consultant' {
  if (membershipRole === 'org:admin') {
    return 'lead'
  }
  return 'staff'
}

export function mapUserRoleFromClerk(
  publicMetadata: Record<string, unknown> | undefined,
  membershipRole?: string
): Role {
  const metadataRole = publicMetadata?.role
  if (isRole(metadataRole)) {
    return metadataRole
  }

  if (membershipRole === 'org:admin') {
    return 'admin'
  }

  if (membershipRole) {
    return 'clinician'
  }

  return 'patient'
}
