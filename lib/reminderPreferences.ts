export const DEFAULT_QUIET_HOURS = {
  start: '21:00',
  end: '08:00',
} as const

export const DEFAULT_COMMUNICATION_PREFERENCES = {
  emailReminders: true,
  smsReminders: false,
  weeklySummary: true,
} as const

export const DEFAULT_ACCESSIBILITY_PREFERENCES = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
} as const

export const WEARABLE_SYNC_STATUS = 'planned_disabled' as const

export const WEARABLE_SYNC_COPY = {
  label: 'Wearable data sync (planned)',
  sublabel:
    'Not connected in this prototype. Future device measurements would be supporting context only — not diagnosis, clearance, or safety-rule input.',
} as const
