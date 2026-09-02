import { describe, expect, it } from 'vitest'
import {
  buildTimelineDayPoints,
  buildTimelineEventMarkers,
  buildTimelineSummary,
  resolveTimelineWindow,
} from '../lib/recoveryTimelineLogic'
import type { Doc, Id } from '../_generated/dataModel'

const patientId = 'p1' as Id<'patients'>
const episodeId = 'ep1' as Id<'recoveryEpisodes'>

const episode: Doc<'recoveryEpisodes'> = {
  _id: episodeId,
  _creationTime: 0,
  patientId,
  orgId: 'o1' as Id<'organizations'>,
  status: 'active',
  riskLevel: 'Review',
  incidentDate: '2026-08-19',
  startDate: '2026-08-19',
  injuryContext: 'Soccer collision',
  createdAt: 0,
}

function makeCheckIn(
  date: string,
  symptomTotal: number,
  headache = 3
): Doc<'checkIns'> {
  return {
    _id: `ci-${date}` as Id<'checkIns'>,
    _creationTime: 0,
    patientId,
    episodeId,
    submittedByUserId: 'u1' as Id<'users'>,
    date,
    symptoms: {
      headache,
      dizziness: 2,
      nausea: 1,
      lightSensitivity: 2,
      noiseSensitivity: 2,
      fatigue: 3,
      concentration: 2,
      sleepDifficulty: 2,
    },
    symptomTotal,
    activityImpact: 'yes',
    dangerSignsPresent: false,
    dangerSigns: [],
    createdAt: 0,
  }
}

function makeExposure(date: string, sleepHours: number): Doc<'activityExposures'> {
  return {
    _id: `ex-${date}` as Id<'activityExposures'>,
    _creationTime: 0,
    patientId,
    episodeId,
    date,
    cognitiveMinutes: 30,
    screenMinutes: 60,
    physicalExertionScore: 3,
    sleepHours,
    sleepQuality: 7,
    createdAt: 0,
  }
}

describe('recoveryTimelineLogic', () => {
  it('resolves sliding and episode windows', () => {
    expect(resolveTimelineWindow('7', '2026-08-31', episode)).toEqual({
      startDate: '2026-08-25',
      endDate: '2026-08-31',
    })
    expect(resolveTimelineWindow('episode', '2026-08-31', episode)).toEqual({
      startDate: '2026-08-19',
      endDate: '2026-08-31',
    })
  })

  it('shows missing days as gaps without zero imputation', () => {
    const points = buildTimelineDayPoints({
      range: '7',
      symptomGroup: 'all',
      comparisonView: 'symptoms_sleep',
      today: '2026-08-28',
      timeZone: 'UTC',
      episode,
      checkIns: [makeCheckIn('2026-08-26', 24), makeCheckIn('2026-08-28', 20)],
      exposures: [makeExposure('2026-08-26', 6), makeExposure('2026-08-28', 7)],
      encounters: [],
      carePlans: [],
      amendments: [],
      safetyEvaluations: [],
    })

    expect(points).toHaveLength(7)
    expect(points.find(point => point.date === '2026-08-22')?.symptomValue).toBeNull()
    expect(points.find(point => point.date === '2026-08-26')?.symptomValue).toBe(17)
    expect(points.find(point => point.date === '2026-08-27')?.symptomValue).toBeNull()
    expect(points.find(point => point.date === '2026-08-28')?.symptomValue).toBe(17)
    expect(points.find(point => point.date === '2026-08-27')?.exposureValue).toBeNull()
  })

  it('maps symptom groups from source check-in dimensions', () => {
    const points = buildTimelineDayPoints({
      range: '7',
      symptomGroup: 'headache',
      comparisonView: 'symptoms_screen',
      today: '2026-08-26',
      timeZone: 'UTC',
      episode,
      checkIns: [makeCheckIn('2026-08-26', 24, 5)],
      exposures: [makeExposure('2026-08-26', 6)],
      encounters: [],
      carePlans: [],
      amendments: [],
      safetyEvaluations: [],
    })

    const day = points.find(point => point.date === '2026-08-26')
    expect(day?.symptomValue).toBe(5)
    expect(day?.checkInId).toBe('ci-2026-08-26')
    expect(day?.exposureId).toBe('ex-2026-08-26')
  })

  it('includes incident, encounter, and safety markers', () => {
    const events = buildTimelineEventMarkers({
      range: 'episode',
      symptomGroup: 'all',
      comparisonView: 'symptoms_sleep',
      today: '2026-08-31',
      timeZone: 'UTC',
      episode,
      checkIns: [],
      exposures: [],
      encounters: [
        {
          _id: 'enc1' as Id<'clinicalEncounters'>,
          _creationTime: 0,
          patientId,
          episodeId,
          orgId: 'o1' as Id<'organizations'>,
          clinicianUserId: 'u1' as Id<'users'>,
          encounterType: 'in-person',
          diagnosis: 'Concussion evaluation',
          datetime: '2026-08-20 10:00',
          clinicalSummary: 'summary',
          notes: 'notes',
          createdAt: 0,
        },
      ],
      carePlans: [],
      amendments: [],
      safetyEvaluations: [
        {
          _id: 'safe1' as Id<'safetyEvaluations'>,
          _creationTime: 0,
          patientId,
          contextType: 'check_in',
          status: 'review',
          highestSeverity: 'medium',
          ruleEngineVersion: '1.0.0',
          matchedRuleCodes: ['R1'],
          matchedEvidenceSummary: ['Headache spike'],
          primaryEscalation: 'Review',
          blockedActions: [],
          failSafeApplied: false,
          createdAt: Date.parse('2026-08-25T12:00:00.000Z'),
        },
      ],
    })

    expect(events.some(event => event.kind === 'incident')).toBe(true)
    expect(events.some(event => event.kind === 'clinical_encounter')).toBe(true)
    expect(events.some(event => event.kind === 'safety_event')).toBe(true)
  })

  it('summarizes without causal language', () => {
    const points = buildTimelineDayPoints({
      range: '7',
      symptomGroup: 'all',
      comparisonView: 'symptoms_sleep',
      today: '2026-08-28',
      timeZone: 'UTC',
      episode,
      checkIns: [
        makeCheckIn('2026-08-26', 24),
        makeCheckIn('2026-08-28', 20, 1),
      ],
      exposures: [makeExposure('2026-08-26', 6), makeExposure('2026-08-28', 7)],
      encounters: [],
      carePlans: [],
      amendments: [],
      safetyEvaluations: [],
    })

    const summary = buildTimelineSummary(points, 'all', 'symptoms_sleep')
    expect(summary.associationNote).toMatch(/do not establish medical causation/i)
    expect(summary.description).toMatch(/within-person descriptive change/i)
    expect(summary.description).not.toMatch(/caused by/i)
  })
})
