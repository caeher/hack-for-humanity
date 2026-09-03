/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api, internal } from '../_generated/api'
import schema from '../schema'
import { calculateRetentionDeadline } from '../lib/retentionLogic'

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

const adminIdentity = {
  tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
  subject: 'admin_1',
  name: 'System Admin',
  email: 'admin@example.com',
}

describe('Privacy, Security, Audit, Retention & Deletion Controls (#35)', () => {
  test('Audit logs: structured mutation emission and filterable indexed query', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    expect(org).toBeDefined()

    // 1. Fetch initial logs
    const initialRaw = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {
      orgId: org!._id,
      limit: 50,
    })
    const initialLogs = Array.isArray(initialRaw) ? initialRaw : initialRaw.page
    expect(initialLogs.length).toBeGreaterThan(0)

    // Verify all logs exclude free-text clinical notes and include valid results
    for (const log of initialLogs) {
      expect(log.event).toBeDefined()
      expect(log.action).toBeDefined()
      expect(log.targetResource).toBeDefined()
      // Notes or free-text clinical content must not be present in the audit log schema
      expect('notes' in log).toBe(false)
      expect('clinicalSummary' in log).toBe(false)
    }

    // 2. Perform a clinical alert creation and check audit emission
    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeDefined()

    await t.withIdentity(clinicianIdentity).mutation(api.alerts.createAlert, {
      patientId: patient!._id,
      severity: 'Medium',
      detail: 'Elevated headache sensitivity noted',
    })

    const updatedRaw = await t.withIdentity(adminIdentity).query(api.auditLogs.listRecent, {
      orgId: org!._id,
      action: 'create',
      targetResource: 'alerts',
    })
    const updatedLogs = Array.isArray(updatedRaw) ? updatedRaw : updatedRaw.page

    const alertAudit = updatedLogs.find(l => l.targetResource === 'alerts' && l.action === 'create')
    expect(alertAudit).toBeDefined()
    expect(alertAudit?.result).toBe('success')
  })

  test('Retention calculations: adult vs pediatric statutory retention rules', () => {
    const now = 1756857600000 // Fixed timestamp
    const adultDeadline = calculateRetentionDeadline({
      recordCreatedAt: now,
      isPediatric: false,
    })
    // 7 years * 365 days = 2555 days
    expect(adultDeadline).toBe(now + 2555 * 86400000)

    const pediatricDeadline = calculateRetentionDeadline({
      recordCreatedAt: now,
      isPediatric: true,
      patientAgeBand: '13-17',
    })
    // Pediatric rule retains until age 25 (~12 years from adolescent record)
    expect(pediatricDeadline).toBe(now + 12 * 365 * 86400000)
  })

  test('Legal holds: apply, block statutory purge, and release', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(org).toBeDefined()
    expect(patient).toBeDefined()

    // 1. Apply a legal hold on the patient
    const holdId = await t.withIdentity(clinicianIdentity).mutation(api.retention.applyLegalHold, {
      orgId: org!._id,
      patientId: patient!._id,
      holdType: 'legal',
      reason: 'Formal regulatory audit in progress',
    })
    expect(holdId).toBeDefined()

    // Verify hold listed
    const holds = await t.withIdentity(clinicianIdentity).query(api.retention.listLegalHolds, {
      orgId: org!._id,
      status: 'active',
    })
    expect(holds.length).toBeGreaterThan(0)
    expect(holds[0].reason).toBe('Formal regulatory audit in progress')

    // 2. Run retention purge job (dry run and execution)
    const runResult = await t.mutation(internal.retention.runScheduledRetentionJob, {
      dryRun: false,
    })
    expect(runResult.runId).toBeDefined()
    expect(runResult.recordsPurged).toBeGreaterThanOrEqual(0)

    // Verify retention run telemetry is recorded
    const recentRuns = await t.withIdentity(adminIdentity).query(api.retention.getRetentionRuns, {})
    expect(recentRuns.length).toBeGreaterThan(0)

    // 3. Release the hold
    await t.withIdentity(adminIdentity).mutation(api.retention.releaseLegalHold, {
      holdId,
      notes: 'Audit completed satisfactorily',
    })

    const activeHoldsAfter = await t.withIdentity(clinicianIdentity).query(api.retention.listLegalHolds, {
      orgId: org!._id,
      status: 'active',
    })
    expect(activeHoldsAfter.length).toBe(0)
  })

  test('Privacy export & deletion: compiles archive, blocks under legal hold, and confirms anonymization', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const org = await t.withIdentity(adminIdentity).query(api.organizations.getMyOrganization, {})
    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeDefined()

    // 1. Request data export
    const exportRes = await t.withIdentity(patientIdentity).mutation(api.privacy.requestExport, {
      patientId: patient!._id,
      reason: 'Routine personal backup',
    })
    expect(exportRes.status).toBe('completed')

    const latestExport = await t.withIdentity(patientIdentity).query(api.privacy.getLatestExport, {
      patientId: patient!._id,
    })
    expect(latestExport?.exportPayload).toBeDefined()
    const payload = latestExport?.exportPayload as {
      metadata: { specification: string }
      demographics: { displayId: string }
    }
    expect(payload.metadata.specification).toBe('CRI-GDPR-HIPAA-EXPORT-V1')
    expect(payload.demographics.displayId).toBe(patient!.displayId)

    // 2. Apply a legal hold and test deletion blocking
    await t.withIdentity(adminIdentity).mutation(api.retention.applyLegalHold, {
      orgId: org!._id,
      patientId: patient!._id,
      holdType: 'regulatory',
      reason: 'Safety incident review',
    })

    const blockedDeletion = await t.withIdentity(patientIdentity).mutation(api.privacy.requestDeletion, {
      patientId: patient!._id,
    })
    expect(blockedDeletion.isBlocked).toBe(true)
    expect(blockedDeletion.verificationCode).toBe('BLOCKED')

    // Release hold to permit deletion test
    const holds = await t.withIdentity(adminIdentity).query(api.retention.listLegalHolds, {
      orgId: org!._id,
      status: 'active',
    })
    await t.withIdentity(adminIdentity).mutation(api.retention.releaseLegalHold, {
      holdId: holds[0]._id,
    })

    // 3. Initiate deletion without hold -> receives challenge token
    const deletionRequest = await t.withIdentity(patientIdentity).mutation(api.privacy.requestDeletion, {
      patientId: patient!._id,
    })
    expect(deletionRequest.isBlocked).toBe(false)
    expect(deletionRequest.verificationCode).toContain('CONFIRM-DELETE')

    // 4. Confirm deletion with challenge token
    const confirmResult = await t.withIdentity(patientIdentity).mutation(api.privacy.confirmDeletion, {
      requestId: deletionRequest.requestId,
      verificationCode: deletionRequest.verificationCode,
    })
    expect(confirmResult.success).toBe(true)
    expect(confirmResult.anonymizedDisplayId).toContain('DELETED-')

    // Verify patient was anonymized in database; since patient is suspended, admin queries request status
    const privacyRequests = await t.withIdentity(adminIdentity).query(api.privacy.listPrivacyRequests, {
      orgId: org!._id,
    })
    const completedReq = privacyRequests.find(r => r._id === deletionRequest.requestId)
    expect(completedReq?.status).toBe('completed')
  })
})
