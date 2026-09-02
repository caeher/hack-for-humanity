export type CheckInSafetyStatus = 'safe' | 'warning' | 'review' | 'elevated' | 'emergency'

export function getLocalDateString(date = new Date(), timeZone?: string): string {
  if (timeZone) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatSubmittedAt(timestampMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestampMs))
}

export function formatHistoryDateLabel(date: string, timeZone: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year!, month! - 1, day!))
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(utcDate)
}

export function formatReporterRole(role: string): string {
  switch (role) {
    case 'patient':
      return 'Patient'
    case 'caregiver':
      return 'Caregiver'
    case 'clinician':
      return 'Clinician'
    case 'admin':
      return 'Organization'
    default:
      return role
  }
}

export function formatSafetyStatus(status: CheckInSafetyStatus): {
  label: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
} {
  switch (status) {
    case 'safe':
      return { label: 'Routine', tone: 'good' }
    case 'warning':
      return { label: 'Monitor', tone: 'warn' }
    case 'review':
      return { label: 'Review', tone: 'warn' }
    case 'elevated':
      return { label: 'Elevated', tone: 'bad' }
    case 'emergency':
      return { label: 'Emergency', tone: 'bad' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

export function isPermissionDeniedMessage(message: string): boolean {
  return /forbidden|unauthorized|denied|authentication required/i.test(message)
}

export function isOfflineLikeError(message: string): boolean {
  return /network|offline|fetch failed|failed to fetch/i.test(message)
}
