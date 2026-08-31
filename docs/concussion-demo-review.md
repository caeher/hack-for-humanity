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

## Important work that remains

- Connect the check-in and dashboard to authenticated Convex data.
- Replace the legacy post-surgical Convex field names with the longitudinal concussion model described in the project wiki.
- Add backend authorization for every patient record and enforce role-based access.
- Implement and test a versioned safety rules service rather than relying only on the new interface intercept.
- Generate reports from saved source records instead of simulated values.
- Implement transparent pattern detection with missing-data handling and minimum-data rules.
- Update the Notion implementation-status sections after these changes are merged.

## Verification

`next build` completed successfully, including TypeScript checking and static generation for all 22 application routes.
