/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const clinicianIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
  subject: 'clinician_brooks',
  name: 'Dr. Olivia Brooks',
  email: 'dr.brooks@example.com',
}

const patientIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
  subject: 'patient_maya',
  name: 'Maya Chen',
  email: 'maya.chen@example.com',
}

describe('encounter lifecycle', () => {
  test('saveDraft autosaves and finalizeEncounter locks the record', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]
    expect(target).toBeDefined()

    const draftId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
      patientId: target!._id,
      encounterType: 'telehealth',
      diagnosis: 'Concussion follow-up',
      datetime: '2026-09-04T14:00:00.000Z',
      clinicalSummary: 'Draft summary for review.',
      notes: 'Draft notes in progress.',
    })

    const draft = await t.withIdentity(clinicianIdentity).query(api.encounters.getById, {
      encounterId: draftId,
    })
    expect(draft?.encounter.status).toBe('draft')

    await t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
      patientId: target!._id,
      encounterId: draftId,
      encounterType: 'telehealth',
      diagnosis: 'Concussion follow-up',
      datetime: '2026-09-04T14:00:00.000Z',
      clinicalSummary: 'Updated draft summary for review.',
      notes: 'Updated draft notes in progress.',
    })

    await t.withIdentity(clinicianIdentity).mutation(api.encounters.finalizeEncounter, {
      encounterId: draftId,
      confirmFinalization: true,
    })

    const finalized = await t.withIdentity(clinicianIdentity).query(api.encounters.getById, {
      encounterId: draftId,
    })
    expect(finalized?.encounter.status).toBe('finalized')
    expect(finalized?.encounter.finalizedAt).toBeDefined()

    await expect(
      t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
        patientId: target!._id,
        encounterId: draftId,
        encounterType: 'telehealth',
        diagnosis: 'Concussion follow-up',
        datetime: '2026-09-04T14:00:00.000Z',
        clinicalSummary: 'Silent edit attempt.',
        notes: 'Should be blocked.',
      })
    ).rejects.toThrow(/cannot be edited/i)
  })

  test('amendEncounter writes audited amendment for finalized records', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]

    const encounterId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.createEncounter, {
      patientId: target!._id,
      encounterType: 'in-person',
      diagnosis: 'Concussion follow-up',
      datetime: '2026-09-05T10:00:00.000Z',
      clinicalSummary: 'Initial finalized summary.',
      notes: 'Initial finalized notes.',
    })

    const amendmentId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.amendEncounter, {
      encounterId,
      reason: 'Corrected follow-up interval documentation.',
      clinicalSummary: 'Amended clinical summary.',
      notes: 'Amended clinical notes with corrected interval.',
    })
    expect(amendmentId).toBeDefined()

    const detail = await t.withIdentity(clinicianIdentity).query(api.encounters.getById, {
      encounterId,
    })
    expect(detail?.amendments.length).toBe(1)
    expect(detail?.amendments[0]?.clinicalSummary).toBe('Amended clinical summary.')
  })

  test('registerAttachmentMetadata enforces type and size policy', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]

    const draftId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
      patientId: target!._id,
      encounterType: 'asynchronous',
      diagnosis: 'Chart review',
      datetime: '2026-09-06T09:00:00.000Z',
      clinicalSummary: '',
      notes: '',
    })

    const metadataId = await t
      .withIdentity(clinicianIdentity)
      .mutation(api.encounters.registerAttachmentMetadata, {
        patientId: target!._id,
        encounterId: draftId,
        fileName: 'imaging-report.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 512,
      })
    expect(metadataId).toBeDefined()

    await expect(
      t.withIdentity(clinicianIdentity).mutation(api.encounters.registerAttachmentMetadata, {
        patientId: target!._id,
        encounterId: draftId,
        fileName: 'malware.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 100,
      })
    ).rejects.toThrow(/not allowed/i)

    const policy = await t.query(api.encounters.getAttachmentPolicy, {})
    expect(policy.authorizationRequired).toBe(true)
    expect(policy.storageStatus).toBe('convex_storage')
  })

  test('patients without clinical assignment cannot access encounters', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    await expect(
      t.withIdentity(patientIdentity).mutation(api.encounters.createEncounter, {
        patientId: patient!._id,
        encounterType: 'in-person',
        diagnosis: 'Test',
        datetime: '2026-09-01T10:00:00.000Z',
        clinicalSummary: 'Denied.',
        notes: 'Denied.',
      })
    ).rejects.toThrow()
  })
})
