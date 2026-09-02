# Data Classification, Privacy Tiers & Retention Governance Specification

**Document ID:** CRI-SPEC-DATA-001  
**Version:** 1.0.0 (Longitudinal Schema Baseline)  
**Status:** Approved / Active  
**Date:** September 1, 2026  
**Governing Authority:** HIPAA Security & Privacy Rules (45 CFR Parts 160 & 164), GDPR (Regulation (EU) 2016/679), CDC Concussion Guidelines  

---

## 1. Executive Summary & Objective

This specification establishes the data classification, access authorization, time-to-live (TTL), consent lifecycle, and retention policies for **Concussion Recovery Intelligence (CRI)**. 

### Core Privacy & Architectural Principles
1. **Zero Spoofable Identification:** Data access is **never** authorized through email addresses, patient names, or unverified string identifiers. All entity relationships and permission gates use strongly-typed, non-forgeable Convex document IDs (`v.id()`).
2. **Separation of Concerns:** Direct identity (PII), clinical episodes, patient-reported observations, and security audit trails reside in distinct database tables.
3. **Explicit Delegated Consent:** Third parties (family caregivers, athletic trainers) access health data strictly through time-bound, revocable `consentGrants` with granular permission scopes.
4. **Immutable Audit Trails:** Every access, read of sensitive health records, role change, and consent grant/revocation produces an append-only audit record in `auditLogs`.

---

## 2. Data Classification Matrix & Sensitivity Tiers

Every stored field and collection in the CRI Convex database is categorized into one of four sensitivity tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CRI DATA SENSITIVITY TIERS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 1: DIRECT PII (Identity, Contact, Demographics)                      │
│          • Encryption: AES-256 at rest, TLS 1.3 in transit                  │
│          • Access: Self & Organization Admin only                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 2: PROTECTED HEALTH INFORMATION (PHI) & OBSERVATIONS                  │
│          • 8-Symptom Inventory, Danger Signs, Trajectories, Encounters      │
│          • Access: Patient, Primary Clinician, Scoped Caregiver Grants      │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 3: SECURE CARE-TEAM COMMUNICATIONS                                    │
│          • Asynchronous care team threads & messaging                      │
│          • Access: Thread participants & Assigned Clinical Team             │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER 4: COMPLIANCE & SECURITY AUDIT TRAILS                                 │
│          • Immutable write-only audit logs & forensic event metadata        │
│          • Access: Organization Administrators only                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Detailed Field Inventory by Table

| Table | Sensitive Fields | Tier | Classification | Retention Schedule | Access Control Rule |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **`users`** | `name`, `email`, `phone`, `tokenIdentifier` | **Tier 1** | Direct PII | Account lifetime + 30 days after deletion request | Self & Organization Administrator |
| **`organizations`** | `name`, `primaryContactEmail`, `settings` | **Tier 3** | Operational Metadata | Organization contract duration + 7 years | Organization Staff & Admins |
| **`clinicianMemberships`** | `userId`, `orgId`, `specialty`, `clinicalRole` | **Tier 3** | Professional Credentials | Membership duration + 7 years | Organization Staff & Admins |
| **`patients`** | `userId`, `dateOfBirth`, `preferredName`, `notes` | **Tier 1/2** | Clinical Demographic & Identity | 7 years post-discharge (Adult) / Age of majority + 7 yrs (Pediatric) | Patient Self, Assigned Clinicians, Org Admin |
| **`recoveryEpisodes`** | `incidentDate`, `injuryContext`, `riskLevel`, `baselineSymptomTotal` | **Tier 2** | Protected Health Information (PHI) | 7 years post-discharge | Patient Self, Assigned Clinicians, Org Admin |
| **`consentGrants`** | `granteeUserId`, `scopes`, `relationship`, `expiresAt`, `revokedAt` | **Tier 2** | Delegated Authorization Record | Episode lifetime + 7 years (Audit trail) | Patient Self, Grantee Caregiver, Org Admin |
| **`checkIns`** | `symptoms` (8 dimensions 0–6), `dangerSigns`, `activityImpact`, `note` | **Tier 2** | Protected Health Information (PHI) | 7 years post-discharge | Patient Self, Assigned Clinicians, Scoped Caregiver (`view_symptoms`, `log_proxy`) |
| **`activityExposures`** | `cognitiveMinutes`, `screenMinutes`, `physicalExertionScore`, `sleepHours` | **Tier 2** | Patient-Reported Lifestyle & Context | 7 years post-discharge | Patient Self, Assigned Clinicians, Scoped Caregiver (`view_trends`) |
| **`recoveryTrends`** | `symptomTotal`, `headacheRating`, `sleepQuality` | **Tier 2** | Aggregated Recovery Metrics | 7 years post-discharge | Patient Self, Assigned Clinicians, Scoped Caregiver (`view_trends`) |
| **`clinicalEncounters`** | `diagnosis`, `datetime`, `clinicalSummary`, `notes`, `attachmentStorageId` | **Tier 2** | Formal Medical Records | 7 years post-discharge / Legal statutory minimum | Patient Self, Assigned Clinicians, Org Admin |
| **`carePlans`** | `title`, `category`, `targetTime`, `completed`, `completedAt` | **Tier 2** | Clinical Pacing & Care Tasks | Episode lifetime + 7 years | Patient Self, Assigned Clinicians, Scoped Caregiver (`view_plan`, `log_proxy`) |
| **`alerts`** | `detail`, `severity`, `status`, `dangerSigns` | **Tier 2** | Safety Triage Queue | 7 years post-discharge | Assigned Clinicians, Org Admin, Scoped Caregiver (`receive_alerts`) |
| **`messages`** | `content`, `senderUserId`, `recipientUserId` | **Tier 3** | Care Team Communications | Episode lifetime + 7 years | Thread participants & Organization Clinicians |
| **`auditLogs`** | `actorUserId`, `event`, `targetResource`, `action`, `ipAddress`, `userAgent` | **Tier 4** | Security & Compliance Audit Trail | Minimum 365 days; default 7 years for clinical access audits | Organization Administrators & Compliance Officers only |

---

## 3. Scoped, Expiring & Revocable Consent Governance

To protect patient autonomy and family privacy, caregiver access to recovery data is strictly governed through the `consentGrants` table:

```
                  [Patient Grants Access]
                             │
                             ▼
                 ┌───────────────────────┐
                 │    Status: ACTIVE     │
                 │  • Scopes assigned    │
                 │  • TTL / Expiry set   │
                 └───────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                 │
     (Patient Revokes)                  (Clock Exceeds TTL)
            │                                 │
            ▼                                 ▼
┌───────────────────────┐         ┌───────────────────────┐
│    Status: REVOKED    │         │    Status: EXPIRED    │
│  • Instant cut-off    │         │  • Automatic cut-off  │
│  • Audit log created  │         │  • Grace period: 0s   │
└───────────────────────┘         └───────────────────────┘
```

### 3.1 Permission Scope Definitions

| Permission Scope | Allowed Capabilities | Prohibited Capabilities |
| :--- | :--- | :--- |
| **`view_symptoms`** | Read daily 8-symptom ratings, symptom totals (0–48), and daily check-in notes. | Modifying check-in ratings; submitting logs on behalf of patient without `log_proxy`. |
| **`view_trends`** | View longitudinal recovery trend charts, milestone progressions, and exertion graphs. | Viewing clinical encounter notes or diagnostic documentation. |
| **`view_plan`** | Inspect active daily care plans, pacing reminders, and upcoming appointments. | Editing care plan schedules or prescribing tasks. |
| **`log_proxy`** | Complete daily check-ins or toggle care plan completion for a minor or fatigued loved one. | Granting secondary permissions to third parties. |
| **`receive_alerts`** | Receive immediate notifications if Tier 1 emergency danger signs or clinical triage spikes occur. | Resolving or dismissing clinical triage alerts. |

### 3.2 Revocation & Expiration Invariants
- **Instant Cut-off:** When a patient calls `consent.revokeConsent`, the record status is immediately marked `revoked`. All subsequent queries from that caregiver fail authorization with a `Forbidden` error.
- **Expiration Gating:** The `requirePatientAccess` authorization guard checks `grant.expiresAt < Date.now()` on every sensitive read/write. Expired grants are blocked without requiring background batch cleanup.
- **Audit Logging:** Every grant, update, and revocation writes a record to `auditLogs` with `action: 'consent_grant'` or `action: 'consent_revoke'`.

---

## 4. Retention Periods, Archival & Right-to-be-Forgotten

### 4.1 Statutory Retention Schedule
- **Adult Concussion Records (Ages 18+):** 7 years following the date of episode closure or discharge.
- **Pediatric & Adolescent Records (Ages <18):** 7 years following the patient's 18th birthday (minimum until age 25).
- **Security Audit Logs:** Minimum 365 days; retained for 7 years for forensic HIPAA accounting of disclosures.

### 4.2 Account Deletion & Right to be Forgotten (GDPR Art. 17)
1. **Direct PII Purge:** User credentials, email, phone, and OAuth subject links in `users` are purged within 30 days of verified deletion request.
2. **De-identification of Longitudinal Trajectories:** Clinical observations (`checkIns`, `recoveryTrends`) retained for scientific research and guideline quality improvement are irreversibly stripped of all Tier 1 direct identifiers and decoupled from user accounts.
3. **Audit Immutability:** Audit log event entries are retained for compliance but decoupled from personal email addresses.

---

## 5. Security & Verification Checklist

- [x] **No Unauthenticated Reads:** Every query and mutation validates caller identity via `requireUser` or `requireIdentity`.
- [x] **No Spoofable Query Arguments:** Authorization derives user identity exclusively from server-side verified JWT (`ctx.auth.getUserIdentity()`).
- [x] **Foreign Key Relational Integrity:** All database links use strongly-typed `v.id()` types (`Id<'patients'>`, `Id<'users'>`, `Id<'organizations'>`).
- [x] **Composite Indexing:** High-volume queries are backed by composite indexes matching query filter order.
- [x] **Consent Enforcement:** Caregiver access requires active, unexpired, scope-matching `consentGrants` documents.
- [x] **HIPAA Audit Trail:** Sensitive reads, encounters, user invitations, and consent actions write immutable records to `auditLogs`.
