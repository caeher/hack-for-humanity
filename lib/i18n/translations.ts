import { SupportedLocale } from './locales'

export interface TranslationDictionary {
  symptoms: Record<
    string,
    {
      title: string
      sub: string
    }
  >
  ratings: Record<number, string>
  ratingBands: {
    none: string
    mild: string
    moderate: string
    severe: string
  }
  clinicalStatuses: {
    stable: string
    review: string
    elevated: string
    routine: string
    safety: string
  }
  dangerSigns: Record<string, string>
  disclaimers: {
    symptomTotal: string
    wearableSync: string
    patternAssociation: string
    emergencyGuidance: string
    printReport: string
  }
  common: {
    loading: string
    save: string
    saving: string
    saved: string
    back: string
    continue: string
    finish: string
    cancel: string
    close: string
    skipToContent: string
    acknowledge: string
    acknowledged: string
  }
}

export const EN_US_TRANSLATIONS: TranslationDictionary = {
  symptoms: {
    headache: {
      title: 'How strong was your headache today?',
      sub: 'Rate the symptom as you experienced it during the past 24 hours.',
    },
    dizziness: {
      title: 'How much dizziness or trouble with balance did you have?',
      sub: 'Think about standing, walking, and changing position.',
    },
    nausea: {
      title: 'How much nausea did you experience?',
      sub: 'Rate nausea during the past 24 hours, even if you did not vomit.',
    },
    lightSensitivity: {
      title: 'How sensitive were you to light?',
      sub: 'Include discomfort from indoor lights, sunlight, and screens.',
    },
    noiseSensitivity: {
      title: 'How sensitive were you to noise?',
      sub: 'Think about conversations, music, traffic, and crowded places.',
    },
    fatigue: {
      title: 'How much fatigue or low energy did you have?',
      sub: 'Rate how tired you felt compared with your usual baseline.',
    },
    concentration: {
      title: 'How difficult was it to concentrate?',
      sub: 'Think about reading, work, school, and following conversations.',
    },
    sleepDifficulty: {
      title: 'How much difficulty did you have with sleep?',
      sub: 'Include falling asleep, staying asleep, or sleeping more or less than usual.',
    },
  },
  ratings: {
    0: 'None',
    1: 'Very mild',
    2: 'Mild',
    3: 'Moderate',
    4: 'Moderately severe',
    5: 'Severe',
    6: 'Very severe',
  },
  ratingBands: {
    none: 'None',
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
  },
  clinicalStatuses: {
    stable: 'Stable',
    review: 'Review',
    elevated: 'Elevated',
    routine: 'Routine',
    safety: 'Safety',
  },
  dangerSigns: {
    neck_pain: 'Neck pain or tenderness',
    double_vision: 'Double vision or vision loss',
    weakness_tingling: 'Weakness, tingling, or numbness in arms or legs',
    severe_worsening_headache: 'Severe or worsening headache that does not ease',
    seizure_convulsion: 'Seizure or convulsion',
    loss_of_consciousness: 'Loss of consciousness',
    deteriorating_conscious_state: 'Drowsiness or inability to wake up',
    repeated_vomiting: 'Repeated vomiting',
    increasing_confusion_irritability: 'Increasing confusion, restlessness, or agitation',
    slurred_speech: 'Slurred speech or difficulty speaking',
  },
  disclaimers: {
    symptomTotal:
      'Patient-reported total across eight tracked symptoms. Not a clinical diagnosis, prognosis, or return-to-activity clearance.',
    wearableSync:
      'Wearable device synchronization is planned and currently disabled. This prototype does not collect live HealthKit or Google Fit data.',
    patternAssociation:
      'Pattern insights indicate temporal associations in logged data and do not establish clinical causation.',
    emergencyGuidance:
      'If experiencing danger signs or acute red flags, call 911 or proceed to the nearest emergency department immediately.',
    printReport:
      'CRI does not diagnose concussion, predict recovery, determine prognosis, or clear return to sport, school, or work. This report organizes patient-reported and authorized clinical records for discussion with a qualified professional.',
  },
  common: {
    loading: 'Loading...',
    save: 'Save changes',
    saving: 'Saving...',
    saved: 'Saved successfully',
    back: 'Back',
    continue: 'Continue',
    finish: 'Finish check-in',
    cancel: 'Cancel',
    close: 'Close',
    skipToContent: 'Skip to main content',
    acknowledge: 'Acknowledge',
    acknowledged: 'Acknowledged',
  },
}

const DICTIONARIES: Record<SupportedLocale, TranslationDictionary> = {
  'en-US': EN_US_TRANSLATIONS,
  'en-GB': EN_US_TRANSLATIONS, // extensibility placeholder
  'es-US': EN_US_TRANSLATIONS, // fallback to English until translated
  'es-ES': EN_US_TRANSLATIONS, // fallback to English until translated
  'fr-CA': EN_US_TRANSLATIONS, // fallback to English until translated
}

/**
 * Returns the dictionary for the requested locale, falling back safely to en-US.
 */
export function getTranslations(locale?: SupportedLocale | string): TranslationDictionary {
  if (!locale) return EN_US_TRANSLATIONS
  return DICTIONARIES[locale as SupportedLocale] ?? EN_US_TRANSLATIONS
}

/**
 * Helper to get descriptive rating label (e.g. 0 -> "0 — None", 3 -> "3 — Moderate")
 */
export function getRatingDescriptor(rating: number, locale?: string): string {
  const t = getTranslations(locale)
  const label = t.ratings[rating] ?? (rating === 0 ? 'None' : rating >= 5 ? 'Severe' : 'Moderate')
  return `${rating} — ${label}`
}

/**
 * Helper to get rating band name from score
 */
export function getScoreBand(score: number, max = 48, locale?: string): string {
  const t = getTranslations(locale)
  const ratio = score / max
  if (score === 0) return t.ratingBands.none
  if (ratio <= 0.25) return t.ratingBands.mild
  if (ratio <= 0.6) return t.ratingBands.moderate
  return t.ratingBands.severe
}
