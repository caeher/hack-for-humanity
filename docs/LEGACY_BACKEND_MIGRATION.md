# Legacy Backend Model Migration to Longitudinal Concussion Recovery (Issue #6)

**Document ID:** CRI-MIGRATION-001  
**Phase:** Phase 0 — Core Architecture & Clinical Governance  
**Status:** Completed & Validated  
**Target Schema:** Convex Longitudinal Concussion Recovery Model  
**Related Pull Request / Issue:** [Issue #6](https://github.com/caeher/hack-for-humanity/issues/6), [PR #39 Baseline](https://github.com/caeher/hack-for-humanity/pull/39)

---

## 1. Executive Summary & Objective

Prior to Phase 0 completion, the frontend was successfully aligned to concussion recovery terminology in [PR #39](https://github.com/caeher/hack-for-humanity/pull/39), but the reactive backend contained legacy post-surgical schema structures (e.g. `procedure`, `surgeon`, `surgeryDate`, `painScore`, `mobilityScore`, `emotionalScore`, `wound_care`).

The objective of **Issue #6** is to:
1. Completely eliminate all remaining post-surgical/orthopedic schema definitions, field names, and category structures in Convex.
2. Establish a type-safe longitudinal concussion recovery data model centered on incident date, injury context, 8-symptom inventory (0–6 Likert scale), non-diagnostic patient-reported symptom total (0–48), and ID-based clinician relationships.
3. Provide automated, tested migration and rollback procedures with zero data loss or orthopedic copy reintroduction.

---

## 2. Field Mapping Dictionary

The following table details the mapping of legacy post-surgical concepts to their longitudinal concussion equivalents:

| Legacy Post-Surgical Concept | Target Concussion Field / Architecture | Clinical & Architectural Justification |
| :--- | :--- | :--- |
| `patients.procedure` (string) | `recoveryEpisodes.injuryContext` (string) & `clinicalEncounters.diagnosis` | Concussion recovery is governed by injury mechanism and context (e.g. sports collision, fall, MVA) rather than surgical procedures. |
| `patients.surgeon` (string) | `patients.primaryClinicianId` (ID `users`) & `clinicianMemberships` | Replaces unauthenticated, brittle provider name strings with type-safe, authenticated relational IDs and RBAC permissions. |
| `patients.surgeryDate` (string) | `recoveryEpisodes.incidentDate` (string) & `recoveryEpisodes.startDate` | Concussion recovery trajectories and return-to-activity timelines are measured from the date of incident / head impact. |
| `checkIns.painScore` (0–10) | `checkIns.symptoms.headache` (0–6 Likert) | Generic pain is replaced by specific Likert ratings, anchored on post-traumatic headache severity. |
| `checkIns.mobilityScore` (0–100) | `checkIns.symptoms.dizziness` (0–6) & `checkIns.activityImpact` (`yes`/`no`/`not-sure`/`none`) | Orthopedic joint mobility is replaced by vestibular balance/dizziness assessment and functional activity impact. |
| `checkIns.sleepScore` (0–100) | `checkIns.symptoms.sleepDifficulty` (0–6) & `activityExposures.sleepHours` | Sleep is tracked as a patient-reported symptom dimension and daily exposure context. |
| `checkIns.emotionalScore` (0–100) | `checkIns.symptoms.fatigue` (0–6) & `checkIns.symptoms.concentration` (0–6) | Replaced by affective and cognitive Likert dimensions (fatigue, concentration difficulty). |
| `checkIns.recoveryScore` (0–100) | `checkIns.symptomTotal` (0–48 sum) | Removed unvalidated composite recovery formulas. Replaced by a transparent, non-diagnostic 0–48 patient-reported symptom total. |
| `carePlans.category: 'wound_care'` | `carePlans.category: 'cognitive_pacing'` / `'education'` / `'accommodations'` | Post-surgical incision care is eliminated in favor of concussion-specific cognitive rest, school/work accommodations, and symptom-guided pacing. |
| `carePlans.category: 'physical_therapy'` | `carePlans.category: 'physical_activity'` | Replaced by sub-symptom threshold light physical activity (e.g. 15-minute walking intervals). |

---

## 3. Schema Architecture Comparison

```
┌──────────────────────────────────────────────────┐        ┌──────────────────────────────────────────────────┐
│             LEGACY POST-SURGICAL                 │        │        LONGITUDINAL CONCUSSION (CRI)             │
├──────────────────────────────────────────────────┤        ├──────────────────────────────────────────────────┤
│ patients:                                        │   ──►  │ patients:                                        │
│   • name: string                                 │        │   • userId: id('users')                          │
│   • procedure: string ("ACL Reconstruction")     │        │   • primaryClinicianId: id('users')              │
│   • surgeon: string ("Dr. Brooks")               │        │   • displayId: string ("P-1042")                 │
│   • surgeryDate: string ("2026-08-19")           │        │   • status: 'Active' | 'Discharged'              │
│                                                  │        │                                                  │
│ checkIns:                                        │        │ recoveryEpisodes:                                │
│   • painScore: number (0-10)                     │        │   • incidentDate: string ("2026-08-19")          │
│   • mobilityScore: number (0-100)                │        │   • injuryContext: string                        │
│   • sleepScore: number (0-100)                   │        │   • riskLevel: 'Stable'|'Review'|'Elevated'      │
│   • emotionalScore: number (0-100)               │        │                                                  │
│   • recoveryScore: number (0-100)                │        │ checkIns:                                        │
│                                                  │        │   • symptoms: 8-item object (0-6 each)           │
│ carePlans:                                       │        │   • symptomTotal: number (0-48 sum)              │
│   • category: 'wound_care' | 'physical_therapy'  │        │   • dangerSigns: array(string)                   │
│                                                  │        │                                                  │
│                                                  │        │ carePlans:                                       │
│                                                  │        │   • category: 'cognitive_pacing' | 'education'   │
│                                                  │        │     | 'accommodations' | 'physical_activity'    │
└──────────────────────────────────────────────────┘        └──────────────────────────────────────────────────┘
```

---

## 4. Migration Engine & Transformers (`convex/migrations.ts`)

The migration engine implements pure, idempotent transformers and verified mutation workflows:

### 4.1 `transformLegacyPatientToConcussion`
- Transforms legacy patient payload into a normalized `patients` record linked to an authenticated `users` document.
- Resolves string surgeon names to active clinician document IDs via indexed lookup.
- Generates corresponding `recoveryEpisodes` document storing `incidentDate` and normalized `injuryContext`.

### 4.2 `transformLegacyCheckInToConcussion`
- Converts legacy 4-domain scores into the 8-symptom Likert 0–6 inventory:
  - `headache = Math.min(6, Math.max(0, Math.round((painScore / 10) * 6)))`
  - `dizziness = Math.min(6, Math.max(0, Math.round(((100 - mobilityScore) / 100) * 6)))`
  - `sleepDifficulty = Math.min(6, Math.max(0, Math.round(((100 - sleepScore) / 100) * 6)))`
  - `fatigue = Math.min(6, Math.max(0, Math.round(((100 - emotionalScore) / 100) * 6)))`
  - `concentration = Math.min(6, Math.max(0, Math.round(((100 - emotionalScore) / 100) * 5)))`
- Computes exact, non-diagnostic `symptomTotal` (0–48) using `validateConcussionSymptoms`.

### 4.3 `transformLegacyCarePlanCategory`
- Re-categorizes legacy tasks:
  - `'wound_care'` ➔ `'cognitive_pacing'`
  - `'physical_therapy'` ➔ `'physical_activity'`
  - `'school_accommodations'` / `'work_accommodations'` ➔ `'accommodations'`
  - Preserves `'education'`, `'medication'`, `'appointment'`, `'check_in'`.

---

## 5. Schema Integrity Validator (`validateSchemaIntegrity`)

A database audit query scans all records and confirms:
1. Zero occurrences of `procedure`, `surgeon`, or `surgeryDate` on `patients`.
2. All `recoveryEpisodes` possess `incidentDate` and lack `surgeryDate`.
3. All `checkIns` have complete 8-symptom Likert objects, exact `symptomTotal` arithmetic sums, and no residual `painScore` or `recoveryScore` fields.
4. All `carePlans` utilize allowed concussion recovery categories.

---

## 6. Rollback Strategy & Runbook

If a data anomaly occurs during execution:
1. **Targeted Batch Rollback:** Run `api.migrations.rollbackMigratedBatch` passing target `patientDisplayIds`. The mutation systematically removes associated check-ins, care plans, recovery episodes, and patient records, recording an audit log entry.
2. **Snapshot Restoration:** If an organization-level rollback is necessary, export snapshots before migration execution and restore via standard Convex export/import CLI tooling.

---

## 7. Verification Results

- **Automated Test Suite:** `convex/tests/migration.test.ts` executes pure transformation tests, full database migration, integrity verification, and rollback execution.
- **Vitest Suite Result:** 34/34 tests passed across all 4 suites.
- **Build Verification:** Next.js 16 build passed with 0 errors across 22 application routes.
