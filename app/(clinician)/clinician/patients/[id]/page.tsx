import { PatientDetailView } from '@/components/clinician'

export default async function ClinicianPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <PatientDetailView id={id} />
}
