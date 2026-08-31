'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layouts'
import { PatientTable } from '@/components/clinician'
import { UserInviteModal } from '@/components/admin'

export default function AdminUsersPage() {
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
      <PatientTable onAddPatient={() => setShowInviteModal(true)} />
      {showInviteModal && (
        <UserInviteModal
          title="Invite New User"
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}
