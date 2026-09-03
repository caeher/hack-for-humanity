/**
 * Deterministic local parser for recovery event extraction.
 * Used as the primary extractor and as fallback when AI is disabled.
 * No external provider calls — safe for CI and kill-switch scenarios.
 */

import { redactPiiFromText } from '@/lib/ai/deidentify'
import type { ExposureDomain } from '@/lib/exposureTracking'
import type {
  ConcussionSymptomField,
  ConfidenceLevel,
  RecoveryEventCandidate,
  TimingRelative,
} from './types'

interface SymptomPattern {
  field: ConcussionSymptomField
  patterns: RegExp[]
}

const SYMPTOM_PATTERNS: SymptomPattern[] = [
  { field: 'headache', patterns: [/\bheadache\b/i, /\bhead\s*ache\b/i, /\bmigraine\b/i] },
  { field: 'dizziness', patterns: [/\bdizz(y|iness)\b/i, /\bvertigo\b/i, /\blightheaded\b/i] },
  { field: 'nausea', patterns: [/\bnausea\b/i, /\bnauseous\b/i, /\bqueasy\b/i] },
  {
    field: 'lightSensitivity',
    patterns: [/\blight\s*sensitiv/i, /\bsensitive\s+to\s+light\b/i, /\bbright\s+light\b/i],
  },
  {
    field: 'noiseSensitivity',
    patterns: [/\bnoise\s*sensitiv/i, /\bsensitive\s+to\s+noise\b/i, /\bloud\s+noise\b/i],
  },
  { field: 'fatigue', patterns: [/\bfatigue\b/i, /\btired\b/i, /\bexhausted\b/i, /\blow\s+energy\b/i] },
  {
    field: 'concentration',
    patterns: [/\bconcentrat/i, /\bfocus\b/i, /\bbrain\s*fog\b/i, /\bcan'?t\s+think\b/i],
  },
  {
    field: 'sleepDifficulty',
    patterns: [/\bsleep\s*(problem|issue|difficult)/i, /\binsomnia\b/i, /\bcan'?t\s+sleep\b/i],
  },
]

interface ActivityPattern {
  domain: ExposureDomain
  activityType: string
  trigger: string
  patterns: RegExp[]
}

const ACTIVITY_PATTERNS: ActivityPattern[] = [
  {
    domain: 'cognitive',
    activityType: 'studying',
    trigger: 'studying',
    patterns: [/\b(studying|study|homework|reading|exam)\b/i],
  },
  {
    domain: 'cognitive',
    activityType: 'computer_work',
    trigger: 'computer work',
    patterns: [/\b(computer\s*work|working\s+on\s+computer|laptop)\b/i],
  },
  {
    domain: 'cognitive',
    activityType: 'meeting',
    trigger: 'meeting',
    patterns: [/\b(meeting|conference\s*call|zoom)\b/i],
  },
  {
    domain: 'screen',
    activityType: 'phone',
    trigger: 'phone',
    patterns: [/\b(phone|scrolling|social\s+media)\b/i],
  },
  {
    domain: 'screen',
    activityType: 'computer',
    trigger: 'screen time',
    patterns: [/\b(screen\s*time|on\s+my\s+computer|tablet)\b/i],
  },
  {
    domain: 'screen',
    activityType: 'tv',
    trigger: 'tv',
    patterns: [/\b(watching\s+tv|television)\b/i],
  },
  {
    domain: 'physical',
    activityType: 'light_walking',
    trigger: 'walking',
    patterns: [/\b(walking|walked|went\s+for\s+a\s+walk)\b/i],
  },
  {
    domain: 'physical',
    activityType: 'moderate_exercise',
    trigger: 'exercise',
    patterns: [/\b(exercise|workout|gym|jogging|running)\b/i],
  },
  {
    domain: 'physical',
    activityType: 'sports',
    trigger: 'sports',
    patterns: [/\b(soccer|football|basketball|practice|game|sport)\b/i],
  },
  {
    domain: 'work_school',
    activityType: 'classes',
    trigger: 'classes',
    patterns: [/\b(class|school|lecture)\b/i],
  },
  {
    domain: 'work_school',
    activityType: 'work_meeting',
    trigger: 'work',
    patterns: [/\b(at\s+work|work\s+shift|office)\b/i],
  },
  {
    domain: 'sleep',
    activityType: 'night_sleep',
    trigger: 'sleep',
    patterns: [/\b(slept|sleep|bedtime|woke\s+up)\b/i],
  },
]

const DURATION_PATTERNS: Array<{ pattern: RegExp; multiplier: number; useCapture?: boolean }> = [
  { pattern: /(\d+)\s*hours?/i, multiplier: 60, useCapture: true },
  { pattern: /(\d+)\s*hrs?/i, multiplier: 60, useCapture: true },
  { pattern: /(\d+)\s*minutes?/i, multiplier: 1, useCapture: true },
  { pattern: /(\d+)\s*mins?/i, multiplier: 1, useCapture: true },
  { pattern: /(one|two|three|four|five|six|seven|eight|nine|ten)\s+hours?/i, multiplier: 60 },
  { pattern: /half\s+an?\s+hour/i, multiplier: 30 },
  { pattern: /couple\s+of\s+hours?/i, multiplier: 120 },
]

const WORD_TO_NUMBER: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}

const TIMING_PATTERNS: Array<{ relative: TimingRelative; pattern: RegExp }> = [
  { relative: 'morning', pattern: /\b(this\s+)?morning\b/i },
  { relative: 'afternoon', pattern: /\b(this\s+)?afternoon\b/i },
  { relative: 'evening', pattern: /\b(this\s+)?evening\b/i },
  { relative: 'before_sleep', pattern: /\b(before\s+bed|at\s+bedtime|last\s+night)\b/i },
  { relative: 'after_activity', pattern: /\bafter\b/i },
]

function generateCandidateId(index: number): string {
  return `cand_${index}_${Math.random().toString(36).slice(2, 8)}`
}

function detectSymptom(text: string): ConcussionSymptomField | undefined {
  for (const { field, patterns } of SYMPTOM_PATTERNS) {
    if (patterns.some(p => p.test(text))) return field
  }
  return undefined
}

function detectActivity(text: string): ActivityPattern | undefined {
  for (const activity of ACTIVITY_PATTERNS) {
    if (activity.patterns.some(p => p.test(text))) return activity
  }
  return undefined
}

function detectDuration(text: string): { minutes?: number; text?: string; uncertain?: boolean } | undefined {
  for (const { pattern, multiplier, useCapture } of DURATION_PATTERNS) {
    const match = pattern.exec(text)
    if (!match) continue

    if (useCapture && match[1]) {
      return { minutes: Number(match[1]) * multiplier, uncertain: false }
    }

    if (match[1] && WORD_TO_NUMBER[match[1].toLowerCase()]) {
      return {
        minutes: WORD_TO_NUMBER[match[1].toLowerCase()]! * multiplier,
        uncertain: false,
      }
    }

    return { minutes: multiplier, text: match[0], uncertain: false }
  }
  return undefined
}

function detectTiming(text: string): RecoveryEventCandidate['timing'] | undefined {
  for (const { relative, pattern } of TIMING_PATTERNS) {
    if (pattern.test(text)) {
      return { relative, uncertain: relative === 'after_activity' }
    }
  }
  return undefined
}

function computeConfidence(params: {
  hasSymptom: boolean
  hasActivity: boolean
  hasDuration: boolean
}): ConfidenceLevel {
  const score = [params.hasSymptom, params.hasActivity, params.hasDuration].filter(Boolean).length
  if (score >= 3) return 'high'
  if (score >= 2) return 'medium'
  return 'low'
}

/**
 * Parses de-identified recovery note text into structured event candidates.
 */
export function parseRecoveryNoteLocally(noteText: string): RecoveryEventCandidate[] {
  const redacted = redactPiiFromText(noteText.trim())
  if (!redacted) return []

  const sentences = redacted
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3)

  const candidates: RecoveryEventCandidate[] = []
  const seen = new Set<string>()

  for (const sentence of sentences) {
    const symptomField = detectSymptom(sentence)
    const activity = detectActivity(sentence)
    const duration = detectDuration(sentence)
    const timing = detectTiming(sentence)

    if (!symptomField && !activity) continue

    const key = `${symptomField ?? ''}:${activity?.domain ?? ''}:${activity?.activityType ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)

    const hasSymptom = Boolean(symptomField)
    const hasActivity = Boolean(activity)
    const hasDuration = Boolean(duration)

    candidates.push({
      id: generateCandidateId(candidates.length),
      symptom: symptomField ? { field: symptomField, uncertain: !hasSymptom } : undefined,
      activity: activity
        ? {
            domain: activity.domain,
            activityType: activity.activityType,
            trigger: activity.trigger,
            uncertain: false,
          }
        : undefined,
      duration,
      timing,
      confidence: computeConfidence({ hasSymptom, hasActivity, hasDuration }),
      uncertain: !hasSymptom || !hasActivity,
      status: 'pending',
    })
  }

  return candidates
}
