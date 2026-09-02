import { describe, expect, it, test } from 'vitest'
import { convexTest } from 'convex-test'
import { api } from '../_generated/api'
import schema from '../schema'
import {
  buildAdherenceSummary,
  canPatientUpdateCompletion,
  completionStatusToCompleted,
  validateMedicationInstruction,
} from '../lib/carePlanLogic'
import type { Doc } from '../_generated/dataModel'

const modules = import.meta.glob('../**/*.ts')

const patientIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
  subject: 'patient_maya',
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
}

const clinicianIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
  subject: 'clinician_brooks',
  name: 'Dr. Olivia Brooks',
  email: 'dr.brooks@example.com',
}

function makeTask(
  overrides: Partial<Doc<'carePlans'>> = {}
): Doc<'carePlans'> {
  return {
    _id: 'cp1' as Doc<'carePlans'>['_id'],
    _creationTime: 0,
    patientId: 'p1' as Doc<'carePlans'>['patientId'],
    title: 'Test task',
    category: 'check_in',
    completionStatus: 'pending',
    completed: false,
    allowPatientCompletion: true,
    isClinicianAuthored: true,
    createdAt: 0,
    ...overrides,
  }
}

describe('carePlanLogic', () => {
  it('maps completion status to completed boolean', () => {
    expect(completionStatusToCompleted('completed')).toBe(true)
    expect(completionStatusToCompleted('skipped')).toBe(false)
    expect(completionStatusToCompleted('unable_to_complete')).toBe(false)
    expect(completionStatusToCompleted('pending')).toBe(false)
  })

  it('requires clinician-recorded instruction for medication items', () => {
    expect(() => validateMedicationInstruction('medication', undefined)).toThrow(
      /does not generate prescriptions/
    )
    expect(() => validateMedicationInstruction('medication', 'Take as directed by Dr. Brooks')).not.toThrow()
  })

  it('builds neutral adherence summary without punitive language', () => {
    const summary = buildAdherenceSummary([
      makeTask({ completionStatus: 'completed', completed: true }),
      makeTask({ _id: 'cp2' as Doc<'carePlans'>['_id'], completionStatus: 'skipped' }),
      makeTask({ _id: 'cp3' as Doc<'carePlans'>['_id'], completionStatus: 'unable_to_complete' }),
      makeTask({ _id: 'cp4' as Doc<'carePlans'>['_id'], completionStatus: 'pending' }),
    ])

    expect(summary.completedCount).toBe(1)
    expect(summary.skippedCount).toBe(1)
    expect(summary.unableCount).toBe(1)
    expect(summary.pendingCount).toBe(1)
    expect(summary.neutralSummary).toContain('not emergencies')
    expect(summary.neutralSummary).not.toMatch(/fail|penalt|score/i)
  })

  it('respects allowPatientCompletion flag', () => {
    expect(canPatientUpdateCompletion(makeTask({ allowPatientCompletion: true }))).toBe(true)
    expect(canPatientUpdateCompletion(makeTask({ allowPatientCompletion: false }))).toBe(false)
  })
})

describe('carePlans API authorization', () => {
  test('only clinicians can create clinical plan items', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeTruthy()

    await expect(
      t.withIdentity(patientIdentity).mutation(api.carePlans.createItem, {
        patientId: patient!._id,
        title: 'Unauthorized item',
        category: 'education',
      })
    ).rejects.toThrow(/Forbidden|Requires/)

    const itemId = await t.withIdentity(clinicianIdentity).mutation(api.carePlans.createItem, {
      patientId: patient!._id,
      title: 'Review return-to-learn handout',
      category: 'education',
      description: 'Clinician-provided education only.',
    })
    expect(itemId).toBeDefined()
  })

  test('patients can update completion status but not clinician-only items', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    const appointmentId = await t.withIdentity(clinicianIdentity).mutation(api.carePlans.createItem, {
      patientId: patient!._id,
      title: 'Follow-up visit',
      category: 'appointment',
      allowPatientCompletion: false,
    })

    await expect(
      t.withIdentity(patientIdentity).mutation(api.carePlans.updateCompletionStatus, {
        taskId: appointmentId,
        completionStatus: 'completed',
      })
    ).rejects.toThrow(/cannot be updated/)

    const plans = await t.withIdentity(patientIdentity).query(api.carePlans.listByPatient, {
      patientId: patient!._id,
    })
    const completable = plans.find(p => p.allowPatientCompletion && p.completionStatus === 'pending')
    expect(completable).toBeTruthy()

    await t.withIdentity(patientIdentity).mutation(api.carePlans.updateCompletionStatus, {
      taskId: completable!._id,
      completionStatus: 'skipped',
    })

    const events = await t.withIdentity(patientIdentity).query(api.carePlans.listEvents, {
      patientId: patient!._id,
      limit: 5,
    })
    expect(events.some(event => event.eventType === 'skipped')).toBe(true)
  })

  test('medication items require clinician-recorded instructions', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patientList = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const maya = Array.isArray(patientList) ? patientList.find(p => p.displayId === 'P-1042') : null
    expect(maya).toBeTruthy()

    await expect(
      t.withIdentity(clinicianIdentity).mutation(api.carePlans.createItem, {
        patientId: maya!._id,
        title: 'Medication reminder',
        category: 'medication',
      })
    ).rejects.toThrow(/prescriptions/)

    const medId = await t.withIdentity(clinicianIdentity).mutation(api.carePlans.createItem, {
      patientId: maya!._id,
      title: 'Acetaminophen as directed',
      category: 'medication',
      medicationInstruction: 'Take as previously directed by Dr. Brooks. Do not exceed labeled dose.',
    })
    expect(medId).toBeDefined()
  })
})
