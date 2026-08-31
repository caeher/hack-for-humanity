'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layouts'
import { PatientTable } from '@/components/clinician'
import { UserInviteModal } from '@/components/admin/user-invite-modal'

export default function ClinicianPatientsPage() {
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Clinical workspace"
        title="Patient caseload"
        description="Review recovery status, adherence, and emerging concerns across your active patients."
        action={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" /> Enroll New Patient
          </button>
        }
      />
      <PatientTable onAddPatient={() => setShowAddModal(true)} />
      {showAddModal && (
        <UserInviteModal
          title="Enroll Patient"
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
