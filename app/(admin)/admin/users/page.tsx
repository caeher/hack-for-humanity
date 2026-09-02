'use client'

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { PageHeader } from '@/components/layouts'
import { UserManagementTable, UserInviteModal } from '@/components/admin'

export default function AdminUsersPage() {
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
