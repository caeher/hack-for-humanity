import { CaregiverOverview } from '@/components/caregiver'

export default async function CaregiverPatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <CaregiverOverview patientId={id} />
}
