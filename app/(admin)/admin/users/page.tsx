'use client'

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { isE2ETestMode } from '@/lib/e2e'
import type { Id } from '@/convex/_generated/dataModel'
import { PageHeader } from '@/components/layouts'
import { UserManagementTable, UserInviteModal } from '@/components/admin'

function AdminUsersPageDemo() {
  const [showInviteModal, setShowInviteModal] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Access management"
        title="Users & roles"
        description="Manage organizational access across patients, caregivers, clinicians, and operators."
        action={
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Invite user
          </button>
        }
      />
      <UserManagementTable onInvite={() => setShowInviteModal(true)} orgId={'demo' as Id<'organizations'>} />
      {showInviteModal && (
        <UserInviteModal
          title="Invite New User"
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

function AdminUsersPageLive() {
  const [showInviteModal, setShowInviteModal] = useState(false)
  const org = useQuery(api.organizations.getMyOrganization, {})

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Access management"
        title="Users & roles"
        description="Manage organizational access across patients, caregivers, clinicians, and operators."
        action={
          org && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> Invite user
            </button>
          )
        }
      />
      {org ? (
        <UserManagementTable
          orgId={org._id}
          onInvite={() => setShowInviteModal(true)}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Loading organization access…</p>
      )}
      {showInviteModal && org && (
        <UserInviteModal
          orgId={org._id}
          title="Invite New User"
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  if (isE2ETestMode) {
    return <AdminUsersPageDemo />
  }
  return <AdminUsersPageLive />
}
