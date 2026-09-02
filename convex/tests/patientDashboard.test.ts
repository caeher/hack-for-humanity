import { describe, expect, it } from 'vitest'
import {
  buildChartPoints,
  computeCheckInConsistency,
  deriveSleepHeadacheInsight,
  findNextEncounter,
  resolveSafetyEscalation,
} from '../lib/patientDashboardLogic'

describe('patientDashboardLogic', () => {
  it('computes check-in consistency without treating gaps as zero', () => {
    const result = computeCheckInConsistency('2026-08-20', '2026-08-25', [
      '2026-08-20',
      '2026-08-22',
      '2026-08-25',
    ])

    expect(result.recordedDays).toBe(3)
    expect(result.eligibleDays).toBe(6)
    expect(result.ratePercent).toBe(50)
  })

  it('builds chart points only for days with saved check-ins', () => {
    const points = buildChartPoints(
      [
        { date: '2026-08-28', symptomTotal: 24, symptoms: { headache: 4 } },
        { date: '2026-08-30', symptomTotal: 18, symptoms: { headache: 3 } },
      ],
      '2026-08-31'
    )

    expect(points).toHaveLength(2)
    expect(points[0]?.symptomBurden).toBe(24)
    expect(points[1]?.dayLabel).toBe('Aug 30')
  })

  it('returns insufficient insight when data is sparse', () => {
    const insight = deriveSleepHeadacheInsight(
      [{ date: '2026-08-30', symptoms: { headache: 2 } }],
      [{ date: '2026-08-29', sleepHours: 5 }],
      '2026-08-31'
    )

    expect(insight.status).toBe('insufficient')
    expect(insight.footer).toContain('LIVE DATA')
  })

  it('finds the next upcoming encounter', () => {
    const next = findNextEncounter(
      [
        {
          _id: 'enc1',
          _creationTime: 0,
          patientId: 'p1',
          orgId: 'o1',
          clinicianUserId: 'u1',
          encounterType: 'in-person',
          diagnosis: 'test',
          datetime: '2026-09-03 10:30',
          clinicalSummary: 'summary',
          notes: 'notes',
          createdAt: 0,
        },
        {
          _id: 'enc2',
          _creationTime: 0,
          patientId: 'p1',
          orgId: 'o1',
          clinicianUserId: 'u1',
          encounterType: 'telehealth',
          diagnosis: 'past',
          datetime: '2026-08-20 10:30',
          clinicalSummary: 'summary',
          notes: 'notes',
          createdAt: 0,
        },
      ] as never,
      '2026-09-01'
    )

    expect(next?.datetime).toBe('2026-09-03 10:30')
  })

  it('surfaces unacknowledged safety escalation', () => {
    const escalation = resolveSafetyEscalation({
      _id: 's1',
      _creationTime: 0,
      status: 'elevated',
      matchedEvidenceSummary: ['Repeated vomiting reported'],
      createdAt: Date.now(),
      contextType: 'check_in',
      highestSeverity: 'high',
      ruleEngineVersion: '1',
      matchedRuleCodes: [],
      primaryEscalation: 'clinical_review',
      blockedActions: [],
      failSafeApplied: false,
    } as never)

    expect(escalation?.headline).toContain('Elevated')
    expect(escalation?.requiresAcknowledgement).toBe(true)
  })
})
