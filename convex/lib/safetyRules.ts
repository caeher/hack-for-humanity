/**
 * Clinical Rules Registry & Evidence Governance for Concussion Recovery Intelligence (CRI).
 *
 * All rules in this registry are versioned, deterministic, non-diagnostic, and traceable
 * to peer-reviewed guidelines and governing health authorities (CDC HEADS UP, Amsterdam 2022,
 * ONF Living Guidelines, PedsConcussion).
 */

export const RULE_REGISTRY_VERSION = '1.0.0' as const

export type SafetySeverity = 'emergency' | 'high' | 'medium' | 'low' | 'info'

export type SafetyCategory =
  | 'emergency_danger_sign'
  | 'clinical_triage'
  | 'ai_query_guardrail'
  | 'onboarding_baseline'
  | 'free_text_alert'
  | 'data_integrity'
  | 'pacing_guidance'

export type EscalationPath =
  | 'emergency_911_ed'
  | 'urgent_clinician_triage'
  | 'routine_clinician_review'
  | 'ai_refusal_redirect'
  | 'safe_pacing_protocol'
  | 'data_verification_prompt'

export type EvidenceAuthority =
  | 'CDC HEADS UP'
  | 'Amsterdam 2022 Consensus'
  | 'Living Concussion Guidelines (Adult)'
  | 'PedsConcussion Guidelines'
  | 'Clinical Safety Governance Board'

export interface EvidenceSource {
  authority: EvidenceAuthority
  citation: string
  guidelineSection: string
  approvedBy: string
  reviewDate: string
}

export interface UserGuidance {
  guidanceCode: string
  guidanceKey: string
  defaultSafeText: string
}

export interface SafetyRule {
  ruleId: string
  version: string
  name: string
  category: SafetyCategory
  severity: SafetySeverity
  requiredInputs: string[]
  outputCode: string
  evidenceSource: EvidenceSource
  escalationPath: EscalationPath
  userGuidance: UserGuidance
}

// Machine-readable standardized output codes
export const SAFETY_OUTPUT_CODES = {
  EMERGENCY_DANGER_SIGN_DETECTED: 'EMERGENCY_DANGER_SIGN_DETECTED',
  EMERGENCY_RED_FLAG_KEYWORD_DETECTED: 'EMERGENCY_RED_FLAG_KEYWORD_DETECTED',
  TRIAGE_ELEVATED_BURDEN: 'TRIAGE_ELEVATED_BURDEN',
  TRIAGE_TRAJECTORY_SPIKE: 'TRIAGE_TRAJECTORY_SPIKE',
  TRIAGE_REVIEW_BURDEN: 'TRIAGE_REVIEW_BURDEN',
  TRIAGE_PERSISTENT_PLATEAU: 'TRIAGE_PERSISTENT_PLATEAU',
  TRIAGE_PROLONGED_SINGLE_SEVERE: 'TRIAGE_PROLONGED_SINGLE_SEVERE',
  GUARDRAIL_DIAGNOSTIC_ATTEMPT: 'GUARDRAIL_DIAGNOSTIC_ATTEMPT',
  GUARDRAIL_PRESCRIPTION_ATTEMPT: 'GUARDRAIL_PRESCRIPTION_ATTEMPT',
  GUARDRAIL_CLEARANCE_ATTEMPT: 'GUARDRAIL_CLEARANCE_ATTEMPT',
  GUARDRAIL_OVERRIDE_ATTEMPT: 'GUARDRAIL_OVERRIDE_ATTEMPT',
  DATA_INCOMPLETE_FAILSAFE: 'DATA_INCOMPLETE_FAILSAFE',
  DATA_CONFLICT_FAILSAFE: 'DATA_CONFLICT_FAILSAFE',
  PACING_EXERTION_THRESHOLD: 'PACING_EXERTION_THRESHOLD',
  PACING_ACUTE_REST_RECOMMENDED: 'PACING_ACUTE_REST_RECOMMENDED',
  ONBOARDING_ACUTE_RED_FLAG: 'ONBOARDING_ACUTE_RED_FLAG',
  ONBOARDING_HIGH_INITIAL_BURDEN: 'ONBOARDING_HIGH_INITIAL_BURDEN',
} as const

export type SafetyOutputCode = (typeof SAFETY_OUTPUT_CODES)[keyof typeof SAFETY_OUTPUT_CODES]

// Master Clinical Safety Rule Registry
export const SAFETY_RULES: Record<string, SafetyRule> = {
  // --- TIER 1: EMERGENCY DANGER SIGNS (CDC HEADS UP) ---
  'RULE-RED-FLAG-PUPIL': {
    ruleId: 'RULE-RED-FLAG-PUPIL',
    version: '1.0.0',
    name: 'Asymmetric Pupil Size',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs in Adults: Unequal pupil size (anisocoria)',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-PUPIL',
      guidanceKey: 'emergency.danger_signs.pupil',
      defaultSafeText:
        'Unequal pupil size can indicate an acute intracranial emergency. Stop routine check-in and seek immediate medical evaluation or call 911.',
    },
  },

  'RULE-RED-FLAG-DROWSINESS': {
    ruleId: 'RULE-RED-FLAG-DROWSINESS',
    version: '1.0.0',
    name: 'Inability to Wake Up / Severe Drowsiness',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs in Adults & Children: Drowsiness or cannot be awakened',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-DROWSINESS',
      guidanceKey: 'emergency.danger_signs.drowsiness',
      defaultSafeText:
        'Inability to wake up or extreme worsening drowsiness requires urgent medical care. Call 911 or proceed to the nearest Emergency Department.',
    },
  },

  'RULE-RED-FLAG-HEADACHE-WORSENING': {
    ruleId: 'RULE-RED-FLAG-HEADACHE-WORSENING',
    version: '1.0.0',
    name: 'Progressively Worsening Headache',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs: Headache that gets worse and does not go away',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-HEADACHE',
      guidanceKey: 'emergency.danger_signs.headache',
      defaultSafeText:
        'A headache that worsens progressively and does not remit requires immediate clinical examination to rule out complications.',
    },
  },

  'RULE-RED-FLAG-WEAKNESS': {
    ruleId: 'RULE-RED-FLAG-WEAKNESS',
    version: '1.0.0',
    name: 'Focal Neurological Weakness or Slurred Speech',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs: Slurred speech, weakness, numbness, or decreased coordination',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-WEAKNESS',
      guidanceKey: 'emergency.danger_signs.weakness',
      defaultSafeText:
        'Weakness, numbness, or slurred speech are acute focal signs requiring urgent medical evaluation at an Emergency Department.',
    },
  },

  'RULE-RED-FLAG-VOMITING': {
    ruleId: 'RULE-RED-FLAG-VOMITING',
    version: '1.0.0',
    name: 'Repeated Vomiting or Acute Nausea',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs: Repeated vomiting or nausea',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-VOMITING',
      guidanceKey: 'emergency.danger_signs.vomiting',
      defaultSafeText:
        'Repeated vomiting after head trauma requires prompt medical assessment to evaluate for intracranial pressure or secondary injury.',
    },
  },

  'RULE-RED-FLAG-SEIZURE': {
    ruleId: 'RULE-RED-FLAG-SEIZURE',
    version: '1.0.0',
    name: 'Convulsions or Seizures',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs: Convulsions or seizures',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-SEIZURE',
      guidanceKey: 'emergency.danger_signs.seizure',
      defaultSafeText:
        'Seizures or convulsions after head injury are medical emergencies. Call 911 immediately.',
    },
  },

  'RULE-RED-FLAG-CONFUSION': {
    ruleId: 'RULE-RED-FLAG-CONFUSION',
    version: '1.0.0',
    name: 'Increasing Confusion or Agitation',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs: Unusual behavior, increased confusion, restlessness, or agitation',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-CONFUSION',
      guidanceKey: 'emergency.danger_signs.confusion',
      defaultSafeText:
        'Rapidly increasing confusion, restlessness, or unusual behavioral changes require urgent medical evaluation.',
    },
  },

  'RULE-RED-FLAG-LOSS-CONSCIOUSNESS': {
    ruleId: 'RULE-RED-FLAG-LOSS-CONSCIOUSNESS',
    version: '1.0.0',
    name: 'Loss of Consciousness',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Signs: Loss of consciousness (even briefly)',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-LOC',
      guidanceKey: 'emergency.danger_signs.loss_consciousness',
      defaultSafeText:
        'Any documented loss of consciousness warrants clinical assessment by an emergency healthcare provider.',
    },
  },

  'RULE-RED-FLAG-NECK-PAIN': {
    ruleId: 'RULE-RED-FLAG-NECK-PAIN',
    version: '1.0.0',
    name: 'Severe Neck Pain or Tenderness',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'Amsterdam 2022 Consensus',
      citation: 'Patricios JS et al. Consensus statement on concussion in sport. Br J Sports Med 2023;57(11):695-711',
      guidelineSection: 'Table 1: Red flags for cervical spine injury and urgent referral',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-NECK',
      guidanceKey: 'emergency.danger_signs.neck_pain',
      defaultSafeText:
        'Severe neck pain or spinal tenderness following head impact requires immediate immobilization and emergency evaluation.',
    },
  },

  'RULE-RED-FLAG-FLUID': {
    ruleId: 'RULE-RED-FLAG-FLUID',
    version: '1.0.0',
    name: 'CSF Leak or Bleeding from Nose/Ears',
    category: 'emergency_danger_sign',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_DANGER_SIGN_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Signs of Basilar Skull Fracture',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-EMERGENCY-FLUID',
      guidanceKey: 'emergency.danger_signs.fluid',
      defaultSafeText:
        'Clear fluid or bleeding from the ears or nose requires immediate emergency evaluation to rule out structural injury.',
    },
  },

  // --- TIER 2: LONGITUDINAL CLINICIAN TRIAGE ALERTS (ONF / PedsConcussion) ---
  'RULE-TRIAGE-ELEVATED-SCORE': {
    ruleId: 'RULE-TRIAGE-ELEVATED-SCORE',
    version: '1.0.0',
    name: 'High Total Symptom Burden (>= 30/48)',
    category: 'clinical_triage',
    severity: 'high',
    requiredInputs: ['symptomTotal'],
    outputCode: SAFETY_OUTPUT_CODES.TRIAGE_ELEVATED_BURDEN,
    evidenceSource: {
      authority: 'Living Concussion Guidelines (Adult)',
      citation: 'Clinical Expert Working Group. Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition (2024)',
      guidelineSection: 'Section 3: Symptom Inventory and High-Burden Triage Thresholds',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'urgent_clinician_triage',
    userGuidance: {
      guidanceCode: 'GUIDANCE-TRIAGE-ELEVATED',
      guidanceKey: 'triage.elevated_burden',
      defaultSafeText:
        'Your logged symptom total is elevated (30 or higher across 8 categories). Prioritize cognitive and physical rest, and contact your healthcare provider for guidance.',
    },
  },

  'RULE-TRIAGE-TRAJECTORY-SPIKE': {
    ruleId: 'RULE-TRIAGE-TRAJECTORY-SPIKE',
    version: '1.0.0',
    name: 'Rapid Multi-Day Symptom Spike (>= 6 pt increase over 3 days)',
    category: 'clinical_triage',
    severity: 'high',
    requiredInputs: ['symptomTotal', 'priorDaysTotal'],
    outputCode: SAFETY_OUTPUT_CODES.TRIAGE_TRAJECTORY_SPIKE,
    evidenceSource: {
      authority: 'Living Concussion Guidelines (Adult)',
      citation: 'Clinical Expert Working Group. Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition (2024)',
      guidelineSection: 'Section 4.1: Trajectory Deterioration and Acute Exacerbations',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'urgent_clinician_triage',
    userGuidance: {
      guidanceCode: 'GUIDANCE-TRIAGE-SPIKE',
      guidanceKey: 'triage.trajectory_spike',
      defaultSafeText:
        'A significant increase in reported symptoms has been logged over recent days. Consider scaling back activity and discussing this change with your clinician.',
    },
  },

  'RULE-TRIAGE-REVIEW-SCORE': {
    ruleId: 'RULE-TRIAGE-REVIEW-SCORE',
    version: '1.0.0',
    name: 'Moderate Symptom Burden (15-29/48)',
    category: 'clinical_triage',
    severity: 'medium',
    requiredInputs: ['symptomTotal'],
    outputCode: SAFETY_OUTPUT_CODES.TRIAGE_REVIEW_BURDEN,
    evidenceSource: {
      authority: 'Living Concussion Guidelines (Adult)',
      citation: 'Clinical Expert Working Group. Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition (2024)',
      guidelineSection: 'Section 3: Moderate Symptom Classification and Monitoring',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'routine_clinician_review',
    userGuidance: {
      guidanceCode: 'GUIDANCE-TRIAGE-REVIEW',
      guidanceKey: 'triage.review_burden',
      defaultSafeText:
        'Your logged symptom total indicates moderate symptoms. Continue symptom-guided pacing and pace your daily cognitive and physical tasks.',
    },
  },

  'RULE-TRIAGE-PLATEAU': {
    ruleId: 'RULE-TRIAGE-PLATEAU',
    version: '1.0.0',
    name: 'Persistent Plateau (>14 Days Without Improvement)',
    category: 'clinical_triage',
    severity: 'medium',
    requiredInputs: ['longitudinalTrend'],
    outputCode: SAFETY_OUTPUT_CODES.TRIAGE_PERSISTENT_PLATEAU,
    evidenceSource: {
      authority: 'Living Concussion Guidelines (Adult)',
      citation: 'Clinical Expert Working Group. Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition (2024)',
      guidelineSection: 'Section 5: Persistent Post-Concussive Symptoms and Multi-disciplinary Referral',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'routine_clinician_review',
    userGuidance: {
      guidanceCode: 'GUIDANCE-TRIAGE-PLATEAU',
      guidanceKey: 'triage.persistent_plateau',
      defaultSafeText:
        'Symptom levels have remained unchanged for over two weeks. Discuss multidisciplinary management strategies with your clinician at your next appointment.',
    },
  },

  'RULE-TRIAGE-SINGLE-SEVERE': {
    ruleId: 'RULE-TRIAGE-SINGLE-SEVERE',
    version: '1.0.0',
    name: 'Single Symptom High Severity (>=5 for >=7 days)',
    category: 'clinical_triage',
    severity: 'medium',
    requiredInputs: ['symptoms', 'longitudinalTrend'],
    outputCode: SAFETY_OUTPUT_CODES.TRIAGE_PROLONGED_SINGLE_SEVERE,
    evidenceSource: {
      authority: 'Living Concussion Guidelines (Adult)',
      citation: 'Clinical Expert Working Group. Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition (2024)',
      guidelineSection: 'Section 4: Domain-Specific Persistent Symptoms',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'routine_clinician_review',
    userGuidance: {
      guidanceCode: 'GUIDANCE-TRIAGE-SINGLE-SEVERE',
      guidanceKey: 'triage.prolonged_single_severe',
      defaultSafeText:
        'A specific symptom has remained high (5 or 6) for consecutive days. Review targeted management options with your healthcare provider.',
    },
  },

  // --- TIER 3: PROHIBITED AI QUERY GUARDRAILS ---
  'RULE-AI-GUARD-DIAGNOSIS': {
    ruleId: 'RULE-AI-GUARD-DIAGNOSIS',
    version: '1.0.0',
    name: 'Diagnostic Assessment Query Intercept',
    category: 'ai_query_guardrail',
    severity: 'high',
    requiredInputs: ['queryText'],
    outputCode: SAFETY_OUTPUT_CODES.GUARDRAIL_DIAGNOSTIC_ATTEMPT,
    evidenceSource: {
      authority: 'Clinical Safety Governance Board',
      citation: 'CRI Clinical Scope, Safety Boundaries & Governance Specification (CRI-SPEC-CLINICAL-001)',
      guidelineSection: 'Section 3: Strict Clinical Red Lines — No Automated Diagnosis',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'ai_refusal_redirect',
    userGuidance: {
      guidanceCode: 'GUIDANCE-GUARD-DIAGNOSIS',
      guidanceKey: 'ai_guardrail.refusal_diagnosis',
      defaultSafeText:
        'CRI is a tracking and recovery support tool and cannot provide medical diagnoses or assess injury status. Please consult a licensed medical professional for a clinical evaluation.',
    },
  },

  'RULE-AI-GUARD-PRESCRIPTION': {
    ruleId: 'RULE-AI-GUARD-PRESCRIPTION',
    version: '1.0.0',
    name: 'Medication / Prescription Query Intercept',
    category: 'ai_query_guardrail',
    severity: 'high',
    requiredInputs: ['queryText'],
    outputCode: SAFETY_OUTPUT_CODES.GUARDRAIL_PRESCRIPTION_ATTEMPT,
    evidenceSource: {
      authority: 'Clinical Safety Governance Board',
      citation: 'CRI Clinical Scope, Safety Boundaries & Governance Specification (CRI-SPEC-CLINICAL-001)',
      guidelineSection: 'Section 3: Strict Clinical Red Lines — No Medication Prescription or Dosing',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'ai_refusal_redirect',
    userGuidance: {
      guidanceCode: 'GUIDANCE-GUARD-PRESCRIPTION',
      guidanceKey: 'ai_guardrail.refusal_prescription',
      defaultSafeText:
        'CRI does not recommend or prescribe medications or dosages. Please discuss symptom management and medications with your physician or pharmacist.',
    },
  },

  'RULE-AI-GUARD-CLEARANCE': {
    ruleId: 'RULE-AI-GUARD-CLEARANCE',
    version: '1.0.0',
    name: 'Return-to-Activity / Sport Clearance Query Intercept',
    category: 'ai_query_guardrail',
    severity: 'high',
    requiredInputs: ['queryText'],
    outputCode: SAFETY_OUTPUT_CODES.GUARDRAIL_CLEARANCE_ATTEMPT,
    evidenceSource: {
      authority: 'Amsterdam 2022 Consensus',
      citation: 'Patricios JS et al. Consensus statement on concussion in sport. Br J Sports Med 2023;57(11):695-711',
      guidelineSection: 'Section 4.3: Graduated Return-to-Sport (RTS) Strategy and Medical Clearance',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'ai_refusal_redirect',
    userGuidance: {
      guidanceCode: 'GUIDANCE-GUARD-CLEARANCE',
      guidanceKey: 'ai_guardrail.refusal_clearance',
      defaultSafeText:
        'CRI cannot clear anyone to return to sports, work, school, or driving. Medical clearance requires in-person evaluation by a licensed healthcare provider following graduated protocols.',
    },
  },

  'RULE-AI-GUARD-OVERRIDE': {
    ruleId: 'RULE-AI-GUARD-OVERRIDE',
    version: '1.0.0',
    name: 'Danger-Sign Dismissal / Reassurance Override Intercept',
    category: 'ai_query_guardrail',
    severity: 'high',
    requiredInputs: ['queryText'],
    outputCode: SAFETY_OUTPUT_CODES.GUARDRAIL_OVERRIDE_ATTEMPT,
    evidenceSource: {
      authority: 'Clinical Safety Governance Board',
      citation: 'CRI Clinical Scope, Safety Boundaries & Governance Specification (CRI-SPEC-CLINICAL-001)',
      guidelineSection: 'Section 3: Strict Clinical Red Lines — No Reassurance Override of Danger Signs',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'ai_refusal_redirect',
    userGuidance: {
      guidanceCode: 'GUIDANCE-GUARD-OVERRIDE',
      guidanceKey: 'ai_guardrail.refusal_override',
      defaultSafeText:
        'Severe or worsening neurological symptoms must never be ignored or dismissed. If you are experiencing red-flag danger signs, seek immediate medical attention or call 911.',
    },
  },

  // --- TIER 4: PACING & ACTIVE RECOVERY GUIDANCE (Amsterdam 2022) ---
  'RULE-PACING-EXERTION-HEADACHE': {
    ruleId: 'RULE-PACING-EXERTION-HEADACHE',
    version: '1.0.0',
    name: 'Symptom-Exertion Coincidence Pacing Guidance',
    category: 'pacing_guidance',
    severity: 'low',
    requiredInputs: ['symptoms', 'screenMinutes', 'cognitiveMinutes'],
    outputCode: SAFETY_OUTPUT_CODES.PACING_EXERTION_THRESHOLD,
    evidenceSource: {
      authority: 'Amsterdam 2022 Consensus',
      citation: 'Patricios JS et al. Consensus statement on concussion in sport. Br J Sports Med 2023;57(11):695-711',
      guidelineSection: 'Section 4.2: Symptom-Exacerbation Thresholds during Cognitive & Physical Activity',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'safe_pacing_protocol',
    userGuidance: {
      guidanceCode: 'GUIDANCE-PACING-EXERTION',
      guidanceKey: 'pacing.exertion_threshold',
      defaultSafeText:
        'Higher screen or cognitive load coincided with higher headache ratings. Consider taking scheduled 10-minute rest breaks before symptom exacerbation occurs.',
    },
  },

  'RULE-PACING-ACUTE-REST': {
    ruleId: 'RULE-PACING-ACUTE-REST',
    version: '1.0.0',
    name: 'Initial 24-48h Relative Rest Guidance',
    category: 'pacing_guidance',
    severity: 'info',
    requiredInputs: ['daysSinceInjury'],
    outputCode: SAFETY_OUTPUT_CODES.PACING_ACUTE_REST_RECOMMENDED,
    evidenceSource: {
      authority: 'Amsterdam 2022 Consensus',
      citation: 'Patricios JS et al. Consensus statement on concussion in sport. Br J Sports Med 2023;57(11):695-711',
      guidelineSection: 'Section 4.1: Acute Rest (24-48 Hours) Followed by Symptom-Guided Sub-Symptom Threshold Activity',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'safe_pacing_protocol',
    userGuidance: {
      guidanceCode: 'GUIDANCE-PACING-ACUTE-REST',
      guidanceKey: 'pacing.acute_rest',
      defaultSafeText:
        'During the initial 24 to 48 hours post-injury, relative rest is recommended, followed by gradual re-introduction of light sub-symptom activities.',
    },
  },

  // --- ONBOARDING & BASELINE RULES ---
  'RULE-ONBOARDING-ACUTE-RED-FLAG': {
    ruleId: 'RULE-ONBOARDING-ACUTE-RED-FLAG',
    version: '1.0.0',
    name: 'Acute Red Flags Detected in Initial Screening',
    category: 'onboarding_baseline',
    severity: 'emergency',
    requiredInputs: ['dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.ONBOARDING_ACUTE_RED_FLAG,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Initial Triage Red Flags',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-ONBOARDING-EMERGENCY',
      guidanceKey: 'onboarding.acute_red_flag',
      defaultSafeText:
        'Red flag danger signs were identified during initial intake. Immediate medical evaluation at an Emergency Department is required.',
    },
  },

  'RULE-ONBOARDING-HIGH-INITIAL-BURDEN': {
    ruleId: 'RULE-ONBOARDING-HIGH-INITIAL-BURDEN',
    version: '1.0.0',
    name: 'High Baseline Symptom Burden (>= 35/48)',
    category: 'onboarding_baseline',
    severity: 'high',
    requiredInputs: ['symptomTotal'],
    outputCode: SAFETY_OUTPUT_CODES.ONBOARDING_HIGH_INITIAL_BURDEN,
    evidenceSource: {
      authority: 'Living Concussion Guidelines (Adult)',
      citation: 'Clinical Expert Working Group. Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition (2024)',
      guidelineSection: 'Section 2: Initial Clinical Assessment and Prognostic Factors',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'urgent_clinician_triage',
    userGuidance: {
      guidanceCode: 'GUIDANCE-ONBOARDING-HIGH-BURDEN',
      guidanceKey: 'onboarding.high_baseline_burden',
      defaultSafeText:
        'Initial logged symptoms show a high burden. A formal clinical intake evaluation with a licensed healthcare professional is strongly advised.',
    },
  },

  // --- FREE-TEXT & UNSTRUCTURED NOTE SAFETY ---
  'RULE-TEXT-RED-FLAG': {
    ruleId: 'RULE-TEXT-RED-FLAG',
    version: '1.0.0',
    name: 'Red Flag Keyword Detected in Unstructured Text',
    category: 'free_text_alert',
    severity: 'emergency',
    requiredInputs: ['text'],
    outputCode: SAFETY_OUTPUT_CODES.EMERGENCY_RED_FLAG_KEYWORD_DETECTED,
    evidenceSource: {
      authority: 'CDC HEADS UP',
      citation: 'U.S. CDC Traumatic Brain Injury & Concussion Danger Signs (2024-2026)',
      guidelineSection: 'Danger Sign Language Matching',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'emergency_911_ed',
    userGuidance: {
      guidanceCode: 'GUIDANCE-TEXT-RED-FLAG',
      guidanceKey: 'free_text.red_flag_detected',
      defaultSafeText:
        'Your note contains references to urgent neurological danger signs (e.g. seizure, loss of consciousness, repeated vomiting). Seek immediate emergency medical care or call 911.',
    },
  },

  // --- DATA INTEGRITY & FAIL-SAFE CONFLICT RULES ---
  'RULE-DATA-INCOMPLETE': {
    ruleId: 'RULE-DATA-INCOMPLETE',
    version: '1.0.0',
    name: 'Incomplete Assessment Data Fail-Safe',
    category: 'data_integrity',
    severity: 'medium',
    requiredInputs: ['symptoms'],
    outputCode: SAFETY_OUTPUT_CODES.DATA_INCOMPLETE_FAILSAFE,
    evidenceSource: {
      authority: 'Clinical Safety Governance Board',
      citation: 'CRI Clinical Scope, Safety Boundaries & Governance Specification (CRI-SPEC-CLINICAL-001)',
      guidelineSection: 'Section 4.3: Handling Uncertainty & Incomplete Data — Fail-Safe Default',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'data_verification_prompt',
    userGuidance: {
      guidanceCode: 'GUIDANCE-DATA-INCOMPLETE',
      guidanceKey: 'data_integrity.incomplete_failsafe',
      defaultSafeText:
        'Some required daily symptom entries are missing. In the absence of complete data, conservative pacing and rest guidelines are recommended.',
    },
  },

  'RULE-DATA-CONFLICT': {
    ruleId: 'RULE-DATA-CONFLICT',
    version: '1.0.0',
    name: 'Conflicting Clinical Data Fail-Safe',
    category: 'data_integrity',
    severity: 'high',
    requiredInputs: ['symptoms', 'text', 'dangerSigns'],
    outputCode: SAFETY_OUTPUT_CODES.DATA_CONFLICT_FAILSAFE,
    evidenceSource: {
      authority: 'Clinical Safety Governance Board',
      citation: 'CRI Clinical Scope, Safety Boundaries & Governance Specification (CRI-SPEC-CLINICAL-001)',
      guidelineSection: 'Section 4.3: Handling Uncertainty & Incomplete Data — Conflict Resolution',
      approvedBy: 'Clinical Safety Governance Board / Dr. Sarah Lin, MD',
      reviewDate: '2026-08-31',
    },
    escalationPath: 'urgent_clinician_triage',
    userGuidance: {
      guidanceCode: 'GUIDANCE-DATA-CONFLICT',
      guidanceKey: 'data_integrity.conflict_failsafe',
      defaultSafeText:
        'There is a conflict between your symptom ratings and notes. For safety, the system is applying conservative guidance. Please review your entries or contact your clinician.',
    },
  },
}
