/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api, internal } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

const clinicianIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
  subject: 'clinician_brooks',
  name: 'Dr. Olivia Brooks',
  email: 'dr.brooks@example.com',
}

describe('clinical attachments', () => {
  test('generateUploadUrl enforces policy and finalizeUpload quarantines unsafe types', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]!

    const draftId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
      patientId: target._id,
      encounterType: 'telehealth',
      diagnosis: 'Concussion follow-up',
      datetime: '2026-09-04T14:00:00.000Z',
      clinicalSummary: 'Draft summary.',
      notes: 'Draft notes.',
    })

    await expect(
      t.withIdentity(clinicianIdentity).mutation(api.attachments.generateUploadUrl, {
        patientId: target._id,
        contextType: 'encounter',
        encounterId: draftId,
        fileName: 'payload.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 2048,
      })
    ).rejects.toThrow(/not allowed/i)

    const staged = await t.withIdentity(clinicianIdentity).mutation(api.attachments.generateUploadUrl, {
      patientId: target._id,
      contextType: 'encounter',
      encounterId: draftId,
      fileName: 'imaging-report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
    })

    expect(staged.uploadUrl).toBeTruthy()
    expect(staged.uploadExpiresAt).toBeGreaterThan(Date.now())

    const storageId = await t.run(async ctx => ctx.storage.store(new Blob(['%PDF-1.4 test'])))

    const attachmentId = await t.withIdentity(clinicianIdentity).mutation(api.attachments.finalizeUpload, {
      attachmentId: staged.attachmentId,
      storageId,
    })
    expect(attachmentId).toBe(staged.attachmentId)

    await expect(
      t.withIdentity(clinicianIdentity).mutation(api.attachments.getDownloadUrl, {
        attachmentId: staged.attachmentId,
      })
    ).resolves.toMatchObject({
      fileName: 'imaging-report.pdf',
      mimeType: 'application/pdf',
    })
  })

  test('quarantined attachments cannot be downloaded', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]!

    const draftId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
      patientId: target._id,
      encounterType: 'asynchronous',
      diagnosis: 'Chart review',
      datetime: '2026-09-06T09:00:00.000Z',
      clinicalSummary: 'Summary',
      notes: 'Notes',
    })

    const staged = await t.withIdentity(clinicianIdentity).mutation(api.attachments.generateUploadUrl, {
      patientId: target._id,
      contextType: 'encounter',
      encounterId: draftId,
      fileName: 'mismatch.pdf',
      mimeType: 'image/png',
      sizeBytes: 2048,
    })

    const storageId = await t.run(async ctx => ctx.storage.store(new Blob(['not-a-real-png'])))
    await t.withIdentity(clinicianIdentity).mutation(api.attachments.finalizeUpload, {
      attachmentId: staged.attachmentId,
      storageId,
    })

    await expect(
      t.withIdentity(clinicianIdentity).mutation(api.attachments.getDownloadUrl, {
        attachmentId: staged.attachmentId,
      })
    ).rejects.toThrow(/quarantined/i)
  })

  test('cleanupOrphanedUploads removes expired pending metadata idempotently', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patients = await t.withIdentity(clinicianIdentity).query(api.patients.list, {})
    const list = Array.isArray(patients) ? patients : patients.page
    const target = list[0]!

    const draftId = await t.withIdentity(clinicianIdentity).mutation(api.encounters.saveDraft, {
      patientId: target._id,
      encounterType: 'in-person',
      diagnosis: 'Follow-up',
      datetime: '2026-09-07T10:00:00.000Z',
      clinicalSummary: 'Summary',
      notes: 'Notes',
    })

    const staged = await t.withIdentity(clinicianIdentity).mutation(api.attachments.generateUploadUrl, {
      patientId: target._id,
      contextType: 'encounter',
      encounterId: draftId,
      fileName: 'orphan.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    })

    await t.run(async ctx => {
      await ctx.db.patch(staged.attachmentId, {
        uploadExpiresAt: Date.now() - 1000,
      })
    })

    const first = await t.mutation(internal.attachments.cleanupOrphanedUploads, {
      now: Date.now(),
    })
    expect(first.expiredMetadataRemoved).toBeGreaterThanOrEqual(1)

    const second = await t.mutation(internal.attachments.cleanupOrphanedUploads, {
      now: Date.now(),
    })
    expect(second.expiredMetadataRemoved).toBe(0)
  })

  test('attachment policy reports convex storage backend', async () => {
    const t = convexTest(schema, modules)
    const policy = await t.query(api.attachments.getPolicy, {})
    expect(policy.storageStatus).toBe('convex_storage')
    expect(policy.storageBackend).toBe('convex')
    expect(policy.authorizationRequired).toBe(true)
  })
})
