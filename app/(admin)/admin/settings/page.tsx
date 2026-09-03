import { OrganizationSettingsForm, LegalHoldsManager } from '@/components/admin'

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <OrganizationSettingsForm />
      <div className="px-6 pb-6">
        <LegalHoldsManager />
      </div>
    </div>
  )
}
