/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'

const modules = import.meta.glob('../**/*.ts')

describe('Secure care-team messaging', () => {
  const mayaIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  const davidIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
    subject: 'caregiver_david',
    name: 'David Chen',
    email: 'david.chen@example.com',
  }

  const drBrooksIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
    subject: 'clinician_brooks',
    name: 'Dr. Olivia Brooks',
    email: 'dr.brooks@example.com',
  }

  const strangerIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|stranger_caregiver',
    subject: 'stranger_caregiver',
    name: 'Stranger Caregiver',
    email: 'stranger@example.com',
  }

  test('patient can list and paginate their care-team thread', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const threads = await t.withIdentity(mayaIdentity).query(api.messages.listThreads, {})
    expect(threads.length).toBeGreaterThan(0)
    expect(threads[0].threadId).toBe('thread_maya_careteam')

    const page = await t.withIdentity(mayaIdentity).query(api.messages.listByThread, {
      threadId: 'thread_maya_careteam',
      paginationOpts: { numItems: 2, cursor: null },
    })

    expect(page.page.length).toBe(2)
    expect(page.isDone).toBe(false)
  })

  test('caregiver with messaging consent can send and read messages', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const clientMessageId = 'david-msg-001'

    const sendResult = await t.withIdentity(davidIdentity).mutation(api.messages.sendMessage, {
      threadId: 'thread_maya_careteam',
      content: 'Maya had a calm evening after school.',
      clientMessageId,
    })

    expect(sendResult.isDuplicate).toBe(false)
    expect(sendResult.messageId).toBeDefined()

    const duplicateResult = await t.withIdentity(davidIdentity).mutation(api.messages.sendMessage, {
      threadId: 'thread_maya_careteam',
      content: 'Maya had a calm evening after school.',
      clientMessageId,
    })

    expect(duplicateResult.isDuplicate).toBe(true)
    expect(duplicateResult.messageId).toBe(sendResult.messageId)

    const markReadResult = await t
      .withIdentity(mayaIdentity)
      .mutation(api.messages.markRead, { threadId: 'thread_maya_careteam' })

    expect(markReadResult.markedCount).toBeGreaterThan(0)
  })

  test('clinician on caseload can access patient thread', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const threads = await t.withIdentity(drBrooksIdentity).query(api.messages.listThreads, {})
    expect(threads.some(thread => thread.threadId === 'thread_maya_careteam')).toBe(true)

    const page = await t.withIdentity(drBrooksIdentity).query(api.messages.listByThread, {
      threadId: 'thread_maya_careteam',
      paginationOpts: { numItems: 5, cursor: null },
    })

    expect(page.page.length).toBeGreaterThan(0)
  })

  test('unauthorized user cannot list or send in patient thread', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    await expect(
      t.withIdentity(strangerIdentity).query(api.messages.listByThread, {
        threadId: 'thread_maya_careteam',
        paginationOpts: { numItems: 5, cursor: null },
      })
    ).rejects.toThrow(/Forbidden|Unauthorized|not registered/)

    await expect(
      t.withIdentity(strangerIdentity).mutation(api.messages.sendMessage, {
        threadId: 'thread_maya_careteam',
        content: 'Unauthorized attempt',
        clientMessageId: 'blocked-001',
      })
    ).rejects.toThrow(/Forbidden|Unauthorized|not registered/)
  })

  test('revoked caregiver consent removes messaging access immediately', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const mayaPatient = await t
      .withIdentity(mayaIdentity)
      .query(api.patients.getMePatient, {})

    const grants = await t
      .withIdentity(mayaIdentity)
      .query(api.consent.listGrantsByPatient, { patientId: mayaPatient!._id })

    await t.withIdentity(mayaIdentity).mutation(api.consent.revokeConsent, {
      consentGrantId: grants[0]._id,
    })

    await expect(
      t.withIdentity(davidIdentity).query(api.messages.listByThread, {
        threadId: 'thread_maya_careteam',
        paginationOpts: { numItems: 5, cursor: null },
      })
    ).rejects.toThrow(/Forbidden|consent|permission/)
  })

  test('safety screening returns guidance for urgent language without logging message body in audit', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const sendResult = await t.withIdentity(mayaIdentity).mutation(api.messages.sendMessage, {
      threadId: 'thread_maya_careteam',
      content: 'I passed out and have severe repeated vomiting after my head injury.',
      clientMessageId: 'safety-msg-001',
    })

    expect(sendResult.safetyGuidance).toBeDefined()
    expect(sendResult.safetyGuidance?.isEmergency).toBe(true)

    const auditLogs = await t.run(async ctx => {
      return await ctx.db
        .query('auditLogs')
        .withIndex('by_targetResource', q => q.eq('targetResource', 'messages'))
        .order('desc')
        .take(5)
    })

    const messageAudit = auditLogs.find(log => log.resourceId === sendResult.messageId)
    expect(messageAudit).toBeDefined()
    expect(messageAudit?.event).not.toContain('passed out')
    expect(messageAudit?.event).not.toContain('vomiting')
  })
})
