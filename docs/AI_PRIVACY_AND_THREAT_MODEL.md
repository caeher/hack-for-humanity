# AI Privacy, Threat Model & Release Governance

**Document ID:** CRI-SPEC-AI-001  
**Version:** 1.0.0  
**Status:** Approved / Active  
**Date:** September 2, 2026  
**Governing Authority:** HIPAA Security & Privacy Rules, GDPR Art. 25 (Privacy by Design), CRI Clinical Scope Specification (CRI-SPEC-CLINICAL-001)

---

## 1. Executive Summary

This specification defines the privacy, security, quality, and release gates required before any AI feature (NLP extraction, educational RAG, pattern insights) processes recovery data. It complements the deterministic Safety Engine (CRI-SPEC-SAFETY-001) and Data Classification policy (CRI-SPEC-DATA-001).

**Core invariant:** No direct identifiers are ever sent to an AI provider. Core patient tracking (check-in, dashboard, timeline, care plans) remains fully functional when AI is disabled via the kill switch.

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CRI AI Processing Pipeline                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Patient / Clinician Request]                                              │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │  Kill Switch    │─── disabled ──▶ Return static fallback (no provider)   │
│  │  Check          │                                                        │
│  └────────┬────────┘                                                        │
│           │ enabled                                                         │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │  Auth + RBAC    │─── unauthorized ──▶ 403 Forbidden                      │
│  │  (Convex)       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │  Safety Engine  │─── blocked ──▶ Deterministic refusal (no LLM call)    │
│  │  evaluateAiQuery│                                                        │
│  └────────┬────────┘                                                        │
│           │ safe                                                            │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐                               │
│  │  De-identify &  │────▶│  Clinical Context │  (no PII, pseudonymous ID)  │
│  │  Minimize       │     │  Payload          │                               │
│  └────────┬────────┘     └──────────────────┘                               │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐                               │
│  │  Input          │────▶│  Provider Call   │  (allowlisted model only)   │
│  │  Guardrails     │     │  + Timeout       │                               │
│  └────────┬────────┘     └────────┬─────────┘                               │
│           │ blocked               │                                         │
│           ▼                       ▼                                         │
│  Refusal response          ┌──────────────────┐                             │
│                            │  Output          │                             │
│                            │  Guardrails      │                             │
│                            └────────┬─────────┘                             │
│                                     │                                       │
│                                     ▼                                       │
│                            ┌──────────────────┐                             │
│                            │  Citation        │                             │
│                            │  Verification    │                             │
│                            └────────┬─────────┘                             │
│                                     │                                       │
│                                     ▼                                       │
│                            [Safe, grounded response to user]                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Audit Trail (Tier 4): requestId, modelId, latency, outcome code   │   │
│  │  NEVER: full prompts, clinical notes, names, emails, API keys       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Identity Separation

| Layer | Contains | Sent to Provider? |
| :--- | :--- | :---: |
| **Identity Record** (Convex `users`, `patients`) | name, email, DOB, phone, tokenIdentifier | ❌ Never |
| **Clinical Context** (de-identified) | symptom totals, trend direction, age band, days since injury | ✅ Yes (minimized) |
| **Pseudonymous Session** | `ctxSessionId` (ephemeral, non-reversible hash) | ✅ Yes (for correlation only) |

---

## 3. Threat Model

### 3.1 Assets

| Asset | Sensitivity | Threat Impact |
| :--- | :--- | :--- |
| Patient PII (Tier 1) | Critical | Identity theft, HIPAA breach |
| PHI / symptom data (Tier 2) | High | Unauthorized disclosure |
| API keys / secrets | Critical | Provider abuse, cost overrun |
| Clinical guideline corpus | Medium | Citation spoofing, misinformation |
| AI model outputs | Medium | Unsafe advice, diagnostic claims |

### 3.2 Threat Actors & Mitigations

| Threat | Vector | Mitigation |
| :--- | :--- | :--- |
| **Prompt injection** | User embeds "ignore instructions" in check-in notes or AI query | Input guardrails scan for injection patterns; system prompt isolation; output validation |
| **Data exfiltration** | Adversarial prompt requests raw patient records | Block exfiltration patterns; never include raw DB records in prompts; de-identify all context |
| **Unsafe advice** | Model generates diagnosis, prescription, or clearance | Safety Engine pre-screen + output guardrails + deterministic refusal templates |
| **Citation spoofing** | Model cites non-existent or unapproved sources | Citation allowlist verification against approved evidence registry |
| **Provider data retention** | Provider trains on patient data | Contractual zero-retention; `store: false` / training opt-out flags enforced |
| **Log leakage** | Full prompts logged to observability | Redacted logging policy; hash-only prompt fingerprints |
| **Model substitution** | Unauthorized model swap bypasses eval | Model allowlist + approval records + CI release gate |
| **Cost overrun** | Unbounded AI calls | Per-org daily cost limits; request rate limiting |
| **Kill switch failure** | AI remains active during incident | Global + per-org kill switch; core tracking independent of AI |

### 3.3 Trust Boundaries

```
[User Browser] ──TLS──▶ [Next.js + Clerk JWT] ──▶ [Convex Backend]
                                                        │
                                    ┌───────────────────┼───────────────────┐
                                    │  TRUSTED ZONE     │   UNTRUSTED ZONE  │
                                    │  (Convex)         │   (AI Provider)   │
                                    │                   │                   │
                                    │  • Full PHI       │  • De-identified  │
                                    │  • Auth/RBAC      │    context only   │
                                    │  • Safety Engine  │  • No PII ever    │
                                    │  • Audit logs     │  • Timeboxed      │
                                    └───────────────────┴───────────────────┘
```

---

## 4. De-identification & Payload Minimization

All payloads sent to AI providers pass through `deidentifyClinicalContext()` which:

1. **Strips** direct identifiers: name, email, phone, address, MRN, patient ID, Clerk subject
2. **Generalizes** demographics: exact DOB → age band (`13-17`, `18-24`, `25-44`, `45-64`, `65+`)
3. **Redacts** free-text notes containing PII patterns (email, phone, SSN, URLs with tokens)
4. **Limits** symptom detail to aggregates: totals, trends, severity bands — not raw per-symptom arrays unless clinically necessary
5. **Assigns** ephemeral `ctxSessionId` (SHA-256 of random nonce, not linkable to patient ID)

See implementation: `lib/ai/deidentify.ts`

---

## 5. Provider Configuration

| Setting | Default | Rationale |
| :--- | :--- | :--- |
| `trainingOptOut` | `true` | Prevent provider training on PHI |
| `dataRetention` | `zero` | No provider-side storage |
| `requestTimeoutMs` | `30000` | Prevent hung requests |
| `maxTokens` | `1024` | Limit response size and cost |
| `temperature` | `0.2` | Reduce hallucination for clinical context |

Approved providers and models are defined in `lib/ai/providerConfig.ts`. Changes require recorded approval in `aiModelApprovals` table and passing evaluation suite.

---

## 6. Input & Output Guardrails

### 6.1 Input Defenses (`lib/ai/guardrails.ts`)

| Defense | Patterns Detected |
| :--- | :--- |
| Prompt injection | "ignore previous instructions", "system prompt", "you are now", role-play jailbreaks |
| Data exfiltration | "dump database", "list all patients", "show me records", "export PHI" |
| Unsafe advice (input) | Delegated to Safety Engine `evaluateAiQuery` |
| PII in user query | Email, phone, SSN patterns → redacted before provider call |

### 6.2 Output Defenses

| Defense | Action |
| :--- | :--- |
| Diagnostic language | Block response; return refusal template |
| Prescription language | Block response; return refusal template |
| Clearance language | Block response; return refusal template |
| Citation spoofing | Verify all `[SOURCE]` tags against approved registry |
| PII leakage in output | Redact and block if unredactable |

---

## 7. Evaluation Datasets & Release Gates

### 7.1 Dataset Slices (`evaluations/datasets/v1/`)

| Slice | Cases | Evaluates |
| :--- | :---: | :--- |
| `adults.json` | 12+ | Safety, groundedness, appropriate refusal for adult recovery queries |
| `pediatric.json` | 8+ | Age-appropriate language, caregiver context, pediatric guidelines |
| `ambiguity.json` | 8+ | Uncertainty handling, non-causal phrasing, incomplete data |
| `adversarial.json` | 12+ | Injection, exfiltration, override attempts, citation spoofing |

### 7.2 Metrics & Critical Thresholds

| Metric | Critical Threshold | Release Impact |
| :--- | :--- | :--- |
| `safety_refusal_rate` | ≥ 95% on adversarial diagnostic/prescription/clearance | **BLOCK** if below |
| `privacy_no_pii_sent` | 100% | **BLOCK** if any PII detected in simulated payloads |
| `groundedness_citation_valid` | ≥ 90% | **BLOCK** if below |
| `injection_blocked_rate` | ≥ 95% | **BLOCK** if below |
| `bias_neutral_language` | ≥ 85% | **WARN** (non-blocking) |

Evaluations run via `pnpm ai:eval` in CI. Release is blocked when any critical threshold regresses.

---

## 8. Kill Switch & Incident Response

### 8.1 Kill Switch Levels

| Level | Scope | Effect |
| :--- | :--- | :--- |
| `global` | Entire platform | All AI features return static fallbacks |
| `org` | Single organization | AI disabled for that org only |
| `feature` | Specific feature (nlp, rag, insights) | Disable one AI surface |

**Core tracking invariant:** Check-in submission, dashboard rendering, timeline, care plans, and reminders continue unaffected.

### 8.2 Incident Response Playbook

1. **Detect:** Anomalous outputs, privacy alert, cost spike, or manual report
2. **Contain:** Activate kill switch at appropriate level via `aiGovernance.setKillSwitch`
3. **Investigate:** Review redacted audit logs (`aiRequestAudit` — no full prompts)
4. **Remediate:** Fix guardrails, re-run evaluation suite
5. **Approve:** Record model/config change in `aiModelApprovals`
6. **Restore:** Disable kill switch after passing evaluations

---

## 9. Model Change Approval Process

1. Propose new provider/model in PR with evaluation results
2. Admin records approval via `aiGovernance.approveModelChange`
3. CI `ai-eval` job must pass on the PR branch
4. Approval record includes: `providerId`, `modelId`, `approvedByUserId`, `evaluationRunId`, `expiresAt`

---

## 10. Logging Policy

### 10.1 Allowed in Logs

- `requestId` (UUID)
- `ctxSessionId` (pseudonymous, ephemeral)
- `modelId`, `providerId`
- `latencyMs`, `tokenCount` (aggregate)
- `outcomeCode` (e.g., `blocked_injection`, `refused_diagnosis`, `success`)
- `promptFingerprint` (SHA-256 hash, not reversible)

### 10.2 Prohibited in Logs

- Full user prompts or AI responses
- Clinical notes or check-in free text
- Patient names, emails, phone numbers
- API keys, JWT tokens, Clerk subjects
- Raw symptom arrays with dates (use aggregates only)

See implementation: `lib/ai/logging.ts`

---

## 11. Verification Checklist

- [x] De-identification strips all Tier 1 identifiers before provider calls
- [x] Kill switch disables AI without affecting core tracking
- [x] Input guardrails block prompt injection and exfiltration attempts
- [x] Output guardrails block diagnostic/prescription/clearance language
- [x] Citation verification against approved evidence registry
- [x] Versioned evaluation datasets for all required slices
- [x] CI release gate blocks on critical threshold regression
- [x] Model changes require recorded approval
- [x] Audit logs contain no secrets or full prompts
- [x] Provider config enforces zero-retention and training opt-out

---

## 12. Related Documents

- [Clinical Scope & Safety Boundaries](CLINICAL_SCOPE_AND_SAFETY.md)
- [Data Classification & Retention](DATA_CLASSIFICATION_AND_RETENTION.md)
- [Safety Engine Specification](SAFETY_ENGINE_SPECIFICATION.md)
