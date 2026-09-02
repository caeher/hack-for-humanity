/**
 * Presentation Decoupling Layer for Concussion Recovery Intelligence Safety Engine.
 *
 * Keeps clinical rule authoring completely decoupled from UI display, badge styles,
 * icons, and copy. Translates machine-readable output codes and escalation paths
 * into accessible presentation tokens and user-facing cards.
 */

import {
  EscalationPath,
  SAFETY_OUTPUT_CODES,
} from '@/convex/lib/safetyRules'
import { SafetyEvaluationStatus } from '@/convex/lib/safetyEngine'

export interface StatusBadgeConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning'
  className: string
  description: string
}

export const SAFETY_STATUS_PRESENTATION: Record<SafetyEvaluationStatus, StatusBadgeConfig> = {
  safe: {
    label: 'Stable',
    variant: 'default',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
    description: 'Symptom trajectory is stable or improving. Continue routine pacing.',
  },
  warning: {
    label: 'Pacing Notice',
    variant: 'warning',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200',
    description: 'Minor symptom fluctuation or high exertion noted. Apply scheduled rest.',
  },
  review: {
    label: 'Clinician Review',
    variant: 'warning',
    className: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200 border-yellow-300',
    description: 'Moderate symptom burden or plateau logged. Review at next clinical encounter.',
  },
  elevated: {
    label: 'Elevated Risk',
    variant: 'destructive',
    className: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200 border-orange-300',
    description: 'Significant symptom burden or rapid spike. Clinician follow-up recommended.',
  },
  emergency: {
    label: 'Emergency Red Flag',
    variant: 'destructive',
    className: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border-red-400 animate-pulse',
    description: 'Urgent neurological danger sign reported. Immediate emergency medical evaluation required.',
  },
}

export interface EscalationActionConfig {
  title: string
  actionLabel: string
  actionHref?: string
  isEmergency: boolean
  callPhoneNumber?: string
}

export const ESCALATION_PRESENTATION: Record<EscalationPath, EscalationActionConfig> = {
  emergency_911_ed: {
    title: 'Emergency Medical Intercept',
    actionLabel: 'Call Emergency Services (911)',
    isEmergency: true,
    callPhoneNumber: '911',
  },
  urgent_clinician_triage: {
    title: 'Urgent Clinical Review',
    actionLabel: 'Contact Care Team',
    actionHref: '/patient/messages',
    isEmergency: false,
  },
  routine_clinician_review: {
    title: 'Scheduled Recovery Review',
    actionLabel: 'View Recovery Trajectory',
    actionHref: '/patient/recovery',
    isEmergency: false,
  },
  ai_refusal_redirect: {
    title: 'Clinical Scope Notice',
    actionLabel: 'Consult Your Healthcare Provider',
    actionHref: '/patient/messages',
    isEmergency: false,
  },
  safe_pacing_protocol: {
    title: 'Active Recovery Pacing',
    actionLabel: 'Review Care Plan',
    actionHref: '/patient/plan',
    isEmergency: false,
  },
  data_verification_prompt: {
    title: 'Complete Check-in',
    actionLabel: 'Update Daily Entry',
    actionHref: '/patient/check-in',
    isEmergency: false,
  },
}

export interface OutputCodeInfo {
  title: string
  categoryLabel: string
  userSummary: string
  isBlocking: boolean
}

export const OUTPUT_CODE_PRESENTATION: Record<string, OutputCodeInfo> = {
  [SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED]: {
    title: 'Neurological Red Flag Detected',
    categoryLabel: 'Tier 1 Emergency',
    userSummary: 'One or more acute danger signs were reported. Immediate evaluation is required.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.EMERGENCY_RED_FLAG_KEYWORD_DETECTED]: {
    title: 'Urgent Keyword in Note',
    categoryLabel: 'Tier 1 Emergency',
    userSummary: 'Your note indicates acute danger signs. Prioritize emergency medical care.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.TRIAGE_ELEVATED_BURDEN]: {
    title: 'High Symptom Total',
    categoryLabel: 'Tier 2 Triage',
    userSummary: 'Patient-reported symptom total is 30 or higher. Rest and contact your clinician.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.TRIAGE_TRAJECTORY_SPIKE]: {
    title: 'Multi-Day Symptom Spike',
    categoryLabel: 'Tier 2 Triage',
    userSummary: 'Symptoms increased significantly across recent entries. Reduce exertion.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.TRIAGE_REVIEW_BURDEN]: {
    title: 'Moderate Symptom Burden',
    categoryLabel: 'Tier 2 Triage',
    userSummary: 'Symptom total is between 15 and 29. Continue symptom-guided daily pacing.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.TRIAGE_PERSISTENT_PLATEAU]: {
    title: 'Persistent Symptoms (>14 Days)',
    categoryLabel: 'Tier 2 Triage',
    userSummary: 'Symptoms have plateaued over two weeks. Discuss multidisciplinary support.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.TRIAGE_PROLONGED_SINGLE_SEVERE]: {
    title: 'Persistent Severe Symptom',
    categoryLabel: 'Tier 2 Triage',
    userSummary: 'A single symptom has remained high for consecutive days.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.GUARDRAIL_DIAGNOSTIC_ATTEMPT]: {
    title: 'Diagnostic Query Intercept',
    categoryLabel: 'Tier 3 AI Guardrail',
    userSummary: 'CRI cannot diagnose concussion or determine injury stage. Consult a licensed physician.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.GUARDRAIL_PRESCRIPTION_ATTEMPT]: {
    title: 'Medication Query Intercept',
    categoryLabel: 'Tier 3 AI Guardrail',
    userSummary: 'CRI does not prescribe or recommend medications or drug dosages.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.GUARDRAIL_CLEARANCE_ATTEMPT]: {
    title: 'Activity Clearance Intercept',
    categoryLabel: 'Tier 3 AI Guardrail',
    userSummary: 'Medical clearance requires in-person evaluation by your healthcare provider.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.GUARDRAIL_OVERRIDE_ATTEMPT]: {
    title: 'Danger-Sign Notice',
    categoryLabel: 'Tier 3 AI Guardrail',
    userSummary: 'Acute neurological symptoms must never be dismissed or ignored.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.PACING_EXERTION_THRESHOLD]: {
    title: 'Exertion Coincidence Notice',
    categoryLabel: 'Tier 4 Active Pacing',
    userSummary: 'Elevated screen or cognitive minutes coincided with headache rating.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.PACING_ACUTE_REST_RECOMMENDED]: {
    title: 'Initial Relative Rest',
    categoryLabel: 'Tier 4 Active Pacing',
    userSummary: 'Relative rest is recommended for the first 24-48 hours post-injury.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.DATA_INCOMPLETE_FAILSAFE]: {
    title: 'Incomplete Entry Notice',
    categoryLabel: 'Data Integrity',
    userSummary: 'Incomplete data logged; conservative recovery pacing guidance is applied.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.DATA_CONFLICT_FAILSAFE]: {
    title: 'Data Conflict Notice',
    categoryLabel: 'Data Integrity',
    userSummary: 'Contradictory entries detected. Safe conservative guidance is active.',
    isBlocking: false,
  },
  [SAFETY_OUTPUT_CODES.ONBOARDING_ACUTE_RED_FLAG]: {
    title: 'Onboarding Danger Sign',
    categoryLabel: 'Tier 1 Emergency',
    userSummary: 'Acute danger signs reported during onboarding require immediate medical evaluation.',
    isBlocking: true,
  },
  [SAFETY_OUTPUT_CODES.ONBOARDING_HIGH_INITIAL_BURDEN]: {
    title: 'High Initial Symptom Burden',
    categoryLabel: 'Tier 2 Triage',
    userSummary: 'Initial symptom total is elevated. Contact your healthcare provider for pacing guidance.',
    isBlocking: false,
  },
}

/**
 * Standard mandatory medical disclaimer.
 */
export const MANDATORY_MEDICAL_DISCLAIMER =
  'Medical Disclaimer: CRI is a symptom tracking and recovery organization tool. It does not provide medical advice, diagnosis, treatment, or return-to-activity clearance. If you experience worsening symptoms or danger signs, seek immediate medical attention or call 911.'
