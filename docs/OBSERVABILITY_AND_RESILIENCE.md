# Observability, Resilience & Performance Budget Specification

**Document ID:** CRI-SPEC-OBS-001  
**Version:** 1.0.0 (Phase 4 Baseline)  
**Status:** Approved / Active Baseline  
**Scope:** Observability, Structured Logging, Correlation IDs, Performance Budgets, and Graceful Degradation across the CRI platform.

---

## 1. Observability Architecture & Privacy Principles

CRI (Care Recovery Intelligence) implements **privacy-safe observability**. In accordance with healthcare data protection principles (HIPAA, GDPR, SOC 2), operators must be able to diagnose failures, monitor system health, and evaluate performance without accessing sensitive personal or clinical payloads.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Privacy-Safe Observability Layer                     │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│  Correlation IDs  │  Health Signals   │  Telemetry & Performance        │
│  & Sanitized Logs │  Probe Endpoint   │  Budget Tracking                │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ • Middleware ID   │ • Next.js Runtime │ • Latency & Error Rate          │
│ • PII Redaction   │ • Convex Database │ • Check-in Completion Funnel    │
│ • Clinical Strip  │ • Clerk Auth      │ • RAG Retrieval Quality         │
│ • Error Boundaries│ • AI Providers    │ • Safety Engine Executions      │
│   (error/global)  │ • Notifications   │ • Mobile / Desktop Budgets      │
└─────────┬─────────┴─────────┬─────────┴────────────────┬────────────────┘
          │                   │                          │
          ▼                   ▼                          ▼
┌───────────────────┬───────────────────┬─────────────────────────────────┐
│ Graceful Fallback │ 4-Minute Demo     │ Deterministic Seeding           │
│ • AI Disabled     │ • Scripted Demo   │ • Synthetic Fixtures            │
│ • Offline Drafts  │ • Timed Rehearsal │ • Idempotent Database Reset     │
│ • Notification OK │   (0:00 - 4:00)   │ • pnpm convex:seed              │
└───────────────────┴───────────────────┴─────────────────────────────────┘
```

### Core Privacy Guarantees
1. **Zero PII in Diagnostic Logs:** User names, email addresses, phone numbers, auth tokens, Clerk IDs, JWTs, and API keys are strictly redacted with deterministic replacements (`[REDACTED_EMAIL]`, `[REDACTED_TOKEN]`, etc.).
2. **Zero Clinical Payloads in Telemetry:** Individual symptom ratings (0–6), free-text clinical notes, emergency danger-sign selections, and medical diagnoses are stripped prior to recording telemetry or emitting log lines.
3. **Deterministic Correlation:** Every HTTP request and client action carries a timestamped correlation ID (`cri_corr_<timestamp>_<random>`) linking client events, server API handlers, and backend mutations.

---

## 2. Health Signals & Probe Endpoint (`/api/health`)

CRI provides a unified health check endpoint at `/api/health` that monitors all critical infrastructure subsystems:

| Subsystem | Signal Checked | Healthy Condition | Degraded Condition |
| :--- | :--- | :--- | :--- |
| **Next.js** | Process uptime, Node version, heap memory, environment | Process alive, heap $< 1\text{GB}$ | Memory pressure |
| **Convex DB** | Database connectivity & read latency | DB responsive, latency $< 500\text{ms}$ | Connection timeout or high latency |
| **Clerk Auth** | Publishable key & secret key presence | Keys configured, valid prefix (`pk_`, `sk_`) | Missing credentials |
| **In-App Notifications** | Reactive notification subsystem | Reactive table indexed & reachable | Delivery degradation |
| **AI Providers** | Governance state, kill switch, cost headroom | AI active, budget remaining | Kill switch active or budget exceeded |

### Health Probe Response Example
```json
{
  "status": "healthy",
  "timestamp": 1788410000000,
  "uptimeSeconds": 1420,
  "version": "0.1.0",
  "correlationId": "cri_corr_1788410000000_a1b2c3d4",
  "durationMs": 14,
  "services": {
    "nextjs": {
      "status": "healthy",
      "details": { "uptimeSeconds": 1420, "nodeVersion": "v20.9.0", "heapUsedMb": 85 }
    },
    "convex": {
      "status": "healthy",
      "latencyMs": 12,
      "details": { "configured": true, "connected": true }
    },
    "clerk": {
      "status": "healthy",
      "details": { "publishableKeyPresent": true, "secretKeyPresent": true, "keyType": "test" }
    },
    "notifications": {
      "status": "healthy",
      "details": { "mode": "reactive_convex", "delivery": "in_app_active" }
    },
    "ai": {
      "status": "healthy",
      "details": { "killSwitchActive": false, "costCapEnforced": true, "ragGroundedCorpus": "v1_cdc_amsterdam" }
    }
  }
}
```

---

## 3. Structured Error Reporting & Correlation IDs

### 3.1 Correlation ID Lifecycle
1. **Generation:** Created in Next.js middleware or client telemetry via `generateCorrelationId()` (`cri_corr_<timestamp>_<random>`).
2. **Propagation:** Forwarded in `x-correlation-id` and `x-request-id` HTTP response and request headers.
3. **Client Presentation:** Rendered inside accessible Error Boundaries (`app/error.tsx` and `app/global-error.tsx`) as `Incident ID: cri_corr_...` so patients can quote an incident reference to support staff without sharing medical symptoms.

### 3.2 Error Categorization
Errors are mapped to standardized categories:
- `AUTH_FAILURE` (401/403): Token expiration, signature mismatch, unauthorized access.
- `RATE_LIMITED` (429): Third-party or internal rate limits.
- `DATABASE_UNAVAILABLE` (503): Database connection refusal or network timeout.
- `NETWORK_ERROR`: Browser offline or DNS failure.
- `AI_PROVIDER_ERROR`: LLM timeout, guardrail refusal, or cost cap block.
- `VALIDATION_ERROR` (400): Schema or validator mismatch.
- `CLIENT_RUNTIME_ERROR`: React render or hydration exceptions.

---

## 4. Telemetry & Metrics Tracking (`systemTelemetry`)

The `systemTelemetry` table stores de-identified operational metrics without tying data to specific user accounts:

| Telemetry Event | Tracked Metrics | Purpose |
| :--- | :--- | :--- |
| **`latency`** | Operation name, duration in ms, success/failure | Track p50/p95 response times for check-ins, queries, and reports |
| **`error`** | Error category, code, sanitized context | Measure system error rate and identify component regressions |
| **`checkin_funnel`** | `checkin_start`, `checkin_complete`, duration, status | Monitor check-in completion rate and drop-off points |
| **`retrieval_quality`** | Chunks matched, citation count, fallback trigger count | Track RAG assistant grounding quality and evidence retrieval |
| **`safety_rule_execution`**| Rule severity tier (`safe`, `review`, `elevated`, `emergency`), intercept count | Verify deterministic execution of CDC danger-sign rules |

Aggregated operational metrics can be queried via `api.observability.getTelemetryMetrics`.

---

## 5. Performance Budgets (Mobile & Desktop)

Concussion recovery interfaces demand strict latency caps. Cognitive fatigue, visual vertigo, and photophobia can be aggravated by layout shifts or unresponsive UI elements.

| Metric | Mobile Budget (<768px / 320px) | Desktop Budget (>1024px) | Rationale |
| :--- | :---: | :---: | :--- |
| **Initial Page Load (LCP)** | $\le 2500\text{ms}$ | $\le 1800\text{ms}$ | Fast display of calming recovery workspace |
| **Interaction to Next Paint (INP)**| $\le 200\text{ms}$ | $\le 100\text{ms}$ | Immediate feedback on button clicks and inputs |
| **Cumulative Layout Shift (CLS)** | $\le 0.10$ | $\le 0.05$ | Zero sudden jumping of content |
| **Check-in Step Transition** | $\le 100\text{ms}$ | $\le 80\text{ms}$ | Smooth progression across 8 symptom screens |
| **Check-in Submission Latency** | $\le 500\text{ms}$ | $\le 350\text{ms}$ | Rapid mutation round-trip |
| **Danger Sign Intercept** | $\le 50\text{ms}$ | $\le 30\text{ms}$ | Instantaneous client block when red flag selected |
| **Critical Route Bundle (gzip)** | $\le 250\text{KB}$ | $\le 300\text{KB}$ | Minimal payload on mobile networks |

Automated budget verification is executed via:
```bash
pnpm perf:budgets
```

---

## 6. Graceful Degradation & Resilience Matrix

CRI is engineered to continue essential recovery tracking even when secondary or third-party services fail:

| Subsystem Failure | System Behavior | User Impact | Core Tracking Status |
| :--- | :--- | :--- | :--- |
| **AI Providers Disabled / Down** | Global kill switch or feature flag activates. Education assistant returns citation-grounded offline fallback. Recovery insights use deterministic baseline summaries. | RAG assistant redirects to care team; insights show descriptive trends without LLM analysis. | **100% Operational:** Daily 8-symptom check-in, 0–48 score gauge, timeline, and reports work normally. |
| **External Email / Push Fails** | External notification delivery skips gracefully; error logged with correlation ID. In-app notification table preserves event. | User receives in-app notifications upon login. | **100% Operational:** In-app notification center and unread badges function reactively. |
| **Clerk Auth Unavailable / Offline** | Application uses session-backed E2E demo mode (`isE2ETestMode`). | Demo exploration continues using simulated fixture accounts. | **Operational:** Local evaluation workflows proceed uninterrupted. |
| **Transient Network Disconnect** | Form state persists in client localStorage (`checkInDraft`, `onboardingDrafts`). | In-progress check-ins are not lost upon reload. | **Preserved:** Patient resumes exactly where they paused. |

---

## 7. Deterministic Seeding & Database Reset

CRI provides idempotent seeding for local development, CI tests, and demo rehearsals:
```bash
# Seed or reset development database
pnpm convex:seed
```

### Deterministic Personas
- **Ava Mercer (`patient_ava`):** Adult concussion recovery (P-1042), 8-symptom check-in trajectory, active care plan.
- **Leo Miller (`patient_leo`):** Pediatric recovery (P-1055), Return-to-Learn pathway, parent proxy consent.
- **Marcus Mercer (`caregiver_marcus`):** Active caregiver with consent-gated access to symptom trends.
- **Dr. Olivia Brooks (`clinician_brooks`):** Attending sports neurologist, caseload triage view (`Stable`, `Review`, `Elevated`).
- **Organization Administrator (`admin_1`):** Oak Valley Health Sports Medicine Clinic admin with audit logs and cohort analytics.
