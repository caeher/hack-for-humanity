import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { SYMPTOM_METHODOLOGY_VERSION } from './lib/symptomMethodology'

export const seedDatabase = mutation({
  args: {
    force: v.optional(v.boolean()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    // 0. Safety Guard: Prevent running in production environments
    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.CONVEX_ENVIRONMENT === 'production'
    if (isProd && !args.force) {
      throw new Error(
        'Safety guard: Database seeding is strictly restricted to development and demo environments.'
      )
    }

    // 1. Seed Organization
    let org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', q => q.eq('slug', 'oak-valley-health'))
      .first()

    if (!org) {
      const orgId = await ctx.db.insert('organizations', {
        name: 'Oak Valley Health Sports Medicine & Concussion Clinic',
        slug: 'oak-valley-health',
        retentionPolicyDays: 2555, // 7-year clinical retention policy
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

    // 2. Seed Users (Admin, Clinicians, Adult Patients, Pediatric Patient, Caregivers)
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
        createdAt: Date.now() - 86400000 * 10,
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
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|patient_leo',
        name: 'Leo Miller',
        email: 'leo.miller@example.com',
        role: 'patient' as const,
        status: 'Active' as const,
        lastActive: '45 min ago',
        createdAt: Date.now() - 86400000 * 11,
      },
      {
        tokenIdentifier: 'https://placeholder.clerk.accounts.dev|caregiver_sarah',
        name: 'Sarah Miller',
        email: 'sarah.miller@example.com',
        role: 'caregiver' as const,
        status: 'Active' as const,
        lastActive: '30 min ago',
        createdAt: Date.now() - 86400000 * 11,
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
    const leoUser = usersByEmail.get('leo.miller@example.com')!
    const sarahUser = usersByEmail.get('sarah.miller@example.com')!

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
        ageBand: '25-39' as const,
        timeZone: 'America/New_York',
        trackingRelationship: 'patient' as const,
        diagnosisStatus: 'yes' as const,
        communicationPreferences: {
          emailReminders: true,
          smsReminders: false,
          weeklySummary: true,
        },
        onboardingCompletedAt: Date.now() - 86400000 * 14,
        baselineCompletedAt: Date.now() - 86400000 * 14,
        status: 'Active' as const,
        notes: '[SIMULATED DEMO] Active recovery protocol; symptom-guided pacing.',
        createdAt: Date.now() - 86400000 * 14,
      },
      {
        userId: danielUser._id,
        orgId: org._id,
        primaryClinicianId: drBrooks._id,
        displayId: 'P-1038',
        preferredName: 'Daniel',
        dateOfBirth: '2001-09-24',
        ageBand: '18-24' as const,
        timeZone: 'America/Chicago',
        trackingRelationship: 'patient' as const,
        diagnosisStatus: 'unsure' as const,
        onboardingCompletedAt: Date.now() - 86400000 * 10,
        baselineCompletedAt: Date.now() - 86400000 * 10,
        status: 'Active' as const,
        notes: '[SIMULATED DEMO] Suspected acute concussion following cycling fall; review status.',
        createdAt: Date.now() - 86400000 * 10,
      },
      {
        userId: avaUser._id,
        orgId: org._id,
        primaryClinicianId: drVance._id,
        displayId: 'P-1031',
        preferredName: 'Ava',
        dateOfBirth: '1995-11-03',
        ageBand: '25-39' as const,
        timeZone: 'America/Los_Angeles',
        trackingRelationship: 'patient' as const,
        diagnosisStatus: 'yes' as const,
        onboardingCompletedAt: Date.now() - 86400000 * 22,
        baselineCompletedAt: Date.now() - 86400000 * 22,
        status: 'Active' as const,
        notes: '[SIMULATED DEMO] Concussion following low-speed motor vehicle collision; stable.',
        createdAt: Date.now() - 86400000 * 22,
      },
      {
        userId: jamesUser._id,
        orgId: org._id,
        primaryClinicianId: drBrooks._id,
        displayId: 'P-1027',
        preferredName: 'James',
        dateOfBirth: '2004-06-18',
        ageBand: '18-24' as const,
        timeZone: 'America/New_York',
        trackingRelationship: 'patient' as const,
        diagnosisStatus: 'no' as const,
        onboardingCompletedAt: Date.now() - 86400000 * 3,
        baselineCompletedAt: Date.now() - 86400000 * 3,
        status: 'Active' as const,
        notes: '[SIMULATED DEMO] Acute head impact during sports match; Tier 1 danger signs monitored.',
        createdAt: Date.now() - 86400000 * 3,
      },
      {
        userId: noraUser._id,
        orgId: org._id,
        primaryClinicianId: drVance._id,
        displayId: 'P-1019',
        preferredName: 'Nora',
        dateOfBirth: '1990-02-15',
        ageBand: '40-54' as const,
        timeZone: 'America/Denver',
        trackingRelationship: 'patient' as const,
        diagnosisStatus: 'yes' as const,
        onboardingCompletedAt: Date.now() - 86400000 * 35,
        baselineCompletedAt: Date.now() - 86400000 * 35,
        status: 'Active' as const,
        notes: '[SIMULATED DEMO] Persistent post-concussion symptoms >4 weeks.',
        createdAt: Date.now() - 86400000 * 35,
      },
      {
        userId: leoUser._id,
        orgId: org._id,
        primaryClinicianId: drVance._id,
        displayId: 'P-1055',
        preferredName: 'Leo',
        dateOfBirth: '2011-03-14', // Pediatric adolescent (15 years old)
        ageBand: '13-17' as const,
        timeZone: 'America/New_York',
        trackingRelationship: 'caregiver' as const,
        diagnosisStatus: 'yes' as const,
        onboardingCompletedAt: Date.now() - 86400000 * 11,
        baselineCompletedAt: Date.now() - 86400000 * 11,
        status: 'Active' as const,
        notes: '[SIMULATED DEMO] Adolescent Return-to-Learn protocol with academic accommodations.',
        createdAt: Date.now() - 86400000 * 11,
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
    const leoPatient = patientsByDisplayId.get('P-1055')!

    // 5. Seed Recovery Episodes
    const episodesData = [
      {
        patientId: mayaPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-19',
        injuryContext: '[SIMULATED DEMO] Sports collision (recreational soccer match)',
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
        incidentDate: '2026-08-23',
        injuryContext: '[SIMULATED DEMO] Cycling fall on paved trail',
        status: 'active' as const,
        riskLevel: 'Review' as const,
        baselineSymptomTotal: 34,
        adherenceRate: 71,
        startDate: '2026-08-23',
        createdAt: Date.now() - 86400000 * 9,
      },
      {
        patientId: avaPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-10',
        injuryContext: '[SIMULATED DEMO] Motor vehicle collision (rear-ended at red light)',
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
        incidentDate: '2026-08-30',
        injuryContext: '[SIMULATED DEMO] Direct head-to-head collision during basketball',
        status: 'active' as const,
        riskLevel: 'Elevated' as const,
        baselineSymptomTotal: 38,
        adherenceRate: 64,
        startDate: '2026-08-30',
        createdAt: Date.now() - 86400000 * 2,
      },
      {
        patientId: noraPatient._id,
        orgId: org._id,
        incidentDate: '2026-07-28',
        injuryContext: '[SIMULATED DEMO] Slip and fall with direct occipital impact',
        status: 'active' as const,
        riskLevel: 'Review' as const,
        baselineSymptomTotal: 30,
        adherenceRate: 89,
        startDate: '2026-07-28',
        createdAt: Date.now() - 86400000 * 34,
      },
      {
        patientId: leoPatient._id,
        orgId: org._id,
        incidentDate: '2026-08-22',
        injuryContext: '[SIMULATED DEMO] High-school soccer aerial challenge collision',
        status: 'active' as const,
        riskLevel: 'Stable' as const,
        baselineSymptomTotal: 32,
        adherenceRate: 90,
        startDate: '2026-08-22',
        createdAt: Date.now() - 86400000 * 10,
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
    const avaEpisode = episodesByPatientId.get(avaPatient._id)!
    const jamesEpisode = episodesByPatientId.get(jamesPatient._id)!
    const noraEpisode = episodesByPatientId.get(noraPatient._id)!
    const leoEpisode = episodesByPatientId.get(leoPatient._id)!

    // 6. Seed Consent Grants
    const consentGrantsData = [
      {
        patientId: mayaPatient._id,
        granteeUserId: davidUser._id,
        granteeRole: 'caregiver' as const,
        scopes: ['view_symptoms', 'view_trends', 'view_plan', 'receive_alerts'] as const,
        relationship: 'Spouse',
        status: 'active' as const,
        grantedAt: Date.now() - 86400000 * 12,
        expiresAt: Date.now() + 86400000 * 90,
      },
      {
        patientId: leoPatient._id,
        granteeUserId: sarahUser._id,
        granteeRole: 'caregiver' as const,
        scopes: ['view_symptoms', 'view_trends', 'view_plan', 'log_proxy', 'receive_alerts'] as const,
        relationship: 'Parent / Guardian',
        status: 'active' as const,
        grantedAt: Date.now() - 86400000 * 10,
        expiresAt: Date.now() + 86400000 * 180,
      },
    ]

    for (const cg of consentGrantsData) {
      const existing = await ctx.db
        .query('consentGrants')
        .withIndex('by_patientId_and_granteeUserId', q =>
          q.eq('patientId', cg.patientId).eq('granteeUserId', cg.granteeUserId)
        )
        .first()
      if (!existing) {
        await ctx.db.insert('consentGrants', {
          ...cg,
          scopes: [...cg.scopes],
        })
      }
    }

    // 7. Seed Longitudinal Check-Ins & Activity Exposures (10-14 days depth)
    // Trajectory 1: Maya Chen (P-1042) - Uncomplicated active recovery (14 days, 12 check-ins with 2 missing day gaps)
    const mayaCheckInHistory = [
      {
        date: '2026-08-19',
        symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 5, noiseSensitivity: 4, fatigue: 4, concentration: 1, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Initial injury evening; rested in dark room.',
        offsetDays: 13,
        cognitiveMinutes: 20,
        screenMinutes: 15,
        physicalExertionScore: 0,
        sleepHours: 6.5,
        sleepQuality: 3,
      },
      {
        date: '2026-08-20',
        symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 5, noiseSensitivity: 4, fatigue: 4, concentration: 1, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Clinical evaluation today. Advised 48h relative rest.',
        offsetDays: 12,
        cognitiveMinutes: 30,
        screenMinutes: 20,
        physicalExertionScore: 0,
        sleepHours: 7.0,
        sleepQuality: 4,
      },
      {
        date: '2026-08-21',
        symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Started symptom-guided walking breaks.',
        offsetDays: 11,
        cognitiveMinutes: 40,
        screenMinutes: 30,
        physicalExertionScore: 1,
        sleepHours: 7.2,
        sleepQuality: 4,
      },
      {
        date: '2026-08-22',
        symptoms: { headache: 5, dizziness: 4, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Short 15-min walk outside with sunglasses.',
        offsetDays: 10,
        cognitiveMinutes: 45,
        screenMinutes: 30,
        physicalExertionScore: 2,
        sleepHours: 7.5,
        sleepQuality: 5,
      },
      {
        date: '2026-08-23',
        symptoms: { headache: 5, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Light audio listening without screens.',
        offsetDays: 9,
        cognitiveMinutes: 60,
        screenMinutes: 35,
        physicalExertionScore: 2,
        sleepHours: 7.0,
        sleepQuality: 5,
      },
      // Note: 2026-08-24 skipped as an authentic missing day gap
      {
        date: '2026-08-25',
        symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Moderate headache after 20 mins of reading.',
        offsetDays: 7,
        cognitiveMinutes: 60,
        screenMinutes: 45,
        physicalExertionScore: 2,
        sleepHours: 6.8,
        sleepQuality: 4,
      },
      {
        date: '2026-08-26',
        symptoms: { headache: 5, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Resting in dim room helped.',
        offsetDays: 6,
        cognitiveMinutes: 70,
        screenMinutes: 45,
        physicalExertionScore: 2,
        sleepHours: 7.2,
        sleepQuality: 5,
      },
      {
        date: '2026-08-27',
        symptoms: { headache: 4, dizziness: 3, nausea: 2, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 4, concentration: 3, sleepDifficulty: 1 },
        activityImpact: 'not-sure' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Took afternoon rest break.',
        offsetDays: 5,
        cognitiveMinutes: 80,
        screenMinutes: 50,
        physicalExertionScore: 3,
        sleepHours: 7.4,
        sleepQuality: 6,
      },
      {
        date: '2026-08-28',
        symptoms: { headache: 5, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 3, fatigue: 3, concentration: 3, sleepDifficulty: 1 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Screen exposure during short email check coincided with mild headache.',
        offsetDays: 4,
        cognitiveMinutes: 90,
        screenMinutes: 65,
        physicalExertionScore: 3,
        sleepHours: 7.1,
        sleepQuality: 5,
      },
      {
        date: '2026-08-29',
        symptoms: { headache: 4, dizziness: 2, nausea: 1, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 3, concentration: 3, sleepDifficulty: 1 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Walked outside for 15 mins with sunglasses.',
        offsetDays: 3,
        cognitiveMinutes: 100,
        screenMinutes: 60,
        physicalExertionScore: 3,
        sleepHours: 7.8,
        sleepQuality: 7,
      },
      {
        date: '2026-08-30',
        symptoms: { headache: 3, dizziness: 2, nausea: 1, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 3, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Feeling clearer head today.',
        offsetDays: 2,
        cognitiveMinutes: 110,
        screenMinutes: 60,
        physicalExertionScore: 4,
        sleepHours: 7.9,
        sleepQuality: 7,
      },
      // Note: 2026-08-31 skipped as second authentic missing day gap (12 check-ins over 14 days)
      {
        date: '2026-09-01',
        symptoms: { headache: 2, dizziness: 2, nausea: 1, lightSensitivity: 2, noiseSensitivity: 2, fatigue: 3, concentration: 2, sleepDifficulty: 1 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Good energy morning; steady gradual recovery.',
        offsetDays: 0,
        cognitiveMinutes: 120,
        screenMinutes: 75,
        physicalExertionScore: 4,
        sleepHours: 8.1,
        sleepQuality: 8,
      },
    ]

    for (const item of mayaCheckInHistory) {
      const total = Object.values(item.symptoms).reduce((a, b) => a + b, 0)
      const existingCheckIn = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', mayaPatient._id).eq('date', item.date)
        )
        .first()

      let checkInId = existingCheckIn?._id
      if (!existingCheckIn) {
        checkInId = await ctx.db.insert('checkIns', {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          submittedByUserId: mayaUser._id,
          date: item.date,
          symptoms: item.symptoms,
          symptomTotal: total,
          methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
          activityImpact: item.activityImpact,
          dangerSignsPresent: item.dangerSignsPresent,
          dangerSigns: item.dangerSigns,
          note: item.note,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }

      // Seed matching activity exposure
      const existingExp = await ctx.db
        .query('activityExposures')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', mayaPatient._id).eq('date', item.date)
        )
        .first()

      if (!existingExp) {
        await ctx.db.insert('activityExposures', {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          checkInId,
          date: item.date,
          cognitiveMinutes: item.cognitiveMinutes,
          screenMinutes: item.screenMinutes,
          physicalExertionScore: item.physicalExertionScore,
          sleepHours: item.sleepHours,
          sleepQuality: item.sleepQuality,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }
    }

    // Trajectory 2: Daniel Ortiz (P-1038) - Professional Review Scenario (10 days, screen time & sleep correlation)
    const danielCheckInHistory = [
      {
        date: '2026-08-23',
        symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 5, noiseSensitivity: 4, fatigue: 5, concentration: 4, sleepDifficulty: 4 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Post-fall day 1. Severe neck and head stiffness.',
        offsetDays: 9,
        cognitiveMinutes: 30,
        screenMinutes: 30,
        physicalExertionScore: 0,
        sleepHours: 5.5,
        sleepQuality: 3,
      },
      {
        date: '2026-08-24',
        symptoms: { headache: 5, dizziness: 4, nausea: 3, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 4 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Light sensitivity persisting.',
        offsetDays: 8,
        cognitiveMinutes: 45,
        screenMinutes: 40,
        physicalExertionScore: 1,
        sleepHours: 6.0,
        sleepQuality: 4,
      },
      {
        date: '2026-08-25',
        symptoms: { headache: 4, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 3 },
        activityImpact: 'not-sure' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Slight easing of nausea.',
        offsetDays: 7,
        cognitiveMinutes: 60,
        screenMinutes: 60,
        physicalExertionScore: 1,
        sleepHours: 6.5,
        sleepQuality: 4,
      },
      {
        date: '2026-08-26',
        symptoms: { headache: 3, dizziness: 3, nausea: 2, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 4, concentration: 4, sleepDifficulty: 3 },
        activityImpact: 'not-sure' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Paced morning walk.',
        offsetDays: 6,
        cognitiveMinutes: 75,
        screenMinutes: 60,
        physicalExertionScore: 2,
        sleepHours: 6.8,
        sleepQuality: 5,
      },
      {
        date: '2026-08-27',
        symptoms: { headache: 3, dizziness: 3, nausea: 2, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 4, concentration: 3, sleepDifficulty: 3 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Feeling stabilized during morning.',
        offsetDays: 5,
        cognitiveMinutes: 90,
        screenMinutes: 70,
        physicalExertionScore: 2,
        sleepHours: 7.0,
        sleepQuality: 5,
      },
      {
        date: '2026-08-28',
        symptoms: { headache: 5, dizziness: 4, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 4 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Higher screen time (180 mins) coincided with headache increase from 3 to 5.',
        offsetDays: 4,
        cognitiveMinutes: 180,
        screenMinutes: 180,
        physicalExertionScore: 1,
        sleepHours: 5.2,
        sleepQuality: 3,
      },
      {
        date: '2026-08-29',
        symptoms: { headache: 5, dizziness: 4, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Persistent headache post screen day.',
        offsetDays: 3,
        cognitiveMinutes: 120,
        screenMinutes: 110,
        physicalExertionScore: 1,
        sleepHours: 6.0,
        sleepQuality: 4,
      },
      {
        date: '2026-08-30',
        symptoms: { headache: 4, dizziness: 4, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Rested in afternoon.',
        offsetDays: 2,
        cognitiveMinutes: 100,
        screenMinutes: 90,
        physicalExertionScore: 2,
        sleepHours: 6.5,
        sleepQuality: 4,
      },
      {
        date: '2026-08-31',
        symptoms: { headache: 5, dizziness: 4, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 4 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Late night work coincided with poor sleep and headache spike.',
        offsetDays: 1,
        cognitiveMinutes: 150,
        screenMinutes: 140,
        physicalExertionScore: 1,
        sleepHours: 5.0,
        sleepQuality: 3,
      },
      {
        date: '2026-09-01',
        symptoms: { headache: 5, dizziness: 4, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 4, sleepDifficulty: 4 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Plateaued symptoms over 4 days; flagged for clinician review.',
        offsetDays: 0,
        cognitiveMinutes: 130,
        screenMinutes: 120,
        physicalExertionScore: 1,
        sleepHours: 5.8,
        sleepQuality: 4,
      },
    ]

    for (const item of danielCheckInHistory) {
      const total = Object.values(item.symptoms).reduce((a, b) => a + b, 0)
      const existingCheckIn = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', danielPatient._id).eq('date', item.date)
        )
        .first()

      let checkInId = existingCheckIn?._id
      if (!existingCheckIn) {
        checkInId = await ctx.db.insert('checkIns', {
          patientId: danielPatient._id,
          episodeId: danielEpisode._id,
          submittedByUserId: danielUser._id,
          date: item.date,
          symptoms: item.symptoms,
          symptomTotal: total,
          methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
          activityImpact: item.activityImpact,
          dangerSignsPresent: item.dangerSignsPresent,
          dangerSigns: item.dangerSigns,
          note: item.note,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }

      const existingExp = await ctx.db
        .query('activityExposures')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', danielPatient._id).eq('date', item.date)
        )
        .first()

      if (!existingExp) {
        await ctx.db.insert('activityExposures', {
          patientId: danielPatient._id,
          episodeId: danielEpisode._id,
          checkInId,
          date: item.date,
          cognitiveMinutes: item.cognitiveMinutes,
          screenMinutes: item.screenMinutes,
          physicalExertionScore: item.physicalExertionScore,
          sleepHours: item.sleepHours,
          sleepQuality: item.sleepQuality,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }
    }

    // Trajectory 3: Leo Miller (P-1055) - Pediatric Adolescent Return-to-Learn (10 days)
    const leoCheckInHistory = [
      {
        date: '2026-08-23',
        symptoms: { headache: 5, dizziness: 4, nausea: 2, lightSensitivity: 5, noiseSensitivity: 5, fatigue: 5, concentration: 3, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Post soccer collision. Resting at home.',
        offsetDays: 9,
        cognitiveMinutes: 20,
        screenMinutes: 15,
        physicalExertionScore: 0,
        sleepHours: 8.5,
        sleepQuality: 4,
      },
      {
        date: '2026-08-24',
        symptoms: { headache: 5, dizziness: 3, nausea: 2, lightSensitivity: 5, noiseSensitivity: 4, fatigue: 5, concentration: 3, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Low light in room. Paced audio homework only.',
        offsetDays: 8,
        cognitiveMinutes: 30,
        screenMinutes: 20,
        physicalExertionScore: 0,
        sleepHours: 8.8,
        sleepQuality: 5,
      },
      {
        date: '2026-08-25',
        symptoms: { headache: 4, dizziness: 3, nausea: 2, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 3, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Brief walk in shaded park with mom.',
        offsetDays: 7,
        cognitiveMinutes: 40,
        screenMinutes: 25,
        physicalExertionScore: 1,
        sleepHours: 8.2,
        sleepQuality: 5,
      },
      {
        date: '2026-08-26',
        symptoms: { headache: 4, dizziness: 3, nausea: 1, lightSensitivity: 4, noiseSensitivity: 4, fatigue: 4, concentration: 3, sleepDifficulty: 2 },
        activityImpact: 'not-sure' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Light printed reading with 20-min breaks.',
        offsetDays: 6,
        cognitiveMinutes: 50,
        screenMinutes: 30,
        physicalExertionScore: 1,
        sleepHours: 8.5,
        sleepQuality: 6,
      },
      {
        date: '2026-08-27',
        symptoms: { headache: 3, dizziness: 3, nausea: 1, lightSensitivity: 4, noiseSensitivity: 3, fatigue: 4, concentration: 3, sleepDifficulty: 2 },
        activityImpact: 'not-sure' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Completed school accommodation plan with clinician.',
        offsetDays: 5,
        cognitiveMinutes: 60,
        screenMinutes: 30,
        physicalExertionScore: 2,
        sleepHours: 8.6,
        sleepQuality: 6,
      },
      {
        date: '2026-08-28',
        symptoms: { headache: 4, dizziness: 3, nausea: 1, lightSensitivity: 5, noiseSensitivity: 4, fatigue: 4, concentration: 3, sleepDifficulty: 2 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Attended 2 morning classes with sunglasses; classroom lights bright.',
        offsetDays: 4,
        cognitiveMinutes: 90,
        screenMinutes: 40,
        physicalExertionScore: 1,
        sleepHours: 8.0,
        sleepQuality: 5,
      },
      {
        date: '2026-08-29',
        symptoms: { headache: 3, dizziness: 2, nausea: 1, lightSensitivity: 4, noiseSensitivity: 3, fatigue: 4, concentration: 3, sleepDifficulty: 2 },
        activityImpact: 'not-sure' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Weekend rest day. Light family walk.',
        offsetDays: 3,
        cognitiveMinutes: 60,
        screenMinutes: 30,
        physicalExertionScore: 2,
        sleepHours: 9.0,
        sleepQuality: 7,
      },
      {
        date: '2026-08-30',
        symptoms: { headache: 3, dizziness: 2, nausea: 1, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 4, concentration: 2, sleepDifficulty: 2 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Feeling clearer; organized school binders.',
        offsetDays: 2,
        cognitiveMinutes: 70,
        screenMinutes: 35,
        physicalExertionScore: 2,
        sleepHours: 8.7,
        sleepQuality: 7,
      },
      {
        date: '2026-08-31',
        symptoms: { headache: 2, dizziness: 2, nausea: 1, lightSensitivity: 3, noiseSensitivity: 3, fatigue: 3, concentration: 2, sleepDifficulty: 2 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Half-day school with rest period between period 2 and 3.',
        offsetDays: 1,
        cognitiveMinutes: 100,
        screenMinutes: 45,
        physicalExertionScore: 2,
        sleepHours: 8.5,
        sleepQuality: 8,
      },
      {
        date: '2026-09-01',
        symptoms: { headache: 2, dizziness: 2, nausea: 1, lightSensitivity: 2, noiseSensitivity: 2, fatigue: 3, concentration: 2, sleepDifficulty: 2 },
        activityImpact: 'no' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] Steady progress on Return-to-Learn Stage 3.',
        offsetDays: 0,
        cognitiveMinutes: 110,
        screenMinutes: 50,
        physicalExertionScore: 3,
        sleepHours: 8.8,
        sleepQuality: 8,
      },
    ]

    for (const item of leoCheckInHistory) {
      const total = Object.values(item.symptoms).reduce((a, b) => a + b, 0)
      const existingCheckIn = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', leoPatient._id).eq('date', item.date)
        )
        .first()

      let checkInId = existingCheckIn?._id
      if (!existingCheckIn) {
        checkInId = await ctx.db.insert('checkIns', {
          patientId: leoPatient._id,
          episodeId: leoEpisode._id,
          submittedByUserId: sarahUser._id, // Logged by caregiver proxy Sarah Miller
          date: item.date,
          symptoms: item.symptoms,
          symptomTotal: total,
          methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
          activityImpact: item.activityImpact,
          dangerSignsPresent: item.dangerSignsPresent,
          dangerSigns: item.dangerSigns,
          note: item.note,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }

      const existingExp = await ctx.db
        .query('activityExposures')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', leoPatient._id).eq('date', item.date)
        )
        .first()

      if (!existingExp) {
        await ctx.db.insert('activityExposures', {
          patientId: leoPatient._id,
          episodeId: leoEpisode._id,
          checkInId,
          date: item.date,
          cognitiveMinutes: item.cognitiveMinutes,
          screenMinutes: item.screenMinutes,
          physicalExertionScore: item.physicalExertionScore,
          sleepHours: item.sleepHours,
          sleepQuality: item.sleepQuality,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }
    }

    // Trajectory 4: James Kim (P-1027) - Safety Engine Trigger Scenario (Acute Tier 1 Danger Signs)
    const jamesCheckInHistory = [
      {
        date: '2026-08-30',
        symptoms: { headache: 6, dizziness: 5, nausea: 5, lightSensitivity: 5, noiseSensitivity: 5, fatigue: 5, concentration: 4, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: false,
        dangerSigns: [],
        note: '[SIMULATED DEMO] High-impact collision in basketball.',
        offsetDays: 2,
        cognitiveMinutes: 10,
        screenMinutes: 10,
        physicalExertionScore: 0,
        sleepHours: 5.0,
        sleepQuality: 2,
      },
      {
        date: '2026-08-31',
        symptoms: { headache: 6, dizziness: 6, nausea: 6, lightSensitivity: 6, noiseSensitivity: 5, fatigue: 5, concentration: 3, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: true,
        dangerSigns: [
          'Repeated vomiting or nausea',
          'Extreme drowsiness, loss of consciousness, or inability to wake up',
        ],
        note: '[SIMULATED DEMO] Recurrent vomiting and extreme drowsiness. Emergency UI intercept presented.',
        offsetDays: 1,
        cognitiveMinutes: 0,
        screenMinutes: 5,
        physicalExertionScore: 0,
        sleepHours: 4.5,
        sleepQuality: 1,
      },
      {
        date: '2026-09-01',
        symptoms: { headache: 5, dizziness: 5, nausea: 4, lightSensitivity: 5, noiseSensitivity: 5, fatigue: 5, concentration: 4, sleepDifficulty: 3 },
        activityImpact: 'yes' as const,
        dangerSignsPresent: true,
        dangerSigns: ['Repeated vomiting or nausea'],
        note: '[SIMULATED DEMO] Hospital evaluation completed; CT scan negative; under close observation.',
        offsetDays: 0,
        cognitiveMinutes: 10,
        screenMinutes: 10,
        physicalExertionScore: 0,
        sleepHours: 6.0,
        sleepQuality: 3,
      },
    ]

    for (const item of jamesCheckInHistory) {
      const total = Object.values(item.symptoms).reduce((a, b) => a + b, 0)
      const existingCheckIn = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', jamesPatient._id).eq('date', item.date)
        )
        .first()

      let checkInId = existingCheckIn?._id
      if (!existingCheckIn) {
        checkInId = await ctx.db.insert('checkIns', {
          patientId: jamesPatient._id,
          episodeId: jamesEpisode._id,
          submittedByUserId: jamesUser._id,
          date: item.date,
          symptoms: item.symptoms,
          symptomTotal: total,
          methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
          activityImpact: item.activityImpact,
          dangerSignsPresent: item.dangerSignsPresent,
          dangerSigns: item.dangerSigns,
          note: item.note,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }

      const existingExp = await ctx.db
        .query('activityExposures')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', jamesPatient._id).eq('date', item.date)
        )
        .first()

      if (!existingExp) {
        await ctx.db.insert('activityExposures', {
          patientId: jamesPatient._id,
          episodeId: jamesEpisode._id,
          checkInId,
          date: item.date,
          cognitiveMinutes: item.cognitiveMinutes,
          screenMinutes: item.screenMinutes,
          physicalExertionScore: item.physicalExertionScore,
          sleepHours: item.sleepHours,
          sleepQuality: item.sleepQuality,
          createdAt: Date.now() - item.offsetDays * 86400000,
        })
      }
    }

    // 8. Seed Recovery Trends for Maya Chen, Daniel Ortiz, Leo Miller
    const mayaTrends = [
      { date: '2026-08-25', dayLabel: 'Aug 25', symptomTotal: 27, headacheRating: 5, sleepQuality: 4 },
      { date: '2026-08-26', dayLabel: 'Aug 26', symptomTotal: 25, headacheRating: 5, sleepQuality: 5 },
      { date: '2026-08-27', dayLabel: 'Aug 27', symptomTotal: 23, headacheRating: 4, sleepQuality: 6 },
      { date: '2026-08-28', dayLabel: 'Aug 28', symptomTotal: 24, headacheRating: 5, sleepQuality: 5 },
      { date: '2026-08-29', dayLabel: 'Aug 29', symptomTotal: 20, headacheRating: 4, sleepQuality: 7 },
      { date: '2026-08-30', dayLabel: 'Aug 30', symptomTotal: 18, headacheRating: 3, sleepQuality: 7 },
      { date: '2026-09-01', dayLabel: 'Today', symptomTotal: 15, headacheRating: 2, sleepQuality: 8 },
    ]

    for (const t of mayaTrends) {
      const existing = await ctx.db
        .query('recoveryTrends')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', mayaPatient._id).eq('date', t.date)
        )
        .first()

      if (!existing) {
        await ctx.db.insert('recoveryTrends', {
          patientId: mayaPatient._id,
          episodeId: mayaEpisode._id,
          date: t.date,
          dayLabel: t.dayLabel,
          symptomTotal: t.symptomTotal,
          methodologyVersion: SYMPTOM_METHODOLOGY_VERSION,
          headacheRating: t.headacheRating,
          sleepQuality: t.sleepQuality,
          createdAt: Date.now(),
        })
      }
    }

    // 9. Seed Alerts (High Tier 1 Trigger, Medium Pattern Review, Low Informational)
    const alertsData = [
      {
        patientId: jamesPatient._id,
        episodeId: jamesEpisode._id,
        orgId: org._id,
        detail: '[SIMULATED DEMO] Self-reported repeated vomiting and acute drowsiness; Tier 1 emergency guidance displayed.',
        severity: 'High' as const,
        status: 'active' as const,
        dangerSigns: [
          'Repeated vomiting or nausea',
          'Extreme drowsiness, loss of consciousness, or inability to wake up',
        ],
        createdAt: Date.now() - 18 * 60 * 1000,
      },
      {
        patientId: danielPatient._id,
        episodeId: danielEpisode._id,
        orgId: org._id,
        detail: '[SIMULATED DEMO] Headache rating increased 3 points in 24 hours coinciding with elevated screen exposure.',
        severity: 'Medium' as const,
        status: 'active' as const,
        createdAt: Date.now() - 60 * 60 * 1000,
      },
      {
        patientId: mayaPatient._id,
        episodeId: mayaEpisode._id,
        orgId: org._id,
        detail: '[SIMULATED DEMO] Sleep quality below baseline for 3 nights; sleep hygiene pacing recommended.',
        severity: 'Low' as const,
        status: 'acknowledged' as const,
        acknowledgedByUserId: drBrooks._id,
        createdAt: Date.now() - 3 * 60 * 60 * 1000,
      },
      {
        patientId: leoPatient._id,
        episodeId: leoEpisode._id,
        orgId: org._id,
        detail: '[SIMULATED DEMO] Classroom light sensitivity reported during initial school return; accommodation protocol active.',
        severity: 'Low' as const,
        status: 'resolved' as const,
        resolvedByUserId: drVance._id,
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
      },
    ]

    for (const a of alertsData) {
      const existing = await ctx.db
        .query('alerts')
        .withIndex('by_patientId', q => q.eq('patientId', a.patientId))
        .filter(q => q.eq(q.field('detail'), a.detail))
        .first()

      if (!existing) {
        await ctx.db.insert('alerts', a)
      }
    }

    // 10. Seed Care Plans
    const carePlansData = [
      // Maya Chen (Adult active recovery)
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
      // Leo Miller (Adolescent Return-to-Learn)
      {
        patientId: leoPatient._id,
        episodeId: leoEpisode._id,
        assignedByUserId: drVance._id,
        title: 'Morning symptom check-in with caregiver',
        category: 'check_in' as const,
        targetTime: '07:30 AM',
        completed: true,
        dayNumber: 10,
        createdAt: Date.now() - 86400000 * 1,
      },
      {
        patientId: leoPatient._id,
        episodeId: leoEpisode._id,
        assignedByUserId: drVance._id,
        title: 'Return-to-Learn Stage 3: Half-day classes with rest breaks',
        category: 'accommodations' as const,
        targetTime: '08:30 AM',
        completed: true,
        dayNumber: 10,
        createdAt: Date.now() - 86400000 * 1,
      },
      {
        patientId: leoPatient._id,
        episodeId: leoEpisode._id,
        assignedByUserId: drVance._id,
        title: 'Printed study materials and low-stimulation hallway transit',
        category: 'accommodations' as const,
        targetTime: '11:00 AM',
        completed: true,
        dayNumber: 10,
        createdAt: Date.now() - 86400000 * 1,
      },
      {
        patientId: leoPatient._id,
        episodeId: leoEpisode._id,
        assignedByUserId: drVance._id,
        title: 'Non-contact stationary cycling (10 min symptom-free)',
        category: 'physical_activity' as const,
        targetTime: '03:30 PM',
        completed: false,
        dayNumber: 10,
        createdAt: Date.now() - 86400000 * 1,
      },
    ]

    for (const task of carePlansData) {
      const existing = await ctx.db
        .query('carePlans')
        .withIndex('by_patientId', q => q.eq('patientId', task.patientId))
        .filter(q => q.eq(q.field('title'), task.title))
        .first()

      if (!existing) {
        await ctx.db.insert('carePlans', task)
      }
    }

    // 11. Seed Clinical Encounters
    const clinicalEncountersData = [
      {
        patientId: mayaPatient._id,
        episodeId: mayaEpisode._id,
        orgId: org._id,
        clinicianUserId: drBrooks._id,
        encounterType: 'in-person' as const,
        diagnosis: '[SIMULATED DEMO] Diagnosed mild traumatic brain injury (concussion), active recovery stage',
        datetime: '2026-08-20 10:30',
        clinicalSummary: '[SIMULATED DEMO] Initial post-injury clinical encounter. Graduated pacing protocol initiated.',
        notes: '[SIMULATED DEMO] Patient presented with headache (5/6) and light sensitivity (4/6) post soccer collision. Recommended symptom-limited cognitive pacing, 48h relative rest, and daily CRI logging.',
        createdAt: Date.now() - 86400000 * 12,
      },
      {
        patientId: mayaPatient._id,
        episodeId: mayaEpisode._id,
        orgId: org._id,
        clinicianUserId: drBrooks._id,
        encounterType: 'telehealth' as const,
        diagnosis: '[SIMULATED DEMO] Concussion follow-up; uncomplicated trajectory',
        datetime: '2026-08-28 11:15',
        clinicalSummary: '[SIMULATED DEMO] Longitudinal trajectory review. Downward symptom trend confirmed.',
        notes: '[SIMULATED DEMO] Symptom total decreased from baseline 27 to 24. Screen tolerance improving. Reinforced non-pharmacological pacing.',
        createdAt: Date.now() - 86400000 * 4,
      },
      {
        patientId: danielPatient._id,
        episodeId: danielEpisode._id,
        orgId: org._id,
        clinicianUserId: drBrooks._id,
        encounterType: 'telehealth' as const,
        diagnosis: '[SIMULATED DEMO] Suspected acute concussion following cycling accident',
        datetime: '2026-08-24 14:00',
        clinicalSummary: '[SIMULATED DEMO] Telehealth triage evaluation.',
        notes: '[SIMULATED DEMO] Discussed screen moderation and hydration. Instructed patient on Tier 1 emergency danger signs and review criteria.',
        createdAt: Date.now() - 86400000 * 8,
      },
      {
        patientId: leoPatient._id,
        episodeId: leoEpisode._id,
        orgId: org._id,
        clinicianUserId: drVance._id,
        encounterType: 'in-person' as const,
        diagnosis: '[SIMULATED DEMO] Adolescent concussion; Return-to-Learn management',
        datetime: '2026-08-25 15:30',
        clinicalSummary: '[SIMULATED DEMO] Pediatric concussion encounter with parent/caregiver.',
        notes: '[SIMULATED DEMO] Evaluated 15-year-old student athlete. Issued 4-stage Return-to-Learn school accommodation letter. Proxy logging authorized for caregiver Sarah Miller.',
        createdAt: Date.now() - 86400000 * 7,
      },
      {
        patientId: jamesPatient._id,
        episodeId: jamesEpisode._id,
        orgId: org._id,
        clinicianUserId: drBrooks._id,
        encounterType: 'in-person' as const,
        diagnosis: '[SIMULATED DEMO] Acute head injury under emergency evaluation',
        datetime: '2026-08-31 20:00',
        clinicalSummary: '[SIMULATED DEMO] Emergency handoff review following Tier 1 danger sign alert.',
        notes: '[SIMULATED DEMO] Evaluated following reported recurrent emesis and severe drowsiness. Emergency neuroimaging confirmed no acute intracranial bleed. Strict 72h close monitoring plan established.',
        createdAt: Date.now() - 86400000 * 1,
      },
      {
        patientId: noraPatient._id,
        episodeId: noraEpisode._id,
        orgId: org._id,
        clinicianUserId: drVance._id,
        encounterType: 'in-person' as const,
        diagnosis: '[SIMULATED DEMO] Persistent post-concussion symptoms (>4 weeks)',
        datetime: '2026-08-15 09:00',
        clinicalSummary: '[SIMULATED DEMO] Persistent symptom multidisciplinary review.',
        notes: '[SIMULATED DEMO] Sub-symptom threshold exercise and vestibular-ocular therapy coordination discussed. Emphasized gradual autonomic recovery.',
        createdAt: Date.now() - 86400000 * 17,
      },
    ]

    for (const enc of clinicalEncountersData) {
      const existing = await ctx.db
        .query('clinicalEncounters')
        .withIndex('by_patientId', q => q.eq('patientId', enc.patientId))
        .filter(q => q.eq(q.field('datetime'), enc.datetime))
        .first()

      if (!existing) {
        await ctx.db.insert('clinicalEncounters', enc)
      }
    }

    // 12. Seed Messages
    const messagesData = [
      // Thread 1: Maya Chen Care Team
      {
        threadId: 'thread_maya_careteam',
        senderUserId: drBrooks._id,
        recipientUserId: mayaUser._id,
        patientId: mayaPatient._id,
        orgId: org._id,
        content: '[SIMULATED DEMO] Hi Maya, I reviewed your recent check-in trend. Your symptom totals are decreasing steadily. Remember to keep screen intervals under 30 minutes.',
        createdAt: Date.now() - 86400000 * 2,
        read: true,
      },
      {
        threadId: 'thread_maya_careteam',
        senderUserId: mayaUser._id,
        recipientUserId: drBrooks._id,
        patientId: mayaPatient._id,
        orgId: org._id,
        content: '[SIMULATED DEMO] Thank you Dr. Brooks! The 20-minute walking breaks have been very helpful.',
        createdAt: Date.now() - 86400000 * 1,
        read: true,
      },
      {
        threadId: 'thread_maya_careteam',
        senderUserId: davidUser._id,
        recipientUserId: drBrooks._id,
        patientId: mayaPatient._id,
        orgId: org._id,
        content: '[SIMULATED DEMO] Dr. Brooks, Maya rested well yesterday afternoon and did not report any dizziness after dinner.',
        createdAt: Date.now() - 3600000 * 5,
        read: false,
      },
      // Thread 2: Leo Miller Care Team (Pediatric / Return-to-Learn)
      {
        threadId: 'thread_leo_careteam',
        senderUserId: drVance._id,
        recipientUserId: sarahUser._id,
        patientId: leoPatient._id,
        orgId: org._id,
        content: '[SIMULATED DEMO] Hello Sarah, I uploaded Leo’s updated Return-to-Learn accommodation form. The school nurse has received the copy allowing 15-minute rest breaks.',
        createdAt: Date.now() - 86400000 * 3,
        read: true,
      },
      {
        threadId: 'thread_leo_careteam',
        senderUserId: sarahUser._id,
        recipientUserId: drVance._id,
        patientId: leoPatient._id,
        orgId: org._id,
        content: '[SIMULATED DEMO] Thank you Dr. Vance. Leo completed his half day today and wore his sunglasses during the sunny commute home.',
        createdAt: Date.now() - 86400000 * 1,
        read: true,
      },
      // Thread 3: Daniel Ortiz Care Team
      {
        threadId: 'thread_daniel_careteam',
        senderUserId: drBrooks._id,
        recipientUserId: danielUser._id,
        patientId: danielPatient._id,
        orgId: org._id,
        content: '[SIMULATED DEMO] Daniel, we noticed a temporary symptom increase on your check-in following extended screen time. Let’s enforce a 9 PM screen cutoff this week.',
        createdAt: Date.now() - 3600000 * 8,
        read: true,
      },
    ]

    for (const msg of messagesData) {
      const existing = await ctx.db
        .query('messages')
        .withIndex('by_threadId', q => q.eq('threadId', msg.threadId))
        .filter(q => q.eq(q.field('content'), msg.content))
        .first()

      if (!existing) {
        await ctx.db.insert('messages', msg)
      }
    }

    // 13. Seed Immutable Audit Logs
    const auditLogsData = [
      {
        actorUserId: drBrooks._id,
        actorRole: 'clinician',
        orgId: org._id,
        patientId: mayaPatient._id,
        event: '[SIMULATED DEMO] Viewed longitudinal recovery summary report for Maya Chen',
        targetResource: 'reports',
        resourceId: mayaPatient._id,
        action: 'read' as const,
        createdAt: Date.now() - 10000,
      },
      {
        actorUserId: adminUser._id,
        actorRole: 'admin',
        orgId: org._id,
        event: '[SIMULATED DEMO] Invited clinician user dr.vance@example.com',
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
        event: '[SIMULATED DEMO] Granted caregiver access to David Chen',
        targetResource: 'consentGrants',
        action: 'consent_grant' as const,
        createdAt: Date.now() - 86400000 * 12,
      },
      {
        actorUserId: sarahUser._id,
        actorRole: 'caregiver',
        orgId: org._id,
        patientId: leoPatient._id,
        event: '[SIMULATED DEMO] Logged proxy daily check-in for Leo Miller',
        targetResource: 'checkIns',
        action: 'create' as const,
        createdAt: Date.now() - 86400000 * 1,
      },
      {
        actorUserId: drVance._id,
        actorRole: 'clinician',
        orgId: org._id,
        patientId: leoPatient._id,
        event: '[SIMULATED DEMO] Documented Return-to-Learn clinical encounter note',
        targetResource: 'clinicalEncounters',
        action: 'create' as const,
        createdAt: Date.now() - 86400000 * 7,
      },
      {
        actorUserId: adminUser._id,
        actorRole: 'admin',
        orgId: org._id,
        event: '[SIMULATED DEMO] Exported de-identified cohort compliance metrics',
        targetResource: 'cohorts',
        action: 'read' as const,
        createdAt: Date.now() - 86400000 * 5,
      },
    ]

    for (const log of auditLogsData) {
      const existing = await ctx.db
        .query('auditLogs')
        .withIndex('by_actorUserId', q => q.eq('actorUserId', log.actorUserId))
        .filter(q => q.eq(q.field('event'), log.event))
        .first()

      if (!existing) {
        await ctx.db.insert('auditLogs', log)
      }
    }

    return {
      success: true,
      message:
        'Longitudinal clinical database seeded successfully with deterministic adult and pediatric concussion records.',
    }
  },
})
