/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from '../_generated/api'
import schema from '../schema'
import { addDaysToIsoDate, buildDescendingDatePage } from '../lib/checkInHistoryLogic'

const modules = import.meta.glob('../**/*.ts')

describe('checkIn history logic', () => {
  test('buildDescendingDatePage walks newest-first and marks completion', () => {
    const page = buildDescendingDatePage({
      startDate: '2026-08-20',
      endDate: '2026-08-24',
      cursor: null,
      numItems: 3,
    })

    expect(page.dates).toEqual(['2026-08-24', '2026-08-23', '2026-08-22'])
    expect(page.isDone).toBe(false)
    expect(page.continueCursor).toBe('2026-08-22')

    const lastPage = buildDescendingDatePage({
      startDate: '2026-08-20',
      endDate: '2026-08-24',
      cursor: '2026-08-21',
      numItems: 5,
    })

    expect(lastPage.dates).toEqual(['2026-08-20'])
    expect(lastPage.isDone).toBe(true)
  })

  test('addDaysToIsoDate handles month boundaries', () => {
    expect(addDaysToIsoDate('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDaysToIsoDate('2026-09-01', -1)).toBe('2026-08-31')
  })
})

describe('checkIns.listHistoryByEpisode', () => {
  const patientIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
    subject: 'patient_maya',
    name: 'Maya Chen',
    email: 'maya.chen@example.com',
  }

  const caregiverIdentity = {
    tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
    subject: 'caregiver_david',
    name: 'David Chen',
    email: 'david.chen@example.com',
  }

  test('returns missed-day gaps without fabricating symptom totals', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    expect(patient).toBeDefined()

    const episode = await t.run(async ctx => {
      return await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_patientId_and_status', q =>
          q.eq('patientId', patient!._id).eq('status', 'active')
        )
        .first()
    })
    expect(episode).toBeDefined()

    const page1 = await t.withIdentity(patientIdentity).query(api.checkIns.listHistoryByEpisode, {
      patientId: patient!._id,
      episodeId: episode!._id,
      today: '2026-09-01',
      paginationOpts: { numItems: 7, cursor: null },
    })

    expect(page1.page.length).toBeGreaterThan(0)
    const missed = page1.page.filter(entry => entry.kind === 'missed')
    const recorded = page1.page.filter(entry => entry.kind === 'recorded')
    expect(missed.length).toBeGreaterThan(0)
    expect(recorded.length).toBeGreaterThan(0)

    for (const entry of missed) {
      expect(entry).not.toHaveProperty('symptomTotal')
    }

    for (const entry of recorded) {
      if (entry.kind === 'recorded') {
        expect(entry.symptomTotal).toBeGreaterThanOrEqual(0)
        expect(entry.reporterRole).toBeDefined()
        expect(entry.safetyStatus).toBeDefined()
      }
    }
  })

  test('supports cursor pagination without duplicate dates', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})
    const episode = await t.run(async ctx => {
      return await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_patientId_and_status', q =>
          q.eq('patientId', patient!._id).eq('status', 'active')
        )
        .first()
    })

    const page1 = await t.withIdentity(patientIdentity).query(api.checkIns.listHistoryByEpisode, {
      patientId: patient!._id,
      episodeId: episode!._id,
      today: '2026-09-01',
      paginationOpts: { numItems: 3, cursor: null },
    })

    if (!page1.isDone) {
      const page2 = await t.withIdentity(patientIdentity).query(api.checkIns.listHistoryByEpisode, {
        patientId: patient!._id,
        episodeId: episode!._id,
        today: '2026-09-01',
        paginationOpts: { numItems: 3, cursor: page1.continueCursor },
      })

      const page1Dates = new Set(page1.page.map(entry => entry.date))
      for (const entry of page2.page) {
        expect(page1Dates.has(entry.date)).toBe(false)
      }
    }
  })

  test('amendCheckIn preserves original record and writes audit log', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const patient = await t.withIdentity(patientIdentity).query(api.patients.getMePatient, {})

    const submitResult = await t.withIdentity(patientIdentity).mutation(api.checkIns.submitCheckIn, {
      patientId: patient!._id,
      date: '2026-09-04',
      symptoms: {
        headache: 2,
        dizziness: 1,
        nausea: 0,
        lightSensitivity: 1,
        noiseSensitivity: 0,
        fatigue: 1,
        concentration: 1,
        sleepDifficulty: 0,
      },
      activityImpact: 'none',
    })

    const original = await t.run(async ctx => ctx.db.get(submitResult.checkInId))
    expect(original).toBeDefined()

    await t.withIdentity(patientIdentity).mutation(api.checkIns.amendCheckIn, {
      patientId: patient!._id,
      checkInId: submitResult.checkInId,
      symptoms: {
        ...original!.symptoms,
        headache: Math.min(original!.symptoms.headache + 1, 6),
      },
      activityImpact: original!.activityImpact,
      correctionReason: 'Corrected headache severity after reviewing the day again.',
    })

    const unchanged = await t.run(async ctx => ctx.db.get(submitResult.checkInId))
    expect(unchanged?.symptomTotal).toBe(original!.symptomTotal)
    expect(unchanged?.symptoms).toEqual(original!.symptoms)

    const amendments = await t.run(async ctx =>
      ctx.db
        .query('checkInAmendments')
        .withIndex('by_checkInId', q => q.eq('checkInId', submitResult.checkInId))
        .collect()
    )
    expect(amendments.length).toBe(1)
    expect(amendments[0]?.originalSymptomTotal).toBe(original!.symptomTotal)

    const auditLogs = await t.run(async ctx =>
      ctx.db
        .query('auditLogs')
        .withIndex('by_patientId', q => q.eq('patientId', patient!._id))
        .collect()
    )
    expect(
      auditLogs.some(
        log =>
          log.targetResource === 'checkInAmendments' &&
          log.action === 'update' &&
          log.event.includes('Amended daily check-in')
      )
    ).toBe(true)

    const history = await t.withIdentity(patientIdentity).query(api.checkIns.listHistoryByEpisode, {
      patientId: patient!._id,
      today: '2026-09-04',
      paginationOpts: { numItems: 5, cursor: null },
    })
    const amendedEntry = history.page.find(
      entry => entry.kind === 'recorded' && entry.checkInId === submitResult.checkInId
    )
    expect(amendedEntry?.kind).toBe('recorded')
    if (amendedEntry?.kind === 'recorded') {
      expect(amendedEntry.hasAmendment).toBe(true)
      expect(amendedEntry.originalSymptomTotal).toBe(original!.symptomTotal)
    }
  })

  test('rejects caregiver without active consent grant', async () => {
    const t = convexTest(schema, modules)
    await t.mutation(api.seed.seedDatabase, {})

    const danielPatient = await t.run(async ctx => {
      return await ctx.db
        .query('patients')
        .withIndex('by_displayId', q => q.eq('displayId', 'P-1038'))
        .first()
    })

    await expect(
      t.withIdentity(caregiverIdentity).query(api.checkIns.listHistoryByEpisode, {
        patientId: danielPatient!._id,
        today: '2026-09-01',
        paginationOpts: { numItems: 5, cursor: null },
      })
    ).rejects.toThrow(/Forbidden: Caregiver does not have active consent/)
  })
})
