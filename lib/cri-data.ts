export type Role = 'patient' | 'caregiver' | 'clinician' | 'admin'

export const roles: Record<Role, { label: string; home: string }> = {
  patient: { label: 'Patient', home: '/patient/dashboard' },
  caregiver: { label: 'Caregiver', home: '/caregiver/dashboard' },
  clinician: { label: 'Clinician', home: '/clinician/dashboard' },
  admin: { label: 'Organization', home: '/admin/dashboard' },
}

export const recoveryTrend = [
  { day: 'Aug 25', score: 58, pain: 7, mobility: 42 },
  { day: 'Aug 26', score: 62, pain: 6, mobility: 48 },
  { day: 'Aug 27', score: 64, pain: 6, mobility: 51 },
  { day: 'Aug 28', score: 68, pain: 5, mobility: 57 },
  { day: 'Aug 29', score: 72, pain: 4, mobility: 63 },
  { day: 'Aug 30', score: 74, pain: 4, mobility: 68 },
  { day: 'Today', score: 78, pain: 3, mobility: 72 },
]

export const patients = [
  { id: 'P-1042', name: 'Maya Chen', procedure: 'ACL reconstruction', day: 18, score: 78, risk: 'Stable', adherence: 92 },
  { id: 'P-1038', name: 'Daniel Ortiz', procedure: 'Total knee replacement', day: 9, score: 54, risk: 'Review', adherence: 71 },
  { id: 'P-1031', name: 'Ava Williams', procedure: 'Rotator cuff repair', day: 27, score: 83, risk: 'Stable', adherence: 96 },
  { id: 'P-1027', name: 'James Kim', procedure: 'Lumbar decompression', day: 6, score: 46, risk: 'Elevated', adherence: 64 },
  { id: 'P-1019', name: 'Nora Patel', procedure: 'Hip replacement', day: 34, score: 88, risk: 'Stable', adherence: 89 },
]

export const alerts = [
  { patient: 'James Kim', detail: 'Pain increased 3 points in 24 hours', severity: 'High', time: '18 min ago' },
  { patient: 'Daniel Ortiz', detail: 'Missed medication and mobility check-in', severity: 'Medium', time: '1 hr ago' },
  { patient: 'Maya Chen', detail: 'Sleep quality below baseline for 3 nights', severity: 'Low', time: '3 hrs ago' },
]

export const nav: Record<Role, { label: string; href: string }[]> = {
  patient: [
    { label: 'Overview', href: '/patient/dashboard' },
    { label: 'Daily check-in', href: '/patient/check-in' },
    { label: 'Recovery', href: '/patient/recovery' },
    { label: 'Insights', href: '/patient/insights' },
    { label: 'Care plan', href: '/patient/plan' },
    { label: 'Messages', href: '/patient/messages' },
    { label: 'Reports', href: '/patient/reports' },
    { label: 'Profile', href: '/patient/profile' },
  ],
  caregiver: [
    { label: 'Overview', href: '/caregiver/dashboard' },
    { label: 'Maya’s recovery', href: '/caregiver/patient/P-1042' },
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
