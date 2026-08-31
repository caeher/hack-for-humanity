# Concussion demo review

Reviewed on August 31, 2026.

## What we changed

- Replaced the visible orthopedic recovery story with a fictional adult concussion recovery story across the patient, caregiver, clinician, administrator, messaging, timeline, insight, and report views.
- Reworked the patient check-in to track eight relevant symptoms from 0 to 6: headache, dizziness, nausea, light sensitivity, noise sensitivity, fatigue, concentration difficulty, and sleep difficulty.
- Added a final danger-sign screen. If a user selects a listed danger sign, routine completion is interrupted and emergency guidance takes priority.
- Removed the undocumented backend formula that combined pain, mobility, sleep, and emotion into a 0 to 100 recovery score.
- Reframed the dashboard value as a simple patient-reported symptom total. The interface states that it is not a diagnosis, prognosis, or return-to-activity decision.
- Marked wearable sync as planned and disabled. The prototype does not claim to be collecting Apple Health, Google Fit, or other device data.
- Updated pattern language so it describes temporal associations in simulated data and does not claim causation.

## Evidence used for the safety copy

The symptom categories and danger-sign wording were checked against the CDC's current concussion guidance:

- [CDC concussion symptoms and danger signs](https://www.cdc.gov/traumatic-brain-injury/signs-symptoms/index.html)
- [CDC managing return to activities](https://www.cdc.gov/heads-up/hcp/clinical-guidance/index.html)
- [Amsterdam concussion consensus statement](https://bjsm.bmj.com/content/57/11/695)

The check-in remains a prototype tracking tool. It is not presented as a validated clinical assessment.

## Biosignal decision

We did not add a hardware dependency because the team is working remotely and does not have a shared test device. A future software adapter could accept sleep duration, resting heart rate, HRV, steps, and active minutes from HealthKit or Health Connect.

Those measurements should be displayed as supporting context only. They should not diagnose concussion, determine recovery, trigger reassurance, or clear someone to return to activity. A safe hackathon demo can use clearly labeled synthetic wearable data before any real device integration is attempted.

## Current baseline (August 31, 2026)

- [PR #39](https://github.com/caeher/hack-for-humanity/pull/39) is merged on `main`.
- The visible demo is concussion-aligned across all four portals. Data remains simulated and session-only in several flows.
- The dashboard uses a descriptive **patient-reported symptom total (0–48)**, not a validated Recovery Score.
- Danger-sign handling exists in the check-in UI. A versioned backend Safety Engine is still required.
- Legacy Convex field names (`painScore`, `mobilityScore`, `procedure`, `surgeon`, and similar) remain and must be migrated.
- Product vision and safety boundaries live in [`docs/base.md`](./base.md).

## GitHub backlog (38 issues, aligned to CRI)

Implementation work is tracked in the repository issue backlog. Issues were aligned after PR #39 so they describe the **current** concussion demo baseline rather than the former orthopedic prototype.

| Phase | Focus | Issues |
| --- | --- | --- |
| Phase 0 | Clinical governance, environment, schema, auth, legacy backend migration, seed | [#1](https://github.com/caeher/hack-for-humanity/issues/1)–[#7](https://github.com/caeher/hack-for-humanity/issues/7), [#15](https://github.com/caeher/hack-for-humanity/issues/15), [#36](https://github.com/caeher/hack-for-humanity/issues/36) |
| Phase 1 | Onboarding, check-in persistence, dashboard, timeline, exposures, care plans | [#8](https://github.com/caeher/hack-for-humanity/issues/8)–[#14](https://github.com/caeher/hack-for-humanity/issues/14), [#16](https://github.com/caeher/hack-for-humanity/issues/16) |
| Phase 2 | Safety Engine, symptom-summary methodology, patterns, RAG, AI guardrails | [#17](https://github.com/caeher/hack-for-humanity/issues/17)–[#24](https://github.com/caeher/hack-for-humanity/issues/24) |
| Phase 3 | Caregiver, clinician, messaging, reports, admin, notifications, attachments | [#25](https://github.com/caeher/hack-for-humanity/issues/25)–[#30](https://github.com/caeher/hack-for-humanity/issues/30), [#37](https://github.com/caeher/hack-for-humanity/issues/37), [#38](https://github.com/caeher/hack-for-humanity/issues/38) |
| Phase 4 | Privacy, cohort analytics, accessibility, CI, observability | [#31](https://github.com/caeher/hack-for-humanity/issues/31)–[#35](https://github.com/caeher/hack-for-humanity/issues/35) |

**Critical path after PR #39:** persist the check-in ([#10](https://github.com/caeher/hack-for-humanity/issues/10)), migrate legacy backend fields ([#6](https://github.com/caeher/hack-for-humanity/issues/6)), enforce RBAC ([#5](https://github.com/caeher/hack-for-humanity/issues/5)), implement the Safety Engine ([#19](https://github.com/caeher/hack-for-humanity/issues/19)), then connect live dashboards and reports ([#11](https://github.com/caeher/hack-for-humanity/issues/11), [#28](https://github.com/caeher/hack-for-humanity/issues/28)).

Full list: [github.com/caeher/hack-for-humanity/issues](https://github.com/caeher/hack-for-humanity/issues)

## Important work that remains

- Connect the check-in and dashboard to authenticated Convex data ([#10](https://github.com/caeher/hack-for-humanity/issues/10), [#11](https://github.com/caeher/hack-for-humanity/issues/11)).
- Replace legacy post-surgical Convex field names with the longitudinal concussion model ([#6](https://github.com/caeher/hack-for-humanity/issues/6), [#4](https://github.com/caeher/hack-for-humanity/issues/4)).
- Add backend authorization for every patient record and enforce role-based access ([#3](https://github.com/caeher/hack-for-humanity/issues/3), [#5](https://github.com/caeher/hack-for-humanity/issues/5)).
- Implement and test a versioned safety rules service rather than relying only on the interface intercept ([#19](https://github.com/caeher/hack-for-humanity/issues/19), [#17](https://github.com/caeher/hack-for-humanity/issues/17)).
- Generate reports from saved source records instead of simulated values ([#28](https://github.com/caeher/hack-for-humanity/issues/28)).
- Implement transparent pattern detection with missing-data handling and minimum-data rules ([#21](https://github.com/caeher/hack-for-humanity/issues/21)).

## Verification

`next build` completed successfully, including TypeScript checking and static generation for all 22 application routes.
