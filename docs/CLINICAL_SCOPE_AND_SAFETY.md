# Clinical Scope & Safety Specification

## A. Personas & Journeys

- **Patient**: Fast (under 60s), visual form to log symptoms without stress
- **Caregiver**: Multi-day trend views to monitor recovery
- **Clinician**: Printable timeline report for appointments
- **Administrator**: Verify citations, safety rules, system integrity

## B. Allowed vs. Prohibited Claims

**Allowed:**
- Symptom logging (0–6 scales)
- Multi-day trend graphs
- Plain-text observational summaries
- Cited educational answers from official guidelines

**Prohibited (STRICT Red Lines):**
- NO Diagnosis (e.g., "You have post-concussion syndrome")
- NO Prescriptions (e.g., "Take 400mg Ibuprofen")
- NO Recovery Predictions (e.g., "You will recover in 5 days")
- NO Return-to-Play Clearance (e.g., "You are safe to play football")

## C. Safe Language Standards & Disclaimers

- All scores = "Patient-Reported Symptom Ratings" (never "Clinical Index")
- All insights = "associations do not prove causality"
- All screens = permanent medical disclaimer

## D. Risk Intercept Matrix (Safety Engine Rules)

- **Urgent Red Flags** (seizures, severe headache, slurred speech) → call 911 immediately
- **High-Risk Queries** (asking for clearance/prescriptions) → hardcoded disclaimer
- **Education Queries** → must cite sources ([CDC HEADS UP]) or fail safely

## E. Evidence Governance & Source Traceability

- Every response cites official guidelines (CDC, Amsterdam 2022, Living Concussion Guidelines)
- Document version: Phase 0
- Review date: August 31, 2026
- Intended population: 13+
