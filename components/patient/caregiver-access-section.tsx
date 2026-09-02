'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Shield, UserPlus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/forms'
import {
  categoryIdsFromScopes,
  CONSENT_CATEGORY_OPTIONS,
  RELATIONSHIP_PRESETS,
  scopesFromCategoryIds,
} from '@/lib/caregiverConsent'
import type { Id } from '@/convex/_generated/dataModel'

export interface CaregiverAccessSectionProps {
  patientId: Id<'patients'>
}

function formatStatus(status: string): { label: string; tone: 'good' | 'warn' | 'neutral' | 'bad' } {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'good' }
    case 'pending':
      return { label: 'Pending acceptance', tone: 'warn' }
    case 'revoked':
      return { label: 'Revoked', tone: 'bad' }
    case 'expired':
      return { label: 'Expired', tone: 'neutral' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

export function CaregiverAccessSection({ patientId }: CaregiverAccessSectionProps) {
  const grants = useQuery(api.consent.listGrantsWithGrantee, { patientId })
  const inviteCaregiver = useMutation(api.consent.inviteCaregiver)
  const grantConsent = useMutation(api.consent.grantConsent)
  const revokeConsent = useMutation(api.consent.revokeConsent)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [inviteeName, setInviteeName] = useState('')
  const [relationship, setRelationship] = useState<string>(RELATIONSHIP_PRESETS[0])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'trends',
    'symptoms',
    'tasks',
    'safety',
    'messages_view',
    'messages_send',
  ])
  const [expiresInDays, setExpiresInDays] = useState('90')
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<Id<'consentGrants'> | null>(null)

  const scopes = useMemo(() => scopesFromCategoryIds(selectedCategories), [selectedCategories])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(current =>
      current.includes(categoryId)
        ? current.filter(id => id !== categoryId)
        : [...current, categoryId]
    )
  }

  const handleInvite = async () => {
    setSubmitState('saving')
    setErrorMessage(null)
    try {
      const days = expiresInDays.trim() ? Number(expiresInDays) : undefined
      await inviteCaregiver({
        patientId,
        inviteeEmail: inviteeEmail.trim(),
        inviteeName: inviteeName.trim(),
        scopes,
        relationship: relationship.trim() || undefined,
        expiresInDays: days && Number.isFinite(days) ? days : undefined,
      })
      setInviteeEmail('')
      setInviteeName('')
      setShowInvite(false)
      setSubmitState('idle')
    } catch (error) {
      setSubmitState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send invitation.')
    }
  }

  const handleRevoke = async (grantId: Id<'consentGrants'>) => {
    setRevokingId(grantId)
    try {
      await revokeConsent({ consentGrantId: grantId })
    } finally {
      setRevokingId(null)
    }
  }

  const handleResendActive = async (grantId: Id<'consentGrants'>, granteeUserId: Id<'users'>, currentScopes: typeof scopes, currentRelationship?: string) => {
    setSubmitState('saving')
    try {
      await grantConsent({
        patientId,
        granteeUserId,
        granteeRole: 'caregiver',
        scopes: currentScopes,
        relationship: currentRelationship,
        expiresInDays: 90,
      })
      void grantId
      setSubmitState('idle')
    } catch (error) {
      setSubmitState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update access.')
    }
  }

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold text-foreground">Caregiver access</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Invite a family member, friend, or legal guardian to support recovery. Access is denied by
            default until they accept, and you can revoke it at any time. This works for adults and
            adolescents — relationship labels are flexible.
          </p>
        </div>
        <Button type="button" onClick={() => setShowInvite(value => !value)}>
          <UserPlus className="mr-2 size-4" />
          Invite caregiver
        </Button>
      </div>

      {showInvite && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h3 className="font-semibold text-foreground">New invitation</h3>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TextField
              label="Caregiver name"
              value={inviteeName}
              onChange={e => setInviteeName(e.target.value)}
            />
            <TextField
              label="Caregiver email"
              type="email"
              value={inviteeEmail}
              onChange={e => setInviteeEmail(e.target.value)}
            />
            <TextField
              label="Relationship (optional)"
              value={relationship}
              onChange={e => setRelationship(e.target.value)}
              hint="e.g. Parent / Guardian, Spouse, Friend"
            />
            <TextField
              label="Access expires after (days)"
              value={expiresInDays}
              onChange={e => setExpiresInDays(e.target.value)}
              hint="Leave blank for no expiration"
            />
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-semibold text-foreground">What to share</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {CONSENT_CATEGORY_OPTIONS.map(category => (
                <label
                  key={category.id}
                  className="flex cursor-pointer gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{category.label}</span>
                    <span className="block text-xs text-muted-foreground">{category.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {errorMessage && <p className="mt-3 text-sm text-destructive">{errorMessage}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleInvite()}
              disabled={submitState === 'saving' || !inviteeEmail.trim() || !inviteeName.trim() || scopes.length === 0}
            >
              {submitState === 'saving' ? 'Sending…' : 'Send invitation'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {grants === undefined ? (
        <p className="text-sm text-muted-foreground">Loading access grants…</p>
      ) : Array.isArray(grants) && grants.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No caregivers have access yet. Invitations stay pending until the caregiver accepts.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {grants.map(({ grant, granteeName, granteeEmail }) => {
            const status = formatStatus(grant.status)
            const sharedCategoryIds = categoryIdsFromScopes(grant.scopes)

            return (
              <li key={grant._id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{granteeName}</span>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{granteeEmail}</p>
                    {grant.relationship && (
                      <p className="text-sm text-muted-foreground">Relationship: {grant.relationship}</p>
                    )}
                    {grant.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires{' '}
                        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                          new Date(grant.expiresAt)
                        )}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sharedCategoryIds.map(categoryId => {
                        const category = CONSENT_CATEGORY_OPTIONS.find(item => item.id === categoryId)
                        return category ? (
                          <Badge key={categoryId} tone="neutral">
                            {category.label}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {grant.status === 'active' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          void handleResendActive(
                            grant._id,
                            grant.granteeUserId,
                            grant.scopes,
                            grant.relationship
                          )
                        }
                      >
                        Refresh access
                      </Button>
                    )}
                    {(grant.status === 'active' || grant.status === 'pending') && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleRevoke(grant._id)}
                        disabled={revokingId === grant._id}
                      >
                        {revokingId === grant._id ? 'Revoking…' : 'Revoke access'}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
