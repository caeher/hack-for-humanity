/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'
import {
  transformLegacyCarePlanCategory,
  transformLegacyCheckInToConcussion,
  transformLegacyPatientToConcussion,
} from '../migrations'

const modules = import.meta.glob('../**/*.ts')

describe('Phase 0 Legacy Backend Migration (Issue #6)', () => {
  describe('Pure Transformation Functions', () => {
    test('transformLegacyPatientToConcussion maps surgeryDate to incidentDate and unlinked surgeon to ID', () => {
      const legacyPatient = {
        displayId: 'P-9999',
        name: 'Jordan Taylor',
        preferredName: 'Jordan',
        dateOfBirth: '1996-05-12',
        procedure: 'Knee Arthroplasty',
        surgeon: 'Dr. Olivia Brooks',
        surgeryDate: '2026-08-15',
        status: 'Active' as const,
        notes: 'Initial post-operative recovery protocol.',
      }

      const mockClinicianId = 'user_clinician_123' as any
      const result = transformLegacyPatientToConcussion(legacyPatient, mockClinicianId)

      expect(result.patientProfile.displayId).toBe('P-9999')
      expect(result.patientProfile.primaryClinicianId).toBe(mockClinicianId)
      expect(result.patientProfile.notes).toContain('[Migrated Record]')

      // Concussion incident date replaces surgeryDate
      expect(result.recoveryEpisode.incidentDate).toBe('2026-08-15')
      expect(result.recoveryEpisode.startDate).toBe('2026-08-15')
      expect(result.recoveryEpisode.injuryContext).toContain('Concussion recovery protocol')
      expect(result.recoveryEpisode.riskLevel).toBe('Stable')
    })

    test('transformLegacyCheckInToConcussion derives 8-symptom inventory and 0-48 non-diagnostic total', () => {
      const legacyCheckIn = {
        patientDisplayId: 'P-9999',
        date: '2026-08-20',
        painScore: 5, // 0-10 scale
        mobilityScore: 80, // 0-100 scale (good mobility -> lower dizziness)
        sleepScore: 70, // 0-100 scale (good sleep -> lower sleepDifficulty)
        emotionalScore: 85, // 0-100 scale (lower fatigue/concentration difficulty)
        recoveryScore: 78, // Legacy unvalidated score
        notes: 'Mild discomfort during morning routine.',
      }

      const transformed = transformLegacyCheckInToConcussion(legacyCheckIn)

      expect(transformed.date).toBe('2026-08-20')
      expect(transformed.symptoms).toBeDefined()

      // All 8 individual symptom ratings must be integer 0-6
      const symptoms = transformed.symptoms
      expect(symptoms.headache).toBeGreaterThanOrEqual(0)
      expect(symptoms.headache).toBeLessThanOrEqual(6)
      expect(symptoms.dizziness).toBeGreaterThanOrEqual(0)
      expect(symptoms.dizziness).toBeLessThanOrEqual(6)
      expect(symptoms.nausea).toBeGreaterThanOrEqual(0)
      expect(symptoms.nausea).toBeLessThanOrEqual(6)
      expect(symptoms.lightSensitivity).toBeGreaterThanOrEqual(0)
      expect(symptoms.lightSensitivity).toBeLessThanOrEqual(6)
      expect(symptoms.noiseSensitivity).toBeGreaterThanOrEqual(0)
      expect(symptoms.noiseSensitivity).toBeLessThanOrEqual(6)
      expect(symptoms.fatigue).toBeGreaterThanOrEqual(0)
      expect(symptoms.fatigue).toBeLessThanOrEqual(6)
      expect(symptoms.concentration).toBeGreaterThanOrEqual(0)
      expect(symptoms.concentration).toBeLessThanOrEqual(6)
      expect(symptoms.sleepDifficulty).toBeGreaterThanOrEqual(0)
      expect(symptoms.sleepDifficulty).toBeLessThanOrEqual(6)

      // Total must equal exact sum of the 8 individual symptoms
      const expectedSum =
        symptoms.headache +
        symptoms.dizziness +
        symptoms.nausea +
        symptoms.lightSensitivity +
        symptoms.noiseSensitivity +
        symptoms.fatigue +
        symptoms.concentration +
        symptoms.sleepDifficulty

      expect(transformed.symptomTotal).toBe(expectedSum)
      expect(transformed.symptomTotal).toBeLessThanOrEqual(48)
      expect(transformed.symptomTotal).toBeGreaterThanOrEqual(0)
    })

    test('transformLegacyCarePlanCategory converts wound_care and orthopedic terms to concussion pacing', () => {
      const woundCare = transformLegacyCarePlanCategory('wound_care')
      expect(woundCare.category).toBe('cognitive_pacing')
      if (woundCare.titleTransform) {
        expect(woundCare.titleTransform('Incision dressing change')).toBe(
          'cognitive pacing rest break change'
        )
      }

      const pt = transformLegacyCarePlanCategory('physical_therapy')
      expect(pt.category).toBe('physical_activity')
      if (pt.titleTransform) {
        expect(pt.titleTransform('Knee flexion exercises')).toBe(
          'Knee light symptom-free walking exercises'
        )
      }

      expect(transformLegacyCarePlanCategory('education').category).toBe('education')
      expect(transformLegacyCarePlanCategory('school_accommodations').category).toBe('accommodations')
      expect(transformLegacyCarePlanCategory('medication').category).toBe('medication')
      expect(transformLegacyCarePlanCategory('appointment').category).toBe('appointment')
    })
  })

  describe('Convex Database Migration & Rollback Suite', () => {
    test('executes end-to-end migration of legacy dataset into live schema and validates integrity', async () => {
      const t = convexTest(schema, modules)
      await t.mutation(api.seed.seedDatabase, {})

      const adminIdentity = {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
        subject: 'admin_1',
        name: 'System Admin',
        email: 'admin@example.com',
      }

      const legacyDataset = {
        organizationSlug: 'oak-valley-health',
        patients: [
          {
            displayId: 'P-2001',
            name: 'Marcus Vance Jr.',
            preferredName: 'Marcus',
            dateOfBirth: '1999-07-21',
            procedure: 'Total Knee Arthroplasty (Legacy Entry)',
            surgeon: 'Dr. Olivia Brooks',
            surgeryDate: '2026-08-10',
            status: 'Active' as const,
            notes: 'Legacy orthopedic notes to be preserved.',
          },
        ],
        checkIns: [
          {
            patientDisplayId: 'P-2001',
            date: '2026-08-11',
            painScore: 6,
            mobilityScore: 40,
            sleepScore: 50,
            emotionalScore: 60,
            recoveryScore: 55,
            notes: 'Day 1 post-incident recovery.',
          },
          {
            patientDisplayId: 'P-2001',
            date: '2026-08-12',
            painScore: 4,
            mobilityScore: 60,
            sleepScore: 65,
            emotionalScore: 70,
            recoveryScore: 68,
            notes: 'Day 2 feeling gradual improvement.',
          },
        ],
        carePlans: [
          {
            patientDisplayId: 'P-2001',
            title: 'Wound dressing inspection and rest interval',
            category: 'wound_care',
            targetTime: '09:00 AM',
            completed: true,
            dayNumber: 1,
          },
          {
            patientDisplayId: 'P-2001',
            title: 'Classroom 30-minute cognitive break accommodation',
            category: 'school_accommodations',
            targetTime: '01:30 PM',
            completed: false,
            dayNumber: 1,
          },
        ],
      }

      // 1. Run Migration
      const result = await t
        .withIdentity(adminIdentity)
        .mutation(api.migrations.migrateLegacyDataset, legacyDataset)

      expect(result.success).toBe(true)
      expect(result.migratedPatients).toBe(1)
      expect(result.migratedEpisodes).toBe(1)
      expect(result.migratedCheckIns).toBe(2)
      expect(result.migratedCarePlans).toBe(2)

      // 2. Validate Migrated Patient Document
      const migratedPatient = await t
        .withIdentity(adminIdentity)
        .query(api.patients.getByDisplayId, { displayId: 'P-2001' })
      expect(migratedPatient).not.toBeNull()
      expect(migratedPatient?.displayId).toBe('P-2001')
      expect(migratedPatient?.primaryClinicianId).toBeDefined()

      // 3. Validate Migrated Check-Ins
      const checkIns = await t
        .withIdentity(adminIdentity)
        .query(api.checkIns.listByPatient, { patientId: migratedPatient!._id })
      const checkInList = Array.isArray(checkIns) ? checkIns : checkIns.page
      expect(checkInList.length).toBe(2)

      for (const ci of checkInList) {
        expect(ci.symptoms).toBeDefined()
        expect(ci.symptomTotal).toBeGreaterThanOrEqual(0)
        expect(ci.symptomTotal).toBeLessThanOrEqual(48)
        expect(ci.dangerSigns).toBeDefined()
        expect((ci as any).painScore).toBeUndefined()
        expect((ci as any).mobilityScore).toBeUndefined()
        expect((ci as any).recoveryScore).toBeUndefined()
      }

      // 4. Validate Migrated Care Plans
      const plans = await t
        .withIdentity(adminIdentity)
        .query(api.carePlans.listByPatient, { patientId: migratedPatient!._id })
      expect(plans.length).toBe(2)
      const categories = plans.map(p => p.category)
      expect(categories).toContain('cognitive_pacing')
      expect(categories).toContain('accommodations')
      expect(categories).not.toContain('wound_care')

      // 5. Run Database Schema Integrity Audit
      const audit = await t
        .withIdentity(adminIdentity)
        .query(api.migrations.validateSchemaIntegrity, {})
      expect(audit.isCompliant).toBe(true)
      expect(audit.violations.length).toBe(0)
      expect(audit.totalPatients).toBeGreaterThan(0)
      expect(audit.totalEpisodes).toBeGreaterThan(0)
      expect(audit.totalCheckIns).toBeGreaterThan(0)

      // 6. Test Rollback Procedure
      const rollbackResult = await t
        .withIdentity(adminIdentity)
        .mutation(api.migrations.rollbackMigratedBatch, {
          patientDisplayIds: ['P-2001'],
        })
      expect(rollbackResult.success).toBe(true)
      expect(rollbackResult.removedCount).toBeGreaterThanOrEqual(5)

      // Verify P-2001 no longer exists
      const afterRollback = await t
        .withIdentity(adminIdentity)
        .query(api.patients.getByDisplayId, { displayId: 'P-2001' })
      expect(afterRollback).toBeNull()
    })
  })
})
