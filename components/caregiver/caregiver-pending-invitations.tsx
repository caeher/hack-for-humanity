'use client'

import React, { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Bell, Check, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CONSENT_CATEGORY_OPTIONS } from '@/lib/caregiverConsent'
import type { Id } from '@/convex/_generated/dataModel'

function formatExpiry(expiresAt?: number): string | null {
  if (!expiresAt) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(expiresAt))
}

export function CaregiverPendingInvitations() {
  const invitations = useQuery(api.consent.listPendingInvitations, {})
  const acceptInvitation = useMutation(api.consent.acceptInvitation)
  const declineInvitation = useMutation(api.consent.declineInvitation)
  const [actionId, setActionId] = useState<Id<'consentGrants'> | null>(null)

  if (!invitations || invitations.length === 0) {
    return null
  }

  const handleAccept = async (grantId: Id<'consentGrants'>) => {
    setActionId(grantId)
    try {
      await acceptInvitation({ consentGrantId: grantId })
    } finally {
      setActionId(null)
    }
  }

  const handleDecline = async (grantId: Id<'consentGrants'>) => {
    setActionId(grantId)
    try {
      await declineInvitation({ consentGrantId: grantId })
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {invitations.map(invitation => {
        const sharedCategories = CONSENT_CATEGORY_OPTIONS.filter(category =>
          category.scopes.every(scope => invitation.grant.scopes.includes(scope))
        )
        const expiryLabel = formatExpiry(invitation.grant.expiresAt)

        return (
          <Card key={invitation.grant._id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Bell className="size-4 text-primary" aria-hidden />
                  <h2 className="font-semibold text-foreground">
                    Invitation from {invitation.patientName}
                  </h2>
                  <Badge tone="warn">Pending</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {invitation.inviterName
                    ? `${invitation.inviterName} invited you to support their recovery.`
                    : 'You were invited to support someone’s recovery.'}
                  {invitation.grant.relationship
                    ? ` Relationship: ${invitation.grant.relationship}.`
                    : ''}
                </p>
                {expiryLabel && (
                  <p className="text-xs text-muted-foreground">Access expires {expiryLabel}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  {sharedCategories.map(category => (
                    <Badge key={category.id} tone="neutral">
                      {category.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void handleAccept(invitation.grant._id)}
                  disabled={actionId === invitation.grant._id}
                >
                  <Check className="mr-1 size-4" />
                  Accept access
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDecline(invitation.grant._id)}
                  disabled={actionId === invitation.grant._id}
                >
                  <X className="mr-1 size-4" />
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
