# CRI 4-Minute Demo Script & Rehearsal Runbook

**Target Presentation Duration:** 4 minutes (240 seconds)  
**Target Audience:** Hackathon Judges, Clinical Advisors, and Technical Evaluators  
**Primary Goal:** Demonstrate how CRI transforms subjective concussion recovery into a coordinated, evidence-grounded, privacy-safe, and resilient experience across patients, caregivers, and clinicians.

---

## 🎬 Demo Preparation & Deterministic Reset

Before presenting, ensure your dev environment is clean and seeded:

```bash
# 1. Start Convex dev and Next.js dev server
pnpm dev:all

# 2. In a separate terminal, deterministically reset the database
pnpm convex:seed
```

### Pre-loaded Personas
- **Patient:** Ava Mercer (Adult Active Recovery, ID: `P-1042`)
- **Caregiver:** Marcus Mercer (Ava's partner, permission-gated caregiver access)
- **Clinician:** Dr. Olivia Brooks (Attending Concussion Neurologist)
- **Admin:** Oak Valley Health System Administrator

---

## ⏱️ Minute-by-Minute Run-of-Show

```
0:00 ──────────────── 1:00 ──────────────── 2:00 ──────────────── 3:00 ──────────────── 4:00
 │ Problem & Context   │ Check-In & Safety   │ Timeline & Offline  │ Clinician Triage    │
 │ Onboarding Flow     │ Danger-Sign Intercept│ Non-Causal Insights │ Printable Report    │
```

---

### Minute 1 (0:00 – 1:00): The Problem & Cognitive-Calm Onboarding

**Presenter Script:**
> *"Every year, millions suffer concussions. But recovery is an invisible battle: patients struggle with recall bias, symptom spikes, and cognitive overload from glaring screens. CRI—Care Recovery Intelligence—is a coordinated workspace connecting patients, caregivers, and clinicians."*

**Visual Actions:**
1. Open [`http://localhost:3000`](http://localhost:3000). Show the landing workspace selector.
2. Point out the warm, cognitive-calm color palette (`#f8f7f5`) designed to prevent photophobia and ocular strain.
3. Click **"Patient Recovery Workspace"** (or navigate to `/patient/dashboard`).
4. Briefly highlight the **Accessibility & Calibration Controls** in the header:
   - High contrast mode
   - Reduced motion toggle (prevents visual vertigo)
   - Font scale adjustments

---

### Minute 2 (1:00 – 2:00): The 60-Second Check-In & Immediate Safety Intercept

**Presenter Script:**
> *"Concussion recovery check-ins must not trigger cognitive fatigue. CRI breaks the 8 clinical symptoms into a step-by-step wizard completed in under 60 seconds. But most importantly: CRI enforces strict clinical safety boundaries."*

**Visual Actions:**
1. Click **"Log daily check-in"** (`/patient/check-in`).
2. Demonstrate the step-by-step progression across the 8 symptoms (Headache, Dizziness, Nausea, Light Sensitivity, Noise Sensitivity, Fatigue, Concentration, Sleep) using Likert 0–6 ratings.
3. Advance to the final **Danger Signs** screen:
   - Check an acute red flag (e.g., *"Repeated vomiting"* or *"Severe worsening headache"*).
   - Show the **immediate client-side safety intercept**: normal completion is halted instantly (<50ms performance budget), and prominent emergency guidance with direct **Call 911** access takes priority.
4. Explain the clinical boundary:
   > *"CRI never overrides emergency red flags. It never diagnoses or offers false reassurance. Danger signs escalate immediately."*

---

### Minute 3 (2:00 – 3:00): Longitudinal Timeline, Non-Causal Insights & Offline Resilience

**Presenter Script:**
> *"When daily check-ins are logged safely, CRI builds an objective longitudinal recovery trajectory—not a black-box medical score, but an authentic 0-to-48 symptom total."*

**Visual Actions:**
1. Navigate to **Recovery Timeline** (`/patient/recovery`):
   - Show Ava Mercer's multi-week recovery curve.
   - Point out authentic missing-day gaps: *"CRI never fabricates or interpolates missing symptom data."*
2. Navigate to **Recovery Insights** (`/patient/insights`):
   - Highlight pattern detection cards (e.g., screen exposure correlated with next-morning headache spikes).
   - Point out the evidence-governed non-causal disclaimer: *"Describes temporal associations in simulated data; does not claim medical causation."*
3. Demonstrate **Graceful Degradation / Resilience**:
   - Mention that if AI providers are disabled or offline via the governance kill switch, core tracking, check-ins, and recovery timelines remain 100% operational.

---

### Minute 4 (3:00 – 4:00): Clinician Caseload Triage, Encounter & Recovery Report

**Presenter Script:**
> *"Now let's step into the shoes of Dr. Brooks, Ava's attending neurologist. During a 15-minute appointment, clinicians don't have time to decipher scattered patient notes. CRI organizes caseload triage into clear recovery trajectories."*

**Visual Actions:**
1. Navigate to the **Clinician Dashboard** (`/clinician/dashboard`):
   - Show the patient caseload table with risk classification badges: `Stable` (green icon), `Review` (amber triangle), and `Elevated` (alert circle).
   - Highlight that triage status pairs geometric icons with text for color independence (WCAG 1.4.1).
2. Click on **Ava Mercer (P-1042)** to open the clinical inspection view (`/clinician/patients/P-1042`):
   - Show the symptom-vs-exertion timeline.
   - Click **"Document Encounter"** to show structured note capture.
3. Click **"Generate Recovery Report"** (`/clinician/reports` or `/patient/reports`):
   - Show the printable, explainable Recovery Summary with cited clinical guidelines (CDC Heads UP, Amsterdam Consensus).
   - Point out the `.no-print` clean sheet styling ready for appointment export or PDF filing.

**Closing Line:**
> *"CRI empowers patients with accessible pacing, protects them with immediate safety intercepts, and arms clinicians with structured longitudinal data. That is Care Recovery Intelligence. Thank you!"*

---

## 📋 Rehearsal Checklist

- [ ] Dev server running (`pnpm dev:all`) with `.env.local` configured.
- [ ] Database seeded fresh via `pnpm convex:seed`.
- [ ] Browser zoom set to 100% at $1920 \times 1080$ or $1440 \times 900$.
- [ ] 4-minute timer running on secondary monitor or phone.
- [ ] Backup tabs pre-opened:
  - Tab 1: `/patient/dashboard`
  - Tab 2: `/patient/recovery`
  - Tab 3: `/clinician/dashboard`
  - Tab 4: `/patient/reports`
- [ ] Emergency danger sign flow rehearsed.
- [ ] Non-diagnostic disclaimer and evidence citations noted during presentation.
