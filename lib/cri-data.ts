export type Role = 'patient' | 'caregiver' | 'clinician' | 'admin'

export const roles: Record<Role, { label: string; home: string }> = {
  patient: { label: 'Patient', home: '/patient/dashboard' },
  caregiver: { label: 'Caregiver', home: '/caregiver/dashboard' },
  clinician: { label: 'Clinician', home: '/clinician/dashboard' },
  admin: { label: 'Organization', home: '/admin/dashboard' },
}

export function getAuthorizedHome(role?: Role | string | null): string {
  if (!role) return '/'
  return roles[role as Role]?.home || '/'
}

export const recoveryTrend = [
  { day: 'Aug 25', symptomBurden: 27, headache: 5 },
  { day: 'Aug 26', symptomBurden: 25, headache: 5 },
  { day: 'Aug 27', symptomBurden: 23, headache: 4 },
  { day: 'Aug 28', symptomBurden: 24, headache: 5 },
  { day: 'Aug 29', symptomBurden: 20, headache: 4 },
  { day: 'Aug 30', symptomBurden: 18, headache: 3 },
  { day: 'Today', symptomBurden: 15, headache: 2 },
]

export const patients = [
  { id: 'P-1042', name: 'Maya Chen', recoveryContext: 'Clinician-diagnosed concussion', day: 12, symptomTotal: 15, attention: 'Routine', checkInRate: 92 },
  { id: 'P-1038', name: 'Daniel Ortiz', recoveryContext: 'Suspected concussion (review status)', day: 10, symptomTotal: 31, attention: 'Review', checkInRate: 71 },
  { id: 'P-1031', name: 'Ava Williams', recoveryContext: 'Clinician-diagnosed concussion', day: 21, symptomTotal: 10, attention: 'Routine', checkInRate: 96 },
  { id: 'P-1027', name: 'James Kim', recoveryContext: 'Head injury under emergency evaluation', day: 3, symptomTotal: 38, attention: 'Safety', checkInRate: 64 },
  { id: 'P-1019', name: 'Nora Patel', recoveryContext: 'Persistent concussion symptoms', day: 34, symptomTotal: 26, attention: 'Review', checkInRate: 89 },
  { id: 'P-1055', name: 'Leo Miller', recoveryContext: 'Adolescent Return-to-Learn', day: 10, symptomTotal: 16, attention: 'Routine', checkInRate: 90 },
]

export const alerts = [
  { patient: 'James Kim', detail: 'Self-reported repeated vomiting and acute drowsiness; emergency guidance displayed', severity: 'High', time: '18 min ago' },
  { patient: 'Daniel Ortiz', detail: 'Headache increased 3 points in 24 hours coinciding with screen exposure', severity: 'Medium', time: '1 hr ago' },
  { patient: 'Maya Chen', detail: 'Sleep quality below baseline for 3 nights', severity: 'Low', time: '3 hrs ago' },
  { patient: 'Leo Miller', detail: 'Classroom light sensitivity during school return; accommodation active', severity: 'Low', time: '1 day ago' },
]

export const nav: Record<Role, { label: string; href: string }[]> = {
  patient: [
    { label: 'Overview', href: '/patient/dashboard' },
    { label: 'Daily check-in', href: '/patient/check-in' },
    { label: 'Recovery', href: '/patient/recovery' },
    { label: 'Insights', href: '/patient/insights' },
    { label: 'Education', href: '/patient/education' },
    { label: 'Care plan', href: '/patient/plan' },
    { label: 'Messages', href: '/patient/messages' },
    { label: 'Reports', href: '/patient/reports' },
    { label: 'Profile', href: '/patient/profile' },
  ],
  caregiver: [
    { label: 'Overview', href: '/caregiver/dashboard' },
    { label: 'Messages', href: '/caregiver/messages' },
  ],
  clinician: [
    { label: 'Overview', href: '/clinician/dashboard' },
    { label: 'Patients', href: '/clinician/patients' },
    { label: 'Alerts', href: '/clinician/alerts' },
    { label: 'Reports', href: '/clinician/reports' },
  ],
  admin: [
    { label: 'Overview', href: '/admin/dashboard' },
    { label: 'Users', href: '/admin/users' },
    { label: 'Cohorts', href: '/admin/cohorts' },
    { label: 'Audit log', href: '/admin/audit' },
    { label: 'Settings', href: '/admin/settings' },
  ],
}
