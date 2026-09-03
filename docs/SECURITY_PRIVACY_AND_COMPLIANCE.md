# CRI Security, Privacy, Retention, and Threat Model Specification

**Version:** 1.0.0  
**Status:** Approved  
**Related Issue:** #35  
**Governance Scope:** HIPAA Security & Privacy Rules, GDPR / CCPA, SOC2 Type II Trust Principles, 45 CFR § 164.312  

---

## 1. Executive Summary & Objectives

The Concussion Recovery Intelligence (CRI) platform manages sensitive Protected Health Information (PHI) across patients, clinical teams, authorized caregivers, and healthcare organizations. This document establishes technical controls, architectural guarantees, threat models, and operational runbooks for:

1. **Data Inventory & Classification:** Rigorous classification of identity, clinical, operational, and AI inference data.
2. **Append-Only Forensic Audit Logging:** Immutable audit records capturing actor, action, resource, result, and timestamp while strictly excluding sensitive health payloads.
3. **Statutory Retention & Legal Hold Engine:** Automated, idempotent pruning adhering to adult and pediatric statutory rules, with immediate hold freezes.
4. **Consent-Aware Data Export & Erasure:** Full JSON recovery archive export (GDPR Art. 20, HIPAA) and verified right-to-be-forgotten anonymization.
5. **Threat Model & Mitigation Matrix:** Comprehensive analysis of cross-tenant access, IDOR, prompt leakage, and credential compromise.
6. **Encryption, Secrets & Incident Response:** Defense-in-depth cryptographic controls and rapid breach response procedures.

---

## 2. Data Inventory & Classification

All data stored or processed within CRI is classified into one of four sensitivity tiers:

| Data Category | Classification | Examples | Storage Location | Retention Baseline | Access Controls |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Clinical PHI & Concussion Data** | **Restricted / PHI** | Daily symptom check-ins, PCSS scores, episode notes, encounter diagnoses, activity exposures, danger signs | Convex `checkIns`, `recoveryEpisodes`, `clinicalEncounters`, `alerts`, `exposureEntries` | **Adults:** 7 years from episode closure.<br>**Pediatrics (<18):** Until age 25. | Strictly scoped to patient, clinician on caseload, or authorized caregiver with active consent grant. |
| **Tier 2: Identity & Demographic Data** | **Confidential / PII** | Full name, email address, phone number, date of birth, display ID, time zone | Convex `users`, `patients` | Maintained during active recovery; anonymized upon verified deletion request. | Self (patient/clinician), Org Admin, or delegated proxy. |
| **Tier 3: Operational & Audit Ledger** | **Internal / Forensic** | Audit logs, legal holds, privacy request records, retention run telemetry, consent grants | Convex `auditLogs`, `legalHolds`, `privacyRequests`, `retentionRuns`, `consentGrants` | **Minimum:** 1 year.<br>**Standard:** 7 years. | Append-only. Visible to Organization Administrators and Compliance Officers. |
| **Tier 4: AI & Inference Artifacts** | **Confidential / Ephemeral** | Prompt fingerprints, structured recovery extraction summaries, educational queries | Convex `recoveryTrends`, `educationCorpus` | Persisted trends retain no raw prompt inputs or third-party chat payloads. | Scoped to patient recovery episode. |

---

## 3. Append-Only Forensic Audit Logging

### 3.1 Architectural Principles
- **Immutability:** Application users have no mutation or deletion capabilities on the `auditLogs` table. Only system-level append operations are permitted.
- **Payload Sanitization:** Audit log entries record metadata (`actorUserId`, `actorRole`, `action`, `targetResource`, `resourceId`, `result`, `createdAt`) and high-level summaries (`event`). **Free-text clinical notes, clinician private thoughts, and patient message contents are strictly excluded from audit logs.**
- **Comprehensive Mutation Coverage:** Every privileged or clinical mutation (check-in amendments, encounter creation, clinical alert generation, care plan toggling, activity logging, consent modifications, legal hold actions) emits a structured audit event.

### 3.2 Result Classification
Each audit event records a deterministic result:
- `success`: The operation passed all authorization, validation, and database constraints.
- `failure`: The operation failed due to business logic or schema validation errors.
- `denied`: The operation was blocked by RBAC, missing tenant membership, or an active legal hold.

---

## 4. Statutory Retention & Legal/Clinical Hold Engine

### 4.1 Statutory Retention Rules
- **Adult Clinical Records:** Retained for a minimum of 7 years (2,555 days) following the date of record creation or episode closure, satisfying federal and state medical board requirements.
- **Pediatric Records:** For patients injured while minors (age band `13-17`), records are retained until the patient reaches age 25 (age of majority 18 + 7 statutory years), ensuring full legal protection.
- **Ephemeral Operational Records:** Read in-app notifications older than 90 days and processed Clerk webhook sync logs older than 30 days are automatically pruned to minimize data sprawl.

### 4.2 Legal and Clinical Holds
- **Application:** Clinicians and Organization Administrators can apply an active legal or clinical hold on an individual patient or organization-wide (`convex/retention.ts`).
- **Hold Types:**
  - `legal`: Formal subpoena, litigation, or regulatory inquiry.
  - `clinical`: Adverse event investigation or clinical safety review.
  - `regulatory`: Accreditation audit or statutory review.
- **Freeze Enforcement:** The automated retention engine (`isPatientUnderLegalHold`) checks for active holds prior to purging any record. If a hold exists, the record is skipped, preserved, and reported under `recordsRetainedDueToHold`.
- **Deletion Override:** Deletion requests (`requestDeletion`) for patients under an active hold are immediately rejected and logged with `result: 'denied'`.

---

## 5. Consent-Aware Data Portability & Erasure

### 5.1 Recovery Data Export (`CRI-GDPR-HIPAA-EXPORT-V1`)
Patients and authorized administrators can generate a machine-readable JSON archive containing:
- Demographic profile and accessibility configurations
- Recovery episode history and baseline scores
- All daily check-ins, symptom severities, and danger signs
- Activity exposures and physical/cognitive entries
- Clinical encounters and care plans
- Consent grants and active relationships
- Forensic access logs

The archive strictly strips internal cryptographic tokens, third-party authentication secrets, and other users' records.

### 5.2 Right to be Forgotten & Deletion Workflow
1. **Request:** Patient initiates deletion via `convex/privacy.ts:requestDeletion`.
2. **Hold Verification:** The system verifies the absence of active legal or clinical holds.
3. **Identity Challenge:** An explicit challenge code (`CONFIRM-DELETE-<displayId>`) is issued to prevent accidental erasure.
4. **Execution:** Upon submission of the challenge code via `confirmDeletion`:
   - Patient demographic identifiers (`preferredName`, `dateOfBirth`, `notes`) are stripped.
   - `displayId` is irreversibly replaced with `DELETED-<ID>`.
   - Associated user record status is changed to `Suspended` with name set to `Anonymized Patient`.
   - All third-party caregiver `consentGrants` are immediately revoked.
   - A final compliance audit event is recorded.

---

## 6. Threat Model & Mitigation Matrix

| Threat ID | Threat Category | Description | Attack Vector | Technical Mitigations in CRI | Residual Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TM-01** | **Cross-Tenant Access** | Attendant of Org A accesses patients or caseload belonging to Org B. | Tampering with `orgId` parameter in API calls. | All queries and mutations validate user session org against resource `orgId` via `requireRole` and `requirePatientAccess`. Convex database queries enforce indexed `.eq('orgId', user.orgId)`. | Low |
| **TM-02** | **Insecure Direct Object Reference (IDOR)** | Authenticated user manipulates `patientId` or `episodeId` to view another patient's check-ins. | Crafting query payloads with foreign Convex IDs. | Strict identity resolution: `requirePatientAccess` verifies direct ownership for patients, active `consentGrants` for caregivers, and organizational caseload alignment for clinicians. | Low |
| **TM-03** | **Prompt & PII Leakage in AI Pipelines** | Sensitive PHI or system prompts leak into public logs or model responses. | Prompt injection or unchecked error logging of LLM context. | `recoveryExtraction.ts` uses zero-retention parameters, validates extraction strictly against schemas, and computes deterministic prompt fingerprints instead of logging raw query strings. | Low |
| **TM-04** | **Compromised Account / Token Theft** | Stolen Clerk session JWT used to exfiltrate caseload data. | Replay attacks or token exfiltration from client. | Short-lived Clerk JWTs, strict Content Security Policy (`CSP`), `X-Frame-Options: DENY`, and rate-monitored audit alerts on unexpected location or IP changes. | Low |
| **TM-05** | **Malicious Attachment Upload** | Attacker uploads malware disguised as clinical encounter PDF or neurocognitive report. | Direct upload to file storage endpoints. | Storage tokens verified via Convex file storage; MIME-type sniffing validation; orphaned attachments automatically purged by hourly cron. | Low |

---

## 7. Encryption, Secrets Management & Disaster Recovery

### 7.1 Encryption Standards
- **Data in Transit:** Enforced TLS 1.3 with HSTS (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).
- **Data at Rest:** All Convex storage and database volumes are encrypted using FIPS 140-2 validated AES-256 encryption.
- **Client Security Headers:** Strict CSP, `X-Content-Type-Options: nosniff`, `X-Permitted-Cross-Domain-Policies: none`, `Referrer-Policy: strict-origin-when-cross-origin`.

### 7.2 Secrets & Key Management
- Production secrets (`CLERK_SECRET_KEY`, Convex deployment URLs) are managed via deployment environment variables. No secrets or test keys are committed to source control.
- Clerk webhooks verify HMAC-SHA256 signatures via Svix before processing payloads.

### 7.3 Incident Response & Breach Notification Runbook
1. **Identification:** Anomalous audit logs, denied authorization spikes, or Clerk security alerts trigger immediate notification.
2. **Containment:** Administrator initiates immediate account suspension (`convex/users.ts`) or org-wide credential rotation.
3. **Forensic Analysis:** Compliance officers inspect the append-only `auditLogs` table filtered by actor, target resource, and timestamps.
4. **Notification Protocol:** In the event of confirmed PHI exfiltration, affected patients and regulatory authorities are notified in accordance with HIPAA Breach Notification Rule requirements (< 72 hours).
