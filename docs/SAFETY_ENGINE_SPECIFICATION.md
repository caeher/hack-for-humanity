# CRI Safety Engine Specification & Clinical Rule Catalog

**Document ID:** CRI-SPEC-SAFETY-002  
**Version:** 1.0.0 (Phase 2 Baseline)  
**Status:** Approved / Active Baseline  
**Date of Initial Release:** September 2, 2026  
**Clinical Review Board:** Dr. Sarah Lin, MD (Chief Medical Officer), Clinical Safety Governance Board  
**Target Population:** Adolescents and adults (13+) recovering from diagnosed or suspected concussion / mTBI.

---

## 1. Executive Summary & Core Principles

The **CRI Safety Engine** is a deterministic, guideline-derived clinical evaluation system. It inspects all structured and unstructured inputs (daily check-ins, onboarding assessments, free-text extractions, and user AI queries) **before** any AI-generated response, routine insight, or activity progression is computed.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CRI Safety Engine Pipeline                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [Input Context: Check-in / Onboarding / Free-text / AI Query]          │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Phase 1: Input Validation                      │  │
│  │   • Likert range validation (0–6 across 8 symptom domains)        │  │
│  │   • Control character stripping & date validation                 │  │
│  │   • Completeness & contradiction inspection                       │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               Phase 2: Deterministic Rule Matching                │  │
│  │   • Tier 1: Red Flag Emergency Danger Signs (CDC HEADS UP)        │  │
│  │   • Tier 2: Longitudinal Triage & Trajectory (ONF Living / Peds)  │  │
│  │   • Tier 3: Prohibited AI Query Guardrails (No Dx / Rx / Clear)   │  │
│  │   • Tier 4: Sub-threshold Active Pacing (Amsterdam 2022)          │  │
│  │   • Data Integrity & Fail-Safe Conflict Rules                     │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 Phase 3: Outcome & Action Blocking                │  │
│  │   • Compute status: safe | warning | review | elevated | emergency│  │
│  │   • Enforce blocked actions: ['invoke_llm', 'allow_routine_flow'] │  │
│  │   • Apply fail-safe defaults if data is incomplete or conflicting │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│                                  ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               Phase 4: Privacy-Minimizing Audit Log               │  │
│  │   • Record rule ID, version, output code, and sanitized metric   │  │
│  │   • Omit raw PII and sensitive text bodies                        │  │
│  │   • Synchronize urgent alerts to clinician triage queue           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Core Clinical Principles:
1. **Never Diagnostic:** The Safety Engine never returns diagnostic labels, medical grades, or condition assertions.
2. **Never Prescriptive:** The engine never recommends medications, pharmaceuticals, or dosages.
3. **No Activity Clearance:** The engine never clears individuals to return to sport, work, school, or driving.
4. **Fail-Safe Default:** When data is incomplete, corrupted, or contradictory, the engine fails safe toward conservative pacing guidance.
5. **Traceability:** Every rule is versioned (`1.0.0`) and linked to an approved peer-reviewed clinical authority and reviewer.
6. **Payload Minimization:** Audit trails store machine-readable rule IDs, output codes, and minimized trigger metrics, avoiding PII leakage.

---

## 2. 4-Tier Risk Escalation Hierarchy

| Tier | Category | Triggers | System Action & UI Touchpoint | Escalation Path |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Emergency Danger Signs** | Acute red flags (unequal pupils, convulsions, repeated vomiting, slurred speech, loss of consciousness, severe neck tenderness) | • Interrupts standard check-in<br>• Blocks routine AI responses<br>• Displays Emergency 911 / ED screen | `emergency_911_ed` |
| **Tier 2** | **Clinical Triage Alerts** | Symptom total $\ge 30$, 3-day trajectory spike $\ge 6$ pts, 14-day plateau, severe single symptom $\ge 5$ for 7 days | • Flags patient for clinician caseload review<br>• Displays elevated risk badge<br>• Recommends care-team outreach | `urgent_clinician_triage`<br>`routine_clinician_review` |
| **Tier 3** | **Prohibited AI Query Guardrails** | User queries asking for diagnosis, drug prescriptions, activity clearance, or danger-sign dismissal | • Intercepts query before LLM / RAG<br>• Returns standardized refusal guidance<br>• Blocks model generation | `ai_refusal_redirect` |
| **Tier 4** | **Evidence-Grounded Active Pacing** | High screen/cognitive load coinciding with headache spike; first 24-48h post-injury rest | • Displays active recovery pacing tip<br>• Recommends scheduled rest breaks | `safe_pacing_protocol` |

---

## 3. Master Clinical Rule Catalog (Version 1.0.0)

### 3.1 Tier 1: Emergency Danger Signs (CDC HEADS UP)

| Rule ID | Clinical Condition | Severity | Required Inputs | Output Code | Governing Evidence & Citation | Approved By | Escalation Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `RULE-RED-FLAG-PUPIL` | Asymmetric pupil size | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-DROWSINESS` | Inability to wake up / extreme drowsiness | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-HEADACHE-WORSENING` | Progressively worsening headache | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-WEAKNESS` | Focal weakness, numbness, slurred speech | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-VOMITING` | Repeated vomiting or acute nausea | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-SEIZURE` | Convulsions or seizures | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-CONFUSION` | Increasing confusion, agitation, unusual behavior | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-LOSS-CONSCIOUSNESS` | Loss of consciousness (any duration) | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-NECK-PAIN` | Severe neck tenderness / spinal red flag | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | Amsterdam 2022 Consensus (Patricios et al. 2023) | Dr. Sarah Lin, MD | `emergency_911_ed` |
| `RULE-RED-FLAG-FLUID` | Fluid or bleeding from nose/ears | `emergency` | `dangerSigns` | `EMERGENCY_DANGER_SIGN_DETECTED` | U.S. CDC TBI Danger Signs (2024-2026) | Dr. Sarah Lin, MD | `emergency_911_ed` |

### 3.2 Tier 2: Longitudinal Clinician Triage Rules

| Rule ID | Clinical Condition | Severity | Required Inputs | Output Code | Governing Evidence & Citation | Approved By | Escalation Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `RULE-TRIAGE-ELEVATED-SCORE` | Symptom total $\ge 30$ / 48 | `high` | `symptomTotal` | `TRIAGE_ELEVATED_BURDEN` | ONF Living Concussion Guidelines (3rd Ed. 2024) | Dr. Sarah Lin, MD | `urgent_clinician_triage` |
| `RULE-TRIAGE-TRAJECTORY-SPIKE` | Multi-day symptom increase $\ge 6$ pts in 3 days | `high` | `symptomTotal`, `history` | `TRIAGE_TRAJECTORY_SPIKE` | ONF Living Concussion Guidelines (3rd Ed. 2024) | Dr. Sarah Lin, MD | `urgent_clinician_triage` |
| `RULE-TRIAGE-REVIEW-SCORE` | Moderate symptom burden (15–29 / 48) | `medium` | `symptomTotal` | `TRIAGE_REVIEW_BURDEN` | ONF Living Concussion Guidelines (3rd Ed. 2024) | Dr. Sarah Lin, MD | `routine_clinician_review` |
| `RULE-TRIAGE-PLATEAU` | Symptoms unvaried for $> 14$ days | `medium` | `history` | `TRIAGE_PERSISTENT_PLATEAU` | ONF Living Concussion Guidelines (3rd Ed. 2024) | Dr. Sarah Lin, MD | `routine_clinician_review` |
| `RULE-TRIAGE-SINGLE-SEVERE` | Single symptom $\ge 5$ for $\ge 7$ days | `medium` | `symptoms`, `history` | `TRIAGE_PROLONGED_SINGLE_SEVERE` | ONF Living Concussion Guidelines (3rd Ed. 2024) | Dr. Sarah Lin, MD | `routine_clinician_review` |

### 3.3 Tier 3: Prohibited AI Query Guardrails

| Rule ID | Prohibited Query Intent | Severity | Required Inputs | Output Code | Fallback Guidance Standard | Approved By | Escalation Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `RULE-AI-GUARD-DIAGNOSIS` | Inquiries requesting concussion diagnosis / stage | `high` | `queryText` | `GUARDRAIL_DIAGNOSTIC_ATTEMPT` | *"CRI is a tracking tool and cannot provide medical diagnoses. Consult a licensed medical professional."* | Dr. Sarah Lin, MD | `ai_refusal_redirect` |
| `RULE-AI-GUARD-PRESCRIPTION` | Inquiries requesting drug prescription or dosage | `high` | `queryText` | `GUARDRAIL_PRESCRIPTION_ATTEMPT` | *"CRI does not recommend or prescribe medications or dosages. Discuss medications with your physician or pharmacist."* | Dr. Sarah Lin, MD | `ai_refusal_redirect` |
| `RULE-AI-GUARD-CLEARANCE` | Inquiries requesting sport, drive, or work clearance | `high` | `queryText` | `GUARDRAIL_CLEARANCE_ATTEMPT` | *"CRI cannot clear anyone to return to activity. Medical clearance requires in-person clinical evaluation."* | Dr. Sarah Lin, MD | `ai_refusal_redirect` |
| `RULE-AI-GUARD-OVERRIDE` | Inquiries requesting to dismiss or ignore danger signs | `high` | `queryText` | `GUARDRAIL_OVERRIDE_ATTEMPT` | *"Severe or worsening neurological symptoms must never be ignored. If danger signs exist, call 911."* | Dr. Sarah Lin, MD | `ai_refusal_redirect` |

### 3.4 Data Integrity & Fail-Safe Conflict Rules

| Rule ID | Integrity Condition | Severity | Required Inputs | Output Code | Safe Resolution Mechanism | Approved By | Escalation Path |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `RULE-DATA-INCOMPLETE` | Missing or invalid symptom fields | `medium` | `symptoms` | `DATA_INCOMPLETE_FAILSAFE` | Flags `failSafeApplied: true`; defaults to safe rest and conservative pacing. | Dr. Sarah Lin, MD | `data_verification_prompt` |
| `RULE-DATA-CONFLICT` | Zero symptom score with red flag text note | `high` | `symptoms`, `text`, `dangerSigns` | `DATA_CONFLICT_FAILSAFE` | Flags `failSafeApplied: true`; escalates red flag guidance over zero rating. | Dr. Sarah Lin, MD | `urgent_clinician_triage` |
| `RULE-TEXT-RED-FLAG` | Red-flag keywords in free-text note | `emergency` | `text` | `EMERGENCY_RED_FLAG_KEYWORD_DETECTED` | Immediate emergency escalation modal intercept. | Dr. Sarah Lin, MD | `emergency_911_ed` |

---

## 4. Audit Trail & Privacy Minimization

When evaluations are persisted to the Convex database table `safetyEvaluations`, strict payload minimization is enforced:

```typescript
// Example of Sanitized Safety Evaluation Record
{
  "_id": "k17...",
  "patientId": "j17...",
  "orgId": "j97...",
  "contextType": "check_in",
  "status": "elevated",
  "highestSeverity": "high",
  "ruleEngineVersion": "1.0.0",
  "matchedRuleCodes": [
    "TRIAGE_ELEVATED_BURDEN",
    "TRIAGE_TRAJECTORY_SPIKE"
  ],
  "matchedEvidenceSummary": [
    "symptomTotal: 34 (threshold: >= 30)",
    "trajectoryDelta: +7 points over 3-day window (threshold: >= 6)"
  ],
  "primaryEscalation": "urgent_clinician_triage",
  "blockedActions": [
    "clear_activity"
  ],
  "failSafeApplied": false,
  "targetResourceId": "j23...",
  "createdAt": 1725324800000
}
```

**Privacy Guarantee:** Raw patient notes, identifiable descriptions, or sensitive conversational messages are never written to `matchedEvidenceSummary` or persisted in the safety audit index.

---

## 5. Versioning & Governance Lifecycle

1. **Rule Immutability:** Historical audit records contain `ruleEngineVersion` and `matchedRuleCodes`. Updates to rule conditions trigger minor version increments (`1.1.0`) without retroactively altering previous audit evaluations.
2. **Quarterly Review Cadence:** All rules, evidence citations, and approved reviewers are audited every 90 days.
3. **Off-Cycle Triggered Review:** Immediate review upon publication of updated consensus statements by CDC, CISG, or ONF.
