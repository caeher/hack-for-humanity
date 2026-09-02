# Clinical Scope, Safety Boundaries & Evidence Governance Specification

**Document ID:** CRI-SPEC-CLINICAL-001  
**Version:** 1.0.0 (Phase 0 Baseline)  
**Status:** Approved / Active Baseline  
**Date of Initial Release:** August 31, 2026  
**Last Review Date:** August 31, 2026  
**Next Scheduled Review:** November 30, 2026 (Quarterly Cadence)  
**Intended Target Population:** Adolescents and adults (ages 13+) recovering from diagnosed or suspected concussion / mild traumatic brain injury (mTBI), supported by caregivers and monitored by licensed healthcare clinicians.

---

## 1. Objective, Problem Statement & Value Proposition

### 1.1 Objective
This specification establishes the clinical and product contract for **Concussion Recovery Intelligence (CRI)**. CRI is a longitudinal recovery tracking, pattern observation, and educational support system designed to organize patient-reported symptoms, daily exertion context, and clinical summaries. 

**Fundamental Clinical Boundary:** CRI is strictly a supportive tracking and documentation platform. It is **NEVER** a diagnostic engine, treatment prescriber, prognostic recovery predictor, or return-to-activity clearance mechanism.

### 1.2 Problem Statement
Concussion recovery is complex, non-linear, and distributed across physical, cognitive, emotional, and sleep domains. Patients frequently experience:
- **Recall Bias:** Difficulty accurately recalling symptom severity, frequency, and activity triggers during brief clinical encounters weeks after injury.
- **Invisible Exertion Thresholds:** Lack of clear day-to-day visibility into how cognitive load, screen time, or physical exertion correlate with symptom spikes.
- **Anxiety & Uncertainty:** Fear and confusion caused by normal day-to-day symptom fluctuations, leading to either premature return to activity or prolonged unnecessary complete rest.
- **Fragmented Communication:** Lack of structured, longitudinal data shared among patients, family caregivers, and multidisciplinary healthcare providers.

### 1.3 Value Proposition by Persona
- **Patient (`/patient/*`):** Low-cognitive-load, accessible daily check-ins (<60 seconds), descriptive symptom tracking, exertion visibility, immediate red-flag emergency intercepts, and evidence-grounded educational context.
- **Caregiver (`/caregiver/*`):** Privacy-respecting recovery monitoring, pacing support, shared contextual observations, and objective trend visibility to assist loved ones without medical guesswork.
- **Clinician (`/clinician/*`):** Structured longitudinal trajectory reports, caseload risk triage (`Stable`, `Review`, `Elevated`), symptom-vs-activity timelines, and standardized appointment preparation to reduce recall bias and support clinical decision-making.
- **Administrator / Organization (`/admin/*`):** De-identified cohort analytics, role-based security audit logs, clinical guideline source citation governance, and safety compliance tracking.

---

## 2. Personas, Primary Journeys & Boundary Definitions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CRI Clinical Safety Architecture                   │
├─────────────────┬─────────────────┬──────────────────┬──────────────────┤
│  Patient Flow   │ Caregiver Flow  │  Clinician Flow  │  Admin / Org     │
│  (/patient/*)   │ (/caregiver/*)  │ (/clinician/*)   │  (/admin/*)      │
├─────────────────┼─────────────────┼──────────────────┼──────────────────┤
│ • Daily Log     │ • View Trends   │ • Caseload View  │ • Audit Logs     │
│ • Symptom Graph │ • Reminders     │ • Triage Alerts  │ • Cohort Metrics │
│ • Pacing Plan   │ • Observation   │ • Encounter Note │ • Evidence Base  │
│ • Emergency UI  │ • Care Context  │ • Export Report  │ • Role Admin     │
└────────┬────────┴────────┬────────┴────────┬─────────┴────────┬─────────┘
         │                 │                 │                  │
         ▼                 ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Deterministic Safety Engine & Guardrails                   │
│   • Red Flag Intercept (Immediate 911 / ED Escalation)                  │
│   • Strict Red Lines (No Diagnosis, No Prognosis, No Clearance)          │
│   • Non-Causal Pattern Phrasing & Uncertainty Handling                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Evidence Governance & Cited Clinical Sources               │
│   • CDC HEADS UP / TBI Guidance   • Amsterdam 2022 Consensus             │
│   • ONF Living Guidelines (Adult) • PedsConcussion Guidelines           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Persona Journey & Boundary Matrix

| Persona | Primary Journey | Allowed In-Scope Capabilities | Prohibited Out-of-Scope Actions |
| :--- | :--- | :--- | :--- |
| **Patient** (`/patient/*`) | 1. Daily Check-in (0–6 ratings across 8 symptoms)<br>2. Activity/exertion logging<br>3. Review descriptive trend dashboard<br>4. Access cited educational answers | • Log daily symptom severity<br>• Log physical, cognitive, screen exposures<br>• View descriptive symptom totals (0–48)<br>• Review pacing reminders | ❌ Self-diagnosis of concussion/mTBI<br>❌ Return-to-play/activity self-clearance<br>❌ Medication dosage guidance<br>❌ Recovery time predictions |
| **Caregiver** (`/caregiver/*`) | 1. Monitor permission-gated patient status<br>2. View multi-day symptom trends<br>3. Send supportive reminders<br>4. Review appointment talking points | • View non-causal trend summaries<br>• Assist with daily log reminders<br>• Export structured summary for appointments | ❌ Unilateral medical decisions<br>❌ Overriding clinical care plans<br>❌ Direct emergency triage substitution |
| **Clinician** (`/clinician/*`) | 1. Caseload triage (`Stable`, `Review`, `Elevated`)<br>2. Multi-day trajectory review<br>3. Clinical encounter documentation<br>4. Generate printable timeline reports | • Longitudinal trajectory analysis<br>• Triage risk review<br>• Encounter note logging<br>• Clinical report generation | ❌ Automated diagnosis signing<br>❌ Automated clearance certificates without clinician assessment |
| **Administrator** (`/admin/*`) | 1. Manage user access & RBAC<br>2. Audit safety and compliance logs<br>3. Monitor evidence source freshness<br>4. Review de-identified cohort statistics | • Access security audit trails<br>• Inspect guideline citation sources<br>• Provision user roles and permissions<br>• Cohort aggregation | ❌ Viewing unencrypted individual PII without audit justification<br>❌ Modifying historical patient check-in records |

---

## 3. Allowed Capabilities vs. Strictly Prohibited Claims (Red Lines)

To maintain absolute patient safety and regulatory compliance, all copy, features, AI prompts, and clinical outputs must strictly abide by the following boundaries:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                       STRICT CLINICAL RED LINES                            │
├────────────────────────────────────────────────────────────────────────────┤
│  1. NO Diagnosis: Never state or imply a medical condition is present.     │
│  2. NO Prescription: Never prescribe or recommend drug dosages.           │
│  3. NO Prognosis: Never predict exact recovery duration or timelines.     │
│  4. NO Clearance: Never clear a patient for sport, work, or driving.       │
│  5. NO Reassurance Override: Never dismiss worsening or severe symptoms.   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Direct Copy Standards (Prohibited vs. Safe Phrasing)

| Context | ❌ Strictly Prohibited Phrasing | ✅ Mandatory Safe Phrasing |
| :--- | :--- | :--- |
| **Recovery Status** | "You are 85% cured" or "Recovery Score: 85/100" | "Patient-Reported Symptom Total: 14/48 (Descriptive sum across 8 categories; lower reflects fewer reported symptoms)." |
| **Prognosis / Timeline** | "You will be fully recovered in 6 days." | "Your logged symptoms show a downward trend over the past 6 days. Recovery timelines vary for every individual." |
| **Activity Clearance** | "You are cleared to resume contact sports / full practice." | "Return-to-activity clearance requires in-person clinical evaluation by your licensed healthcare provider following graduated protocol." |
| **Pattern Insights** | "Screen time caused your migraine flare-up yesterday." | "In your recent logs, higher screen time coincided with higher reported headache severity. Associations do not prove causation." |
| **Medication Queries** | "Take 400mg of ibuprofen every 6 hours for pain." | "CRI does not provide medication advice. Please discuss symptom management and medications with your physician or pharmacist." |
| **Diagnostic Inquiries** | "You have post-concussion syndrome." | "CRI cannot diagnose medical conditions. If symptoms persist beyond typical recovery windows, consult your healthcare provider." |
| **Missing Data** | "Your score was extrapolated as 12 on missing days." | "No check-in recorded for this date. Data gaps are displayed without interpolation." |

---

## 4. Safe Language Standards, Uncertainty & Non-Causality Rules

### 4.1 Symptom Total Definition
- The primary tracked metric is the **Patient-Reported Symptom Total (0–48)**.
- Derived from 8 standard symptom dimensions rated 0 (None) to 6 (Severe):
  1. Headache
  2. Dizziness
  3. Nausea
  4. Light Sensitivity
  5. Noise Sensitivity
  6. Fatigue
  7. Concentration Difficulty
  8. Sleep Difficulty
- **Terminology Rule:** Always describe this metric as *"Patient-Reported Symptom Total"*. Never refer to it as a *"Recovery Score"*, *"Healing Index"*, *"Health Grade"*, or *"Clinical Rating"*.

### 4.2 Non-Causality Guidelines
- Concussion symptom fluctuations have multifactorial causes (dehydration, stress, poor sleep, lighting, exertion).
- Any automated pattern detection must explicitly frame relationships as **temporal associations**:
  - Allowed phrasing: *"coincided with"*, *"occurred on days with"*, *"temporal pattern observed"*, *"associated in logged entries"*.
  - Prohibited phrasing: *"caused by"*, *"triggered"*, *"proves that"*, *"resulted directly from"*.
  - Every pattern visualization or insight card must include the disclaimer: *"Observed patterns reflect temporal associations in patient-reported entries and do not establish medical causation."*

### 4.3 Handling Uncertainty & Incomplete Data
- **No Interpolation:** If a patient misses a check-in, the day must remain blank or marked as `"No data logged"`. Never fabricate or average missing days.
- **Minimum Data Requirement:** Pattern detection algorithms must require a minimum of 3 consecutive or 5 total entries before displaying any trend insight. If below the threshold, display: *"Additional daily entries needed to identify trends."*
- **Explicit Limitations:** All summaries must acknowledge that data is self-reported, subjective, and subject to day-to-day reporting variability.

### 4.4 Mandatory UI Disclaimers
Every major portal layout (`patient`, `caregiver`, `clinician`, `admin`) and exportable report must include a prominent, accessible medical disclaimer:
> **Medical Disclaimer:** CRI is a symptom tracking and recovery organization tool. It does not provide medical advice, diagnosis, treatment, or return-to-activity clearance. If you experience worsening symptoms or danger signs, seek immediate medical attention or call 911.

---

## 5. Governing Clinical Sources & Evidence Base

All symptom domains, danger signs, educational RAG materials, and clinical rules in CRI are grounded in peer-reviewed clinical literature and official public health guidelines:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Governing Clinical Authorities                     │
├────────────────────────────────┬────────────────────────────────────────┤
│ CDC HEADS UP & TBI Guidelines  │ Amsterdam 2022 Consensus Statement     │
│ U.S. CDC (2024/2026 Baseline)  │ 6th Int'l Conference (Patricios et al) │
├────────────────────────────────┼────────────────────────────────────────┤
│ Living Concussion Guidelines   │ PedsConcussion Living Guidelines       │
│ Adult mTBI (livingconcussion)  │ Pediatric & Adolescent (pedsconcussion)│
└────────────────────────────────┴────────────────────────────────────────┘
```

### 5.1 Source Repository & Metadata

| Authority / Guideline | Full Citation / Reference | Version / Date | Scope & Intended Population | CRI Functional Application |
| :--- | :--- | :--- | :--- | :--- |
| **CDC HEADS UP / TBI Signs & Symptoms** | U.S. Centers for Disease Control and Prevention. *Traumatic Brain Injury & Concussion: Signs, Symptoms, and Danger Signs*. [cdc.gov/traumatic-brain-injury](https://www.cdc.gov/traumatic-brain-injury/signs-symptoms/index.html) | Baseline 2024–2026 | Adults & Pediatric (All Ages) | Core 8-symptom inventory; Tier 1 Red Flag Emergency Danger Signs list; emergency escalation copy. |
| **Amsterdam 2022 Consensus Statement on Concussion in Sport** | Patricios JS, Schneider GM, Dvorak J, et al. Consensus statement on concussion in sport: the 6th International Conference on Concussion in Sport held in Amsterdam, October 2022. *Br J Sports Med* 2023;57(11):695–711. | 6th Edition (2022/2023) | Athletes, Adolescents & Adults (13+) | Active recovery principles; symptom-guided physical & cognitive pacing; 12 'R's framework; non-pharmacological pacing. |
| **Living Concussion Guidelines (Adult)** | Clinical Expert Working Group. *Guideline for Concussion/mTBI & Persistent Symptoms: 3rd Edition*. [livingconcussionguidelines.com](https://livingconcussionguidelines.com/) | 3rd Edition (Living, 2024/2026) | Adults (18+ years) | Persistent symptom tracking (>4 weeks); multimodal domain classification; sleep/fatigue management strategies. |
| **PedsConcussion Guidelines** | Zemek R, et al. *Living Guideline for Pediatric Concussion Care*. [pedsconcussion.com](https://pedsconcussion.com/) | Living Guideline (2024/2026) | Children & Adolescents (Ages 5–18) | Return-to-learn frameworks; school accommodation pacing; adolescent cognitive fatigue tracking. |

---

## 6. Requirement → Evidence → Feature → Risk Traceability Matrix

| Req ID | Clinical Requirement | Governing Source | Feature / UI Touchpoint | Clinical Risk / Hazard | Mitigation & Defensive Guardrail in CRI |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-01** | Rapid, low-cognitive-load symptom capture | CDC HEADS UP; Amsterdam 2022 | Patient Check-in (`/patient/check-in`) | Exacerbating symptoms through lengthy screen-based cognitive fatigue | 8 essential symptoms rated on 0–6 Likert scale; large touch targets; high-contrast; completed in <60 seconds. |
| **REQ-02** | Immediate detection of acute neurological emergency | CDC Concussion Danger Signs | Danger Signs Intercept Screen (`/patient/check-in`) | Patient ignores acute intracranial hemorrhage or expanding hematoma | Hardcoded emergency screen intercept with red warning banner, 911 calling shortcut, and immediate session termination. |
| **REQ-03** | Longitudinal recovery trend tracking | Amsterdam 2022; ONF Living Guidelines | Dashboard & Timeline (`/patient/dashboard`, `/patient/recovery`) | Patient mistakes subjective daily symptom total for an objective clinical cure index | Clear labeling: "Patient-Reported Symptom Total (0–48)"; descriptive comparisons over time; permanent disclaimers. |
| **REQ-04** | Exertion & activity correlation tracking | Amsterdam 2022 (Active Recovery) | Check-in Exposures & Insights (`/patient/insights`) | Patient assumes activity caused worsening or inappropriately ceases all activity | Temporal association language ("coincided with"); non-causality disclaimer; minimum 5-day data threshold. |
| **REQ-05** | Clinician caseload risk triage | ONF Living Guidelines; PedsConcussion | Caseload Dashboard (`/clinician/dashboard`) | High-risk or deteriorating patients lost in caseload | Deterministic risk classification (`Stable`, `Review`, `Elevated`) based on trajectory slope and red flags. |
| **REQ-06** | Clinician encounter report generation | Amsterdam 2022; CDC Clinical Guidance | Printable Reports (`/clinician/reports`, `/patient/reports`) | Provider makes treatment decisions on manipulated or undocumented data | Immutable source records; print-optimized layout (`no-print` headers); explicit source timestamps and review metadata. |
| **REQ-07** | Safe educational knowledge retrieval | CDC HEADS UP; Living Concussion Guidelines | Educational RAG / Guidance (`/patient/insights`, `/patient/messages`) | AI hallucination, medical diagnosis, or unapproved treatment prescription | Strict RAG over curated guideline corpus; deterministic prompt guardrails; refusal fallback for diagnosis/prescriptions. |
| **REQ-08** | Role-based data privacy & governance | HIPAA / GDPR Privacy Standards | Auth & RBAC (`middleware.ts`, `convex/`) | Unauthorized caregiver/third-party access to sensitive health records | Explicit permission-gated caregiver delegation; audit logging for all admin and clinical encounters. |

---

## 7. Safety Engine & Risk Escalation Protocol

The CRI Safety Engine operates deterministically across four distinct escalation tiers:

```
                                [Incoming Event / Input]
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │  Tier 1: Red Flag Danger Signs Detected?     │
                    └──────┬────────────────────────────────┬──────┘
                          YES                               NO
                           │                                │
                           ▼                                ▼
            ┌──────────────────────────────┐ ┌──────────────────────────────┐
            │  EMERGENCY INTERCEPT MODAL   │ │ Tier 2: Clinician Risk Triage│
            │  • Stop regular flow         │ │  • Trend slope evaluation    │
            │  • Display 911 / ED guidance │ │  • Stable / Review / Elevated│
            │  • Direct phone link         │ └──────────────┬───────────────┘
            └──────────────────────────────┘                │
                                                            ▼
                                             ┌──────────────────────────────┐
                                             │ Tier 3: AI Query Guardrails  │
                                             │  • Intercept rx/diagnosis/rtp│
                                             │  • Hardcoded referral notice │
                                             └──────────────┬───────────────┘
                                                            │
                                                            ▼
                                             ┌──────────────────────────────┐
                                             │ Tier 4: Evidence-Grounded RAG│
                                             │  • Curated clinical sources  │
                                             │  • Exact citation display    │
                                             └──────────────────────────────┘
```

### 7.1 Tier 1: Emergency Danger Signs (Immediate Intercept)
Any selection of a CDC danger sign immediately pauses the standard user workflow and triggers the Emergency Intercept:
- **Danger Signs Triggered:**
  - One pupil larger than the other
  - Drowsiness or inability to wake up
  - Headache that gets worse and does not go away
  - Slurred speech, weakness, numbness, or decreased coordination
  - Repeated vomiting or nausea
  - Convulsions or seizures
  - Unusual behavior, increased confusion, restlessness, or agitation
  - Loss of consciousness (even briefly)
- **System Action:** Prevents standard check-in completion; renders high-visibility emergency red warning screen; provides direct tap-to-call emergency services (911) button; advises immediate transit to nearest Emergency Department.

### 7.2 Tier 2: Longitudinal Clinician Triage Alerts
- **Elevated Status:** Total symptom score $\ge 30$, or consecutive 3-day increase of $\ge 6$ points, or active Tier 1 danger sign event logged.
- **Review Status:** Symptom total between $15–29$, or plateaued symptoms without improvement for $>14$ days.
- **Stable Status:** Symptom total $<15$ with neutral or downward trajectory over a 7-day rolling window.

### 7.3 Tier 3: Prohibited Query Intercepts (AI Guardrails)
If a user submits a query requesting diagnosis, drug prescriptions, or return-to-activity clearance, the Safety Engine intercepts the query before LLM inference and returns standard protective responses:
- **Refusal Template (Diagnosis):** *"CRI cannot assess whether you have a concussion or provide medical diagnoses. Please consult a licensed medical professional for clinical evaluation."*
- **Refusal Template (Clearance):** *"CRI does not provide return-to-play or return-to-activity clearance. Safe progression requires in-person medical evaluation."*
- **Refusal Template (Prescription):** *"CRI cannot recommend medications or dosages. Please speak with your doctor or pharmacist."*

### 7.4 Tier 4: Evidence-Grounded Educational Retrieval (RAG)
- AI responses must cite approved guideline sources (e.g., `[CDC HEADS UP]`, `[Amsterdam 2022]`).
- If no matching evidence exists in the verified corpus, the system safely falls back: *"I do not have verified clinical guideline evidence on this specific question. Please discuss this with your healthcare provider."*

---

## 8. Evidence Governance, Source Freshness & Content Versioning

To ensure clinical validity and maintainable software governance, CRI follows strict versioning and review procedures:

### 8.1 Specification & Content Versioning
- **Major Version (`X.0.0`):** Changes to clinical red lines, danger sign lists, or governing clinical consensus frameworks (e.g., release of Amsterdam 7th Edition).
- **Minor Version (`1.X.0`):** Additions of new evidence-backed educational topics, new symptom sub-dimensions, or upgraded scoring representations.
- **Patch Version (`1.0.X`):** Copy refinements, typographical corrections, or layout adjustments that do not alter clinical meaning.

### 8.2 Review Cadence & Source Freshness
- **Quarterly Audit:** Formal review of all safety copy, prompt guardrails, and RAG document repositories every 90 days.
- **Triggered Audit:** An immediate off-cycle review is triggered whenever the CDC, Concussion in Sport Group (CISG), or ONF publishes updated clinical recommendations.
- **Audit Logging:** Every modification to safety copy or clinical rules must record:
  - Date of change
  - Reviewing clinician / clinical contributor name
  - Source publication cited
  - Rationale for modification

---

## 9. PR Review & Clinical Safety Checklist

Developers, contributors, and reviewers must verify all PRs touching UI copy, check-in logic, backend algorithms, AI prompts, or clinical reports against this checklist:

- [ ] **No Diagnostic Claims:** No copy or UI element states or implies a medical diagnosis.
- [ ] **No Treatment Prescriptions:** No copy recommends specific pharmaceutical drugs or dosages.
- [ ] **No Prognosis / Time Predictions:** No copy promises a specific recovery date or time horizon.
- [ ] **No Activity Clearance:** No feature grants return-to-sport, return-to-school, or return-to-work clearance.
- [ ] **Accurate Metric Naming:** Symptom metrics are labeled *"Patient-Reported Symptom Total (0–48)"* and never *"Recovery Score"* or *"Index"*.
- [ ] **Non-Causal Pattern Phrasing:** Pattern insights use observational language (*"coincided with"*, *"associated with"*) and include non-causality disclaimers.
- [ ] **Emergency Intercept Preserved:** The CDC danger signs intercept is intact, functional, and prioritizes emergency escalation over routine logging.
- [ ] **Governing Source Citations:** Any new educational copy or clinical logic cites its governing guideline (CDC, Amsterdam 2022, ONF, or PedsConcussion).
- [ ] **Permanent Disclaimers Visible:** Required medical disclaimers are present on all dashboards and printable reports.
- [ ] **Data Integrity & Gaps:** Missing check-in days are displayed as gaps without synthetic interpolation or false averaging.
- [ ] **RBAC & Privacy Compliance:** Role permissions prevent unauthorized data exposure across patient, caregiver, clinician, and admin views.

