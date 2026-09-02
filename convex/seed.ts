import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const seedDatabase = mutation({
  args: {},
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async ctx => {
    // 1. Seed Organization
    let org = await ctx.db.query('organizations').withIndex('by_slug', q => q.eq('slug', 'oak-valley-health')).first()
    if (!org) {
      const orgId = await ctx.db.insert('organizations', {
        name: 'Oak Valley Health Sports Medicine & Concussion Clinic',
        slug: 'oak-valley-health',
        retentionPolicyDays: 2555, // 7-year retention policy
        autoEscalateAlerts: true,
        primaryContactEmail: 'clinical-team@oakvalleyhealth.org',
        cohortCapacity: 500,
        accentColor: '#0ea5e9',
        activePathways: [
          'Adult Concussion Active Recovery',
          'Adolescent Return-to-Learn',
          'Persistent Post-Concussion Monitoring',
        ],
        createdAt: Date.now() - 86400000 * 90,
      })
      org = await ctx.db.get(orgId)
    }
    if (!org) throw new Error('Failed to resolve organization.')

    // 2. Seed Users
    const initialUsersData = [
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|admin_1',
        name: 'System Admin',
        email: 'admin@example.com',
        role: 'admin' as const,
        status: 'Active' as const,
        lastActive: 'Just now',
        createdAt: Date.now() - 86400000 * 60,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_brooks',
        name: 'Dr. Olivia Brooks',
        email: 'dr.brooks@example.com',
        role: 'clinician' as const,
        status: 'Active' as const,
        lastActive: 'Just now',
        createdAt: Date.now() - 86400000 * 45,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|clinician_vance',
        name: 'Dr. Marcus Vance',
        email: 'dr.vance@example.com',
        role: 'clinician' as const,
        status: 'Active' as const,
        lastActive: '2 hrs ago',
        createdAt: Date.now() - 86400000 * 40,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_maya',
        name: 'Maya Chen',
        email: 'maya.chen@example.com',
        role: 'patient' as const,
        status: 'Active' as const,
        lastActive: 'Just now',
        createdAt: Date.now() - 86400000 * 14,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_david',
        name: 'David Chen',
        email: 'david.chen@example.com',
        role: 'caregiver' as const,
        status: 'Active' as const,
        lastActive: '10 min ago',
        createdAt: Date.now() - 86400000 * 12,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_daniel',
        name: 'Daniel Ortiz',
        email: 'daniel.ortiz@example.com',
        role: 'patient' as const,
        status: 'Active' as const,
        lastActive: '1 hr ago',
        createdAt: Date.now() - 86400000 * 6,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_ava',
        name: 'Ava Williams',
        email: 'ava.williams@example.com',
        role: 'patient' as const,
        status: 'Active' as const,
        lastActive: 'Yesterday',
        createdAt: Date.now() - 86400000 * 22,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_james',
        name: 'James Kim',
        email: 'james.kim@example.com',
        role: 'patient' as const,
        status: 'Active' as const,
        lastActive: '20 min ago',
        createdAt: Date.now() - 86400000 * 3,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_nora',
        name: 'Nora Patel',
        email: 'nora.patel@example.com',
        role: 'patient' as const,
        status: 'Active' as const,
        lastActive: '3 days ago',
        createdAt: Date.now() - 86400000 * 35,
      },
    ]

    const usersByEmail = new Map()
    for (const u of initialUsersData) {
      let existing = await ctx.db
        .query('users')
        .withIndex('by_email', q => q.eq('email', u.email))
        .first()
      if (!existing) {
        const id = await ctx.db.insert('users', u)
        existing = await ctx.db.get(id)
      }
      usersByEmail.set(u.email, existing!)
    }

    const adminUser = usersByEmail.get('admin@example.com')!
    const drBrooks = usersByEmail.get('dr.brooks@example.com')!
    const drVance = usersByEmail.get('dr.vance@example.com')!
    const mayaUser = usersByEmail.get('maya.chen@example.com')!
    const davidUser = usersByEmail.get('david.chen@example.com')!
    const danielUser = usersByEmail.get('daniel.ortiz@example.com')!
    const avaUser = usersByEmail.get('ava.williams@example.com')!
    const jamesUser = usersByEmail.get('james.kim@example.com')!
    const noraUser = usersByEmail.get('nora.patel@example.com')!

    // 3. Seed Clinician Memberships
    const clinicianMembershipsData = [
      {
        userId: drBrooks._id,
        orgId: org._id,
        clinicalRole: 'lead' as const,
        specialty: 'Sports Medicine & Concussion',
        status: 'active' as const,
        joinedAt: Date.now() - 86400000 * 45,
      },
      {
        userId: drVance._id,
        orgId: org._id,
        clinicalRole: 'attending' as const,
        specialty: 'Neurology & Persistent Symptoms',
        status: 'active' as const,
        joinedAt: Date.now() - 86400000 * 40,
      },
    ]

    for (const m of clinicianMembershipsData) {
      const existing = await ctx.db
        .query('clinicianMemberships')
        .withIndex('by_userId_and_orgId', q => q.eq('userId', m.userId).eq('orgId', m.orgId))
        .first()
      if (!existing) {
        await ctx.db.insert('clinicianMemberships', m)
      }
    }

    // 4. Seed Patients
    const initialPatientsData = [
      {
        userId: mayaUser._id,
        orgId: org._id,
        primaryClinicianId: drBrooks._id,
        displayId: 'P-1042',
        preferredName: 'Maya',
        dateOfBirth: '1998-04-12',
        status: 'Active' as const,
        notes: 'Active recovery protocol; symptom-guided pacing.',
        createdAt: Date.now() - 86400000 * 14,
      },
      {
        userId: danielUser._id,
        orgId: org._id,
        primaryClinicianId: drBrooks._id,
        displayId: 'P-1038',
        preferredName: 'Daniel',
        dateOfBirth: '2001-09-24',
        status: 'Active' as const,
        notes: 'Suspected acute concussion following cycling fall.',
        createdAt: Date.now() - 86400000 * 6,
      },
      {
        userId: avaUser._id,
        orgId: org._id,
        primaryClinicianId: drVance._id,
        displayId: 'P-1031',
        preferredName: 'Ava',
        dateOfBirth: '1995-11-03',
        status: 'Active' as const,
        notes: 'Concussion following low-speed motor vehicle collision.',
        createdAt: Date.now() - 86400000 * 22,
      },
      {
        userId: jamesUser._id,
        orgId: org._id,
        primaryClinicianId: drBrooks._id,
        displayId: 'P-1027',
        preferredName: 'James',
        dateOfBirth: '2004-06-18',
        status: 'Active' as const,
        notes: 'Acute head impact during sports match; Tier 1 danger signs monitored.',
        createdAt: Date.now() - 86400000 * 3,
      },
      {
        userId: noraUser._id,
        orgId: org._id,
        primaryClinicianId: drVance._id,
        displayId: 'P-1019',
        preferredName: 'Nora',
        dateOfBirth: '1990-02-15',
        status: 'Active' as const,
        notes: 'Persistent post-concussion symptoms >4 weeks.',
        createdAt: Date.now() - 86400000 * 35,
      },
    ]

    const patientsByDisplayId = new Map()
    for (const p of initialPatientsData) {
      let existing = await ctx.db
        .query('patients')
        .withIndex('by_displayId', q => q.eq('displayId', p.displayId))
        .first()
      if (!existing) {
        const id = await ctx.db.insert('patients', p)
        existing = await ctx.db.get(id)
      }
      patientsByDisplayId.set(p.displayId, existing!)
    }

    const mayaPatient = patientsByDisplayId.get('P-1042')!
    const danielPatient = patientsByDisplayId.get('P-1038')!
    const avaPatient = patientsByDisplayId.get('P-1031')!
    const jamesPatient = patientsByDisplayId.get('P-1027')!
    const noraPatient = patientsByDisplayId.get('P-1019')!

    // 5. Seed Recovery Episodes
    const episodesData = [
      {
        patientId: mayaPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-19',
        injuryContext: 'Sports collision (recreational soccer match)',
        status: 'active' as const,
        riskLevel: 'Stable' as const,
        baselineSymptomTotal: 27,
        adherenceRate: 92,
        startDate: '2026-08-19',
        createdAt: Date.now() - 86400000 * 13,
      },
      {
        patientId: danielPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-26',
        injuryContext: 'Cycling fall on paved trail',
        status: 'active' as const,
        riskLevel: 'Review' as const,
        baselineSymptomTotal: 34,
        adherenceRate: 71,
        startDate: '2026-08-26',
        createdAt: Date.now() - 86400000 * 5,
      },
      {
        patientId: avaPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-10',
        injuryContext: 'Motor vehicle collision (rear-ended at red light)',
        status: 'active' as const,
        riskLevel: 'Stable' as const,
        baselineSymptomTotal: 29,
        adherenceRate: 96,
        startDate: '2026-08-10',
        createdAt: Date.now() - 86400000 * 21,
      },
      {
        patientId: jamesPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-29',
        injuryContext: 'Direct head-to-head collision during basketball',
        status: 'active' as const,
        riskLevel: 'Elevated' as const,
        baselineSymptomTotal: 38,
        adherenceRate: 64,
        startDate: '2026-08-29',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        patientId: noraPatient._id,
        orgId: org._id,
        incidentDate: '2026-07-28',
        injuryContext: 'Slip and fall with direct occipital impact',
        status: 'active' as const,
        riskLevel: 'Review' as const,
        baselineSymptomTotal: 30,
        adherenceRate: 89,
        startDate: '2026-07-28',
        createdAt: Date.now() - 86400000 * 34,
      },
    ]

    const episodesByPatientId = new Map()
    for (const ep of episodesData) {
      let existing = await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_patientId', q => q.eq('patientId', ep.patientId))
        .first()
      if (!existing) {
        const id = await ctx.db.insert('recoveryEpisodes', ep)
        existing = await ctx.db.get(id)
      }
      episodesByPatientId.set(ep.patientId, existing!)
    }

    const mayaEpisode = episodesByPatientId.get(mayaPatient._id)!
    const danielEpisode = episodesByPatientId.get(danielPatient._id)!
    const jamesEpisode = episodesByPatientId.get(jamesPatient._id)!

    // 6. Seed Consent Grants (Maya Chen grants caregiver David Chen)
    const existingGrant = await ctx.db
      .query('consentGrants')
      .withIndex('by_patientId_and_granteeUserId', q =>
        q.eq('patientId', mayaPatient._id).eq('granteeUserId', davidUser._id)
      )
      .first()

    if (!existingGrant) {
      await ctx.db.insert('consentGrants', {
        patientId: mayaPatient._id,
        granteeUserId: davidUser._id,
        granteeRole: 'caregiver',
        scopes: ['view_symptoms', 'view_trends', 'view_plan', 'receive_alerts'],
        relationship: 'Spouse',
        status: 'active',
        grantedAt: Date.now() - 86400000 * 12,
        expiresAt: Date.now() + 86400000 * 90,
      })
    }

    // 7. Seed 8-Symptom Check-Ins for Maya Chen (P-1042)
    const existingCheckIns = await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', mayaPatient._id))
      .take(1)

    if (existingCheckIns.length === 0) {
      const checkInHistory = [
        {
          date: '2026-08-25',
          symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
          activityImpact: 'yes' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Moderate headache after 20 mins of reading.',
          offsetDays: 7,
        },
        {
          date: '2026-08-26',
          symptoms: { headache: 5, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
          activityImpact: 'yes' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Resting in dim room helped.',
          offsetDays: 6,
        },
        {
          date: '2026-08-27',
          symptoms: { headache: 4, dizziness: 3, nausea: 2, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 4, concentration: 3, sleepDifficulty: 1 },
          activityImpact: 'not-sure' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Took afternoon rest break.',
          offsetDays: 5,
        },
        {
          date: '2026-08-28',
          symptoms: { headache: 5, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 3, fatigue: 3, concentration: 3, sleepDifficulty: 1 },
          activityImpact: 'yes' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Screen exposure during short email check.',
          offsetDays: 4,
        },
        {
          date: '2026-08-29',
          symptoms: { headache: 4, dizziness: 2, nausea: 1, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 3, concentration: 3, sleepDifficulty: 1 },
          activityImpact: 'no' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Walked outside for 15 mins with sunglasses.',
          offsetDays: 3,
        },
        {
          date: '2026-08-30',
          symptoms: { headache: 3, dizziness: 2, nausea: 1, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 3, concentration: 2, sleepDifficulty: 1 },
          activityImpact: 'no' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Feeling clearer head today.',
          offsetDays: 2,
        },
        {
          date: '2026-09-01',
          symptoms: { headache: 2, dizziness: 2, nausea: 1, lightSensitivity: 2, noiseSensitivity: 2, fatigue: 3, concentration: 2, sleepDifficulty: 1 },
          activityImpact: 'no' as const,
          dangerSignsPresent: false,
          dangerSigns: [],
          note: 'Good energy morning; steady gradual recovery.',
          offsetDays: 0,
        },
      ]

      for (const item of checkInHistory) {
        const total = Object.values(item.symptoms).reduce((a, b) => a + b, 0)
        await ctx.db.insert('checkIns', {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          submittedByUserId: mayaUser._id,
          date: item.date,
          symptoms: item.symptoms,
          symptomTotal: total,
          activityImpact: item.activityImpact,
          dangerSignsPresent: item.dangerSignsPresent,
          dangerSigns: item.dangerSigns,
          note: item.note,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }
    }

    // 8. Seed Recovery Trends for Maya Chen (P-1042)
    const existingTrends = await ctx.db
      .query('recoveryTrends')
      .withIndex('by_patientId', q => q.eq('patientId', mayaPatient._id))
      .take(1)

    if (existingTrends.length === 0) {
      const initialTrends = [
        { date: '2026-08-25', dayLabel: 'Aug 25', symptomTotal: 27, headacheRating: 5, sleepQuality: 4 },
        { date: '2026-08-26', dayLabel: 'Aug 26', symptomTotal: 25, headacheRating: 5, sleepQuality: 5 },
        { date: '2026-08-27', dayLabel: 'Aug 27', symptomTotal: 23, headacheRating: 4, sleepQuality: 6 },
        { date: '2026-08-28', dayLabel: 'Aug 28', symptomTotal: 24, headacheRating: 5, sleepQuality: 5 },
        { date: '2026-08-29', dayLabel: 'Aug 29', symptomTotal: 20, headacheRating: 4, sleepQuality: 7 },
        { date: '2026-08-30', dayLabel: 'Aug 30', symptomTotal: 18, headacheRating: 3, sleepQuality: 7 },
        { date: '2026-09-01', dayLabel: 'Today', symptomTotal: 15, headacheRating: 2, sleepQuality: 8 },
      ]

      for (const t of initialTrends) {
        await ctx.db.insert('recoveryTrends', {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          date: t.date,
          dayLabel: t.dayLabel,
          symptomTotal: t.symptomTotal,
          headacheRating: t.headacheRating,
          sleepQuality: t.sleepQuality,
          createdAt: Date.now(),
        })
      }
    }

    // 9. Seed Alerts
    const existingAlerts = await ctx.db.query('alerts').take(1)
    if (existingAlerts.length === 0) {
      const initialAlerts = [
        {
          patientId: jamesPatient._id,
          episodeId: jamesEpisode._id,
          orgId: org._id,
          detail: 'Self-reported repeated vomiting and acute drowsiness; Tier 1 emergency guidance displayed.',
          severity: 'High' as const,
          status: 'active' as const,
          dangerSigns: ['Repeated vomiting or nausea', 'Extreme drowsiness'],
          createdAt: Date.now() - 18 * 60 * 1000,
        },
        {
          patientId: danielPatient._id,
          episodeId: danielEpisode._id,
          orgId: org._id,
          detail: 'Headache rating increased 3 points over 24 hours following screen exposure.',
          severity: 'Medium' as const,
          status: 'active' as const,
          createdAt: Date.now() - 60 * 60 * 1000,
        },
        {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          orgId: org._id,
          detail: 'Sleep difficulty reported for 3 consecutive nights.',
          severity: 'Low' as const,
          status: 'active' as const,
          createdAt: Date.now() - 3 * 60 * 60 * 1000,
        },
      ]

      for (const a of initialAlerts) {
        await ctx.db.insert('alerts', a)
      }
    }

    // 10. Seed Care Plans for Maya Chen
    const existingPlans = await ctx.db
      .query('carePlans')
      .withIndex('by_patientId', q => q.eq('patientId', mayaPatient._id))
      .take(1)

    if (existingPlans.length === 0) {
      const initialTasks = [
        {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          assignedByUserId: drBrooks._id,
          title: 'Morning 8-symptom check-in',
          category: 'check_in' as const,
          targetTime: '08:00 AM',
          completed: true,
          dayNumber: 12,
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          assignedByUserId: drBrooks._id,
          title: 'Cognitive rest & 20-min screen break interval',
          category: 'cognitive_pacing' as const,
          targetTime: '10:30 AM',
          completed: true,
          dayNumber: 12,
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          assignedByUserId: drBrooks._id,
          title: 'Light symptom-free walking (15 minutes)',
          category: 'physical_activity' as const,
          targetTime: '01:00 PM',
          completed: false,
          dayNumber: 12,
          createdAt: Date.now() - 86400000 * 2,
        },
        {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          assignedByUserId: drBrooks._id,
          title: 'Evening symptom and sleep reflection',
          category: 'sleep_hygiene' as const,
          targetTime: '08:30 PM',
          completed: false,
          dayNumber: 12,
          createdAt: Date.now() - 86400000 * 2,
        },
      ]

      for (const task of initialTasks) {
        await ctx.db.insert('carePlans', task)
      }
    }

    // 11. Seed Clinical Encounters
    const existingEncounters = await ctx.db.query('clinicalEncounters').take(1)
    if (existingEncounters.length === 0) {
      const initialEncounters = [
        {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          orgId: org._id,
          clinicianUserId: drBrooks._id,
          encounterType: 'in-person' as const,
          diagnosis: 'Diagnosed mild traumatic brain injury (concussion), active recovery stage',
          datetime: '2026-08-20 10:30',
          clinicalSummary: 'Initial post-injury clinical encounter. Graduated pacing protocol initiated.',
          notes: 'Patient presented with headache (5/6) and light sensitivity (4/6) post soccer collision. Recommended symptom-limited cognitive pacing, 48h relative rest, and daily CRI logging.',
          createdAt: Date.now() - 86400000 * 12,
        },
        {
          patientId: danielPatient._id,
          episodeId: danielEpisode._id,
          orgId: org._id,
          clinicianUserId: drBrooks._id,
          encounterType: 'telehealth' as const,
          diagnosis: 'Suspected acute concussion following cycling accident',
          datetime: '2026-08-27 14:00',
          clinicalSummary: 'Telehealth triage evaluation.',
          notes: 'Discussed screen moderation and hydration. Instructed patient on Tier 1 emergency danger signs.',
          createdAt: Date.now() - 86400000 * 5,
        },
      ]

      for (const enc of initialEncounters) {
        await ctx.db.insert('clinicalEncounters', enc)
      }
    }

    // 12. Seed Messages
    const existingMessages = await ctx.db.query('messages').take(1)
    if (existingMessages.length === 0) {
      const threadId = 'thread_maya_careteam'
      const initialMessages = [
        {
          threadId,
          senderUserId: drBrooks._id,
          recipientUserId: mayaUser._id,
          patientId: mayaPatient._id,
          orgId: org._id,
          content: 'Hi Maya, I reviewed your recent check-in trend. Your symptom totals are decreasing steadily. Remember to keep screen intervals under 30 minutes.',
          createdAt: Date.now() - 86400000 * 2,
          read: true,
        },
        {
          threadId,
          senderUserId: mayaUser._id,
          recipientUserId: drBrooks._id,
          patientId: mayaPatient._id,
          orgId: org._id,
          content: 'Thank you Dr. Brooks! The 20-minute walking breaks have been very helpful.',
          createdAt: Date.now() - 86400000 * 1,
          read: true,
        },
        {
          threadId,
          senderUserId: davidUser._id,
          recipientUserId: drBrooks._id,
          patientId: mayaPatient._id,
          orgId: org._id,
          content: 'Dr. Brooks, Maya rested well yesterday afternoon and did not report any dizziness after dinner.',
          createdAt: Date.now() - 3600000 * 5,
          read: false,
        },
      ]

      for (const msg of initialMessages) {
        await ctx.db.insert('messages', msg)
      }
    }

    // 13. Seed Audit Logs
    const existingAudit = await ctx.db.query('auditLogs').take(1)
    if (existingAudit.length === 0) {
      const initialAudit = [
        {
          actorUserId: drBrooks._id,
          actorRole: 'clinician',
          orgId: org._id,
          patientId: mayaPatient._id,
          event: 'Viewed longitudinal recovery summary report',
          targetResource: 'reports',
          resourceId: mayaPatient._id,
          action: 'read' as const,
          createdAt: Date.now() - 10000,
        },
        {
          actorUserId: adminUser._id,
          actorRole: 'admin',
          orgId: org._id,
          event: 'Invited user dr.vance@example.com',
          targetResource: 'users',
          resourceId: drVance._id,
          action: 'create' as const,
          createdAt: Date.now() - 86400000 * 40,
        },
        {
          actorUserId: mayaUser._id,
          actorRole: 'patient',
          orgId: org._id,
          patientId: mayaPatient._id,
          event: 'Granted caregiver access to David Chen',
          targetResource: 'consentGrants',
          action: 'consent_grant' as const,
          createdAt: Date.now() - 86400000 * 12,
        },
      ]

      for (const log of initialAudit) {
        await ctx.db.insert('auditLogs', log)
      }
    }

    return { success: true, message: 'Longitudinal clinical database seeded successfully.' }
  },
})

