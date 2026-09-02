/**
 * Shared onboarding constants and types for the recovery profile intake flow.
 * Diagnosis status is always user-selected — never inferred by the application.
 */

export type TrackingRelationship = 'patient' | 'caregiver' | 'professional'
export type DiagnosisStatus = 'yes' | 'no' | 'unsure'
export type AgeBand = '13-17' | '18-24' | '25-39' | '40-54' | '55-plus'

export interface CommunicationPreferences {
  emailReminders: boolean
  smsReminders: boolean
  weeklySummary: boolean
}

export interface OnboardingDraft {
  step: number
  trackingRelationship?: TrackingRelationship
  preferredName?: string
  ageBand?: AgeBand
  incidentDate?: string
  timeZone?: string
  diagnosisStatus?: DiagnosisStatus
  communicationPreferences?: CommunicationPreferences
  consentAcknowledged?: boolean
  privacyAcknowledged?: boolean
  limitationsAcknowledged?: boolean
}

export const TRACKING_RELATIONSHIP_OPTIONS = [
  {
    value: 'patient' as const,
    label: 'I am tracking my own recovery',
    description: 'You experienced a head injury or concussion and want to log your symptoms.',
  },
  {
    value: 'caregiver' as const,
    label: 'I am a parent or caregiver',
    description: 'You are helping someone else — a child, teen, or family member — track recovery.',
  },
  {
    value: 'professional' as const,
    label: 'I am a healthcare professional',
    description: 'You are enrolling a patient into a structured recovery tracking program.',
  },
] as const

export const AGE_BAND_OPTIONS = [
  { value: '13-17' as const, label: '13–17 (adolescent)' },
  { value: '18-24' as const, label: '18–24' },
  { value: '25-39' as const, label: '25–39' },
  { value: '40-54' as const, label: '40–54' },
  { value: '55-plus' as const, label: '55 and older' },
] as const

export const DIAGNOSIS_STATUS_OPTIONS = [
  {
    value: 'yes' as const,
    label: 'Yes — a healthcare professional diagnosed concussion or mTBI',
    description: 'You received a formal diagnosis from a licensed clinician.',
  },
  {
    value: 'no' as const,
    label: 'No — not yet evaluated or no diagnosis given',
    description: 'CRI will not assume every head injury is a concussion.',
  },
  {
    value: 'unsure' as const,
    label: 'Not sure',
    description: 'You are still waiting for evaluation or are uncertain about the diagnosis.',
  },
] as const

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'UTC', label: 'UTC / GMT' },
] as const

export const ONBOARDING_STEP_COUNT = 5

export const DEFAULT_COMMUNICATION_PREFERENCES: CommunicationPreferences = {
  emailReminders: true,
  smsReminders: false,
  weeklySummary: true,
}

export function getPostOnboardingRoute(
  trackingRelationship: TrackingRelationship,
  userRole: string
): string {
  if (trackingRelationship === 'professional' && (userRole === 'clinician' || userRole === 'admin')) {
    return '/clinician/patients'
  }
  if (trackingRelationship === 'caregiver' && userRole === 'caregiver') {
    return '/caregiver/dashboard'
  }
  return '/patient/check-in'
}
