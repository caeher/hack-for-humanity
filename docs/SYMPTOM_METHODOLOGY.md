# Symptom Total & Trend Methodology

**Document ID:** CRI-SPEC-SYMPTOM-METH-001  
**Methodology Version:** 1.0.0  
**Status:** Implemented — pending independent clinical reviewer sign-off  
**Governing Spec:** [CLINICAL_SCOPE_AND_SAFETY.md](./CLINICAL_SCOPE_AND_SAFETY.md) (CRI-SPEC-CLINICAL-001)

---

## 1. Purpose

This document defines the transparent, versioned methodology CRI uses for:

1. **Patient-Reported Symptom Total (0–48)** — a descriptive sum of eight self-reported symptom ratings.
2. **Within-person descriptive trends** — non-prognostic comparisons over time for the same individual.

This methodology deliberately avoids recreating the removed 0–100 “Recovery Score,” hidden weighting, population ranking, normative cutoffs, or “percent recovered” language.

---

## 2. Clinical review gate

| Item | Status |
| --- | --- |
| Methodology implemented in code (`lib/symptomMethodology.ts`, `convex/lib/symptomMethodology.ts`) | Done |
| User-facing copy aligned with CRI-SPEC-CLINICAL-001 | Done |
| Version stamped on new check-ins, baselines, and trend points | Done |
| Unit, edge-case, and interpretation tests | Done |
| **Independent clinical reviewer approval** | **Pending** — required before treating outputs as clinically validated |

---

## 3. Symptom inventory (primary source data)

All eight dimensions are stored individually on each complete check-in. The total is derived from these ratings; individual ratings remain the authoritative source.

| # | Dimension ID | Label | Scale |
| --- | --- | --- | --- |
| 1 | `headache` | Headache | 0–6 |
| 2 | `dizziness` | Dizziness | 0–6 |
| 3 | `nausea` | Nausea | 0–6 |
| 4 | `lightSensitivity` | Light sensitivity | 0–6 |
| 5 | `noiseSensitivity` | Noise sensitivity | 0–6 |
| 6 | `fatigue` | Fatigue | 0–6 |
| 7 | `concentration` | Concentration difficulty | 0–6 |
| 8 | `sleepDifficulty` | Sleep difficulty | 0–6 |

**Scale anchors:** 0 = none, 6 = severe (patient-reported during the past 24 hours).

---

## 4. Symptom total calculation

### 4.1 Formula

```
Patient-Reported Symptom Total = Σ (rating for each answered dimension)
Maximum when complete = 8 × 6 = 48
```

### 4.2 Missing-item handling

| Context | Rule |
| --- | --- |
| In-progress check-in (draft UI) | Only answered dimensions are summed. Missing dimensions are **excluded**, never treated as zero. |
| Persisted check-in / baseline | **All eight dimensions required.** Submission is rejected if any rating is missing or invalid. |
| Days without check-in | Displayed as gaps. **No interpolation, averaging, or imputation.** |

### 4.3 Terminology

- **Use:** “Patient-Reported Symptom Total,” “symptom total (0–48)”
- **Never use:** “Recovery Score,” “Healing Index,” “Health Grade,” “percent recovered”

---

## 5. Within-person trend methodology

Trends compare **the same patient’s** complete check-ins over time. They describe logged patterns only.

### 5.1 Minimum history (insufficient-data gate)

A trend summary is **not shown** until either:

- **≥ 5** complete check-ins exist, **or**
- **≥ 3 consecutive calendar days** each have at least one complete check-in.

Below this threshold, the UI shows: *“Additional daily entries needed to identify trends.”*

### 5.2 Comparison window

- **Default window:** 7 calendar days (inclusive), ending on the most recent check-in date.
- **Within window:** Compare the **earliest** complete check-in to the **latest** complete check-in.
- **Minimum in window:** 2 complete check-ins required.

### 5.3 Direction labels (descriptive only)

Let `delta = latestTotal − earliestTotal` in the comparison window:

| Condition | Label | Example copy |
| --- | --- | --- |
| `|delta| ≤ 2` | `stable` | “…remained relatively stable…” |
| `delta ≤ −3` | `decreasing` | “…decreased by N points…” (lower = fewer reported symptoms in sum) |
| `delta ≥ +3` | `increasing` | “…increased by N points…” |
| otherwise | `mixed` | Change noted but below directional threshold |

### 5.4 Mandatory disclaimers

All trend summaries include:

> Observed changes reflect patient-reported entries over time and do not establish medical causation, predict recovery, or clear return to activity.

---

## 6. Versioning & reproducibility

- Active methodology version: **`1.0.0`** (`SYMPTOM_METHODOLOGY_VERSION`).
- New `checkIns`, `recoveryBaselines`, and `recoveryTrends` records store `methodologyVersion` at write time.
- Historical records without a version field are interpreted as pre-1.0.0 legacy data.
- Copy and rule changes require a semver bump and updated tests.

---

## 7. Implementation map

| Layer | Location |
| --- | --- |
| Client/shared logic | `lib/symptomMethodology.ts` |
| Convex backend logic | `convex/lib/symptomMethodology.ts` |
| Trend query API | `convex/symptomSummaries.ts` |
| Inspection UI | `components/dashboard/symptom-methodology-panel.tsx` |
| Tests | `lib/symptomMethodology.test.ts`, `convex/tests/symptomMethodology.test.ts` |

---

## 8. Population limitations

- Self-reported, subjective daily ratings subject to recall and reporting variability.
- Not validated for diagnosis, prognosis, treatment decisions, or return-to-activity clearance.
- Not intended for cross-patient ranking or population norm comparison.
- Adolescent and adult concussion/mTBI tracking context per CRI-SPEC-CLINICAL-001.
