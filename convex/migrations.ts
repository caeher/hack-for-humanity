import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { requireRole, requireUser } from './lib/auth'
import { CDC_DANGER_SIGNS, validateConcussionSymptoms } from './lib/businessLogic'

/**
 * Type definitions for Legacy Post-Surgical Records
 */
export interface LegacyPatientInput {
  displayId: string
  name: string
  preferredName?: string
  dateOfBirth?: string
  procedure: string // Legacy orthopedic procedure (e.g. 'ACL Reconstruction', 'Total Knee Arthroplasty')
  surgeon: string // Legacy unlinked surgeon string (e.g. 'Dr. Olivia Brooks')
  surgeryDate: string // Legacy surgery date (e.g. '2026-08-19')
  status?: 'Active' | 'Discharged' | 'Inactive'
  notes?: string
}

export interface LegacyCheckInInput {
  patientDisplayId: string
  date: string
  painScore: number // Legacy 0-10 pain score
  mobilityScore: number // Legacy 0-100 mobility score
  sleepScore: number // Legacy 0-100 sleep score
  emotionalScore: number // Legacy 0-100 emotional score
  recoveryScore?: number // Legacy unvalidated 0-100 composite recovery score
  notes?: string
}

export interface LegacyCarePlanInput {
  patientDisplayId: string
  title: string
  category: 'wound_care' | 'physical_therapy' | 'medication' | 'appointment' | 'check_in' | string
  targetTime?: string
  completed?: boolean
  dayNumber?: number
}

export interface LegacyDatasetPayload {
  organizationSlug: string
  patients: LegacyPatientInput[]
  checkIns: LegacyCheckInInput[]
  carePlans: LegacyCarePlanInput[]
}

/**
 * Pure Transformation: Map legacy procedure and surgeryDate to concussion episode context.
 */
export function transformLegacyPatientToConcussion(
  legacy: LegacyPatientInput,
  matchedClinicianUserId?: any
) {
  // Concussion injury context mapping
  const normalizedInjuryContext = legacy.procedure.toLowerCase().includes('concussion') ||
    legacy.procedure.toLowerCase().includes('tbi') ||
    legacy.procedure.toLowerCase().includes('head')
    ? legacy.procedure
    : `Concussion recovery protocol (migrated from legacy context: ${legacy.procedure})`

  return {
    patientProfile: {
      displayId: legacy.displayId,
      preferredName: legacy.preferredName ?? legacy.name.split(' ')[0],
      dateOfBirth: legacy.dateOfBirth,
      primaryClinicianId: matchedClinicianUserId,
      status: legacy.status ?? ('Active' as const),
      notes: legacy.notes ? `[Migrated Record] ${legacy.notes}` : 'Migrated from legacy clinical record.',
    },
    recoveryEpisode: {
      incidentDate: legacy.surgeryDate, // Concussion incident date replaces surgeryDate
      startDate: legacy.surgeryDate,
      injuryContext: normalizedInjuryContext,
      status: 'active' as const,
      riskLevel: 'Stable' as const,
    },
  }
}

/**
 * Pure Transformation: Map legacy 4-domain scores to 8-symptom Likert (0-6) inventory and derived symptom total (0-48).
 */
export function transformLegacyCheckInToConcussion(legacy: LegacyCheckInInput) {
  // Normalize 0-10 pain to 0-6 headache Likert
  const headache = Math.min(6, Math.max(0, Math.round((legacy.painScore / 10) * 6)))

  // Invert 0-100 mobility to 0-6 dizziness / balance difficulty Likert
  const dizziness = Math.min(6, Math.max(0, Math.round(((100 - legacy.mobilityScore) / 100) * 6)))

  // Map nausea scaled from pain / systemic symptoms
  const nausea = Math.min(6, Math.max(0, Math.round((legacy.painScore / 10) * 4)))

  // Map light & noise sensitivity
  const lightSensitivity = Math.min(6, Math.max(0, Math.round((legacy.painScore / 10) * 5)))
  const noiseSensitivity = Math.min(6, Math.max(0, Math.round((legacy.painScore / 10) * 5)))

  // Invert sleepScore to sleepDifficulty Likert (0-6)
  const sleepDifficulty = Math.min(6, Math.max(0, Math.round(((100 - legacy.sleepScore) / 100) * 6)))

  // Invert emotionalScore to fatigue and concentration difficulty Likert (0-6)
  const fatigue = Math.min(6, Math.max(0, Math.round(((100 - legacy.emotionalScore) / 100) * 6)))
  const concentration = Math.min(6, Math.max(0, Math.round(((100 - legacy.emotionalScore) / 100) * 5)))

  const symptoms = {
    headache,
    dizziness,
    nausea,
    lightSensitivity,
    noiseSensitivity,
    fatigue,
    concentration,
    sleepDifficulty,
  }

  // Derive exact 0-48 patient-reported symptom total
  const symptomTotal = validateConcussionSymptoms(symptoms)

  const activityImpact = dizziness >= 3 || headache >= 4 ? ('yes' as const) : ('no' as const)

  return {
    date: legacy.date,
    symptoms,
    symptomTotal,
    activityImpact,
    dangerSignsPresent: false,
    dangerSigns: [],
    note: legacy.notes ? `[Migrated] ${legacy.notes}` : undefined,
  }
}

/**
 * Pure Transformation: Map legacy care-plan category to concussion recovery pacing category.
 */
export function transformLegacyCarePlanCategory(category: string): {
  category: 'cognitive_pacing' | 'physical_activity' | 'sleep_hygiene' | 'medication' | 'check_in' | 'appointment' | 'education' | 'accommodations'
  titleTransform?: (title: string) => string
} {
  switch (category.toLowerCase()) {
    case 'wound_care':
      return {
        category: 'cognitive_pacing',
        titleTransform: title => title.replace(/(?:wound|incision)(?:\s+dressing)?/gi, 'cognitive pacing rest break'),
      }
    case 'physical_therapy':
      return {
        category: 'physical_activity',
        titleTransform: title => title.replace(/flexion|extension|quad/gi, 'light symptom-free walking'),
      }
    case 'education':
      return { category: 'education' }
    case 'school_accommodations':
    case 'work_accommodations':
    case 'accommodations':
      return { category: 'accommodations' }
    case 'medication':
      return { category: 'medication' }
    case 'appointment':
      return { category: 'appointment' }
    case 'check_in':
    default:
      return { category: 'check_in' }
  }
}

/**
 * Migration Runner: Migrate a legacy payload into the active concussion schema.
 * Restricted to administrators.
 */
export const migrateLegacyDataset = mutation({
  args: {
    organizationSlug: v.string(),
    patients: v.array(
      v.object({
        displayId: v.string(),
        name: v.string(),
        preferredName: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        procedure: v.string(),
        surgeon: v.string(),
        surgeryDate: v.string(),
        status: v.optional(v.union(v.literal('Active'), v.literal('Discharged'), v.literal('Inactive'))),
        notes: v.optional(v.string()),
      })
    ),
    checkIns: v.array(
      v.object({
        patientDisplayId: v.string(),
        date: v.string(),
        painScore: v.number(),
        mobilityScore: v.number(),
        sleepScore: v.number(),
        emotionalScore: v.number(),
        recoveryScore: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
    carePlans: v.array(
      v.object({
        patientDisplayId: v.string(),
        title: v.string(),
        category: v.string(),
        targetTime: v.optional(v.string()),
        completed: v.optional(v.boolean()),
        dayNumber: v.optional(v.number()),
      })
    ),
  },
  returns: v.object({
    success: v.boolean(),
    migratedPatients: v.number(),
    migratedEpisodes: v.number(),
    migratedCheckIns: v.number(),
    migratedCarePlans: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const { user: actor } = await requireRole(ctx, ['admin'])

    const org = await ctx.db
      .query('organizations')
      .withIndex('by_slug', q => q.eq('slug', args.organizationSlug))
      .first()

    if (!org) {
      throw new Error(`Organization with slug ${args.organizationSlug} not found.`)
    }

    // Build index of clinicians by name for ID-based linkage
    const allUsers = await ctx.db.query('users').collect()
    const cliniciansByName = new Map<string, typeof allUsers[0]>()
    for (const u of allUsers) {
      if (u.role === 'clinician') {
        cliniciansByName.set(u.name.toLowerCase(), u)
      }
    }

    const patientMap = new Map<string, any>()
    const episodeMap = new Map<string, any>()
    let migratedPatients = 0
    let migratedEpisodes = 0
    let migratedCheckIns = 0
    let migratedCarePlans = 0

    // 1. Process and Insert Patients & Recovery Episodes
    for (const legacyP of args.patients) {
      // Find matching clinician ID
      const matchedClinician = cliniciansByName.get(legacyP.surgeon.toLowerCase())

      // Ensure a placeholder user exists for this patient if not already present
      const patientUserEmail = `${legacyP.displayId.toLowerCase()}@migration.local`
      let patientUser = await ctx.db
        .query('users')
        .withIndex('by_email', q => q.eq('email', patientUserEmail))
        .first()

      if (!patientUser) {
        const userId = await ctx.db.insert('users', {
          tokenIdentifier: `migration|${legacyP.displayId}`,
          name: legacyP.name,
          email: patientUserEmail,
          role: 'patient',
          status: legacyP.status === 'Inactive' ? ('Suspended' as const) : ('Active' as const),
          createdAt: Date.now(),
        })
        patientUser = (await ctx.db.get(userId))!
      }

      const { patientProfile, recoveryEpisode } = transformLegacyPatientToConcussion(
        legacyP,
        matchedClinician?._id
      )

      // Upsert patient
      let patient = await ctx.db
        .query('patients')
        .withIndex('by_displayId', q => q.eq('displayId', legacyP.displayId))
        .first()

      if (!patient) {
        const pId = await ctx.db.insert('patients', {
          userId: patientUser._id,
          orgId: org._id,
          displayId: patientProfile.displayId,
          preferredName: patientProfile.preferredName,
          dateOfBirth: patientProfile.dateOfBirth,
          primaryClinicianId: patientProfile.primaryClinicianId,
          status: patientProfile.status,
          notes: patientProfile.notes,
          createdAt: Date.now(),
        })
        patient = (await ctx.db.get(pId))!
        migratedPatients++
      }

      patientMap.set(legacyP.displayId, patient)

      // Upsert Recovery Episode
      let episode = await ctx.db
        .query('recoveryEpisodes')
        .withIndex('by_patientId', q => q.eq('patientId', patient!._id))
        .first()

      if (!episode) {
        const epId = await ctx.db.insert('recoveryEpisodes', {
          patientId: patient._id,
          orgId: org._id,
          incidentDate: recoveryEpisode.incidentDate,
          injuryContext: recoveryEpisode.injuryContext,
          status: recoveryEpisode.status,
          riskLevel: recoveryEpisode.riskLevel,
          startDate: recoveryEpisode.startDate,
          createdAt: Date.now(),
        })
        episode = (await ctx.db.get(epId))!
        migratedEpisodes++
      }

      episodeMap.set(legacyP.displayId, episode)
    }

    // 2. Process and Insert Check-Ins
    for (const legacyC of args.checkIns) {
      const patient = patientMap.get(legacyC.patientDisplayId)
      const episode = episodeMap.get(legacyC.patientDisplayId)
      if (!patient) continue

      const checkInTransformed = transformLegacyCheckInToConcussion(legacyC)

      // Avoid duplicates for same patient on same date
      const existing = await ctx.db
        .query('checkIns')
        .withIndex('by_patientId_and_date', q =>
          q.eq('patientId', patient._id).eq('date', legacyC.date)
        )
        .first()

      if (!existing) {
        await ctx.db.insert('checkIns', {
          patientId: patient._id,
          episodeId: episode?._id,
          submittedByUserId: patient.userId,
          date: checkInTransformed.date,
          symptoms: checkInTransformed.symptoms,
          symptomTotal: checkInTransformed.symptomTotal,
          activityImpact: checkInTransformed.activityImpact,
          dangerSignsPresent: checkInTransformed.dangerSignsPresent,
          dangerSigns: checkInTransformed.dangerSigns,
          note: checkInTransformed.note,
          createdAt: Date.now(),
        })
        migratedCheckIns++
      }
    }

    // 3. Process and Insert Care Plans
    for (const legacyPlan of args.carePlans) {
      const patient = patientMap.get(legacyPlan.patientDisplayId)
      const episode = episodeMap.get(legacyPlan.patientDisplayId)
      if (!patient) continue

      const { category, titleTransform } = transformLegacyCarePlanCategory(legacyPlan.category)
      const finalTitle = titleTransform ? titleTransform(legacyPlan.title) : legacyPlan.title

      await ctx.db.insert('carePlans', {
        patientId: patient._id,
        episodeId: episode?._id,
        title: finalTitle,
        category,
        targetTime: legacyPlan.targetTime,
        completionStatus: legacyPlan.completed ? 'completed' : 'pending',
        completed: legacyPlan.completed ?? false,
        allowPatientCompletion: true,
        isClinicianAuthored: true,
        dayNumber: legacyPlan.dayNumber,
        createdAt: Date.now(),
      })
      migratedCarePlans++
    }

    // Audit migration event
    await ctx.db.insert('auditLogs', {
      actorUserId: actor._id,
      actorRole: actor.role,
      orgId: org._id,
      event: `Executed legacy data migration: ${migratedPatients} patients, ${migratedEpisodes} episodes, ${migratedCheckIns} check-ins, ${migratedCarePlans} care plans`,
      targetResource: 'migration',
      action: 'create',
      createdAt: Date.now(),
    })

    return {
      success: true,
      migratedPatients,
      migratedEpisodes,
      migratedCheckIns,
      migratedCarePlans,
      message: 'Legacy post-surgical data successfully migrated to longitudinal concussion model.',
    }
  },
})

/**
 * Validation Query: Verify database conforms 100% to concussion recovery model with no residual legacy fields.
 */
export const validateSchemaIntegrity = query({
  args: {},
  returns: v.object({
    isCompliant: v.boolean(),
    violations: v.array(v.string()),
    totalPatients: v.number(),
    totalEpisodes: v.number(),
    totalCheckIns: v.number(),
    totalCarePlans: v.number(),
  }),
  handler: async ctx => {
    await requireRole(ctx, ['admin', 'clinician'])

    const violations: string[] = []

    const patients = await ctx.db.query('patients').collect()
    const episodes = await ctx.db.query('recoveryEpisodes').collect()
    const checkIns = await ctx.db.query('checkIns').collect()
    const carePlans = await ctx.db.query('carePlans').collect()

    // 1. Patient checks: verify ID-based primary clinician, displayId format
    for (const p of patients) {
      if ('surgeon' in (p as any)) {
        violations.push(`Patient ${p.displayId} contains forbidden legacy field 'surgeon'.`)
      }
      if ('procedure' in (p as any)) {
        violations.push(`Patient ${p.displayId} contains forbidden legacy field 'procedure'.`)
      }
      if ('surgeryDate' in (p as any)) {
        violations.push(`Patient ${p.displayId} contains forbidden legacy field 'surgeryDate'.`)
      }
    }

    // 2. Recovery Episode checks: verify incidentDate exists, no surgeryDate
    for (const ep of episodes) {
      if (!ep.incidentDate) {
        violations.push(`Episode ${ep._id} is missing mandatory 'incidentDate'.`)
      }
      if ('surgeryDate' in (ep as any)) {
        violations.push(`Episode ${ep._id} contains forbidden legacy field 'surgeryDate'.`)
      }
    }

    // 3. Check-In checks: verify 8-symptom Likert 0-6, derived symptomTotal 0-48, no legacy scores
    for (const c of checkIns) {
      if ('painScore' in (c as any) || 'mobilityScore' in (c as any) || 'emotionalScore' in (c as any)) {
        violations.push(`CheckIn ${c._id} on ${c.date} contains forbidden legacy score fields.`)
      }
      if (!c.symptoms || typeof c.symptomTotal !== 'number') {
        violations.push(`CheckIn ${c._id} is missing structured 8-symptom inventory.`)
      } else {
        const computed = Object.values(c.symptoms).reduce((a, b) => a + b, 0)
        if (computed !== c.symptomTotal) {
          violations.push(`CheckIn ${c._id} symptomTotal mismatch: stored ${c.symptomTotal}, computed ${computed}.`)
        }
      }
    }

    // 4. Care Plan checks: verify categories conform to concussion pacing
    const validCategories = new Set([
      'cognitive_pacing',
      'physical_activity',
      'sleep_hygiene',
      'medication',
      'check_in',
      'appointment',
      'education',
      'accommodations',
    ])

    for (const cp of carePlans) {
      if (!validCategories.has(cp.category)) {
        violations.push(`CarePlan ${cp._id} has invalid category '${cp.category}'.`)
      }
    }

    return {
      isCompliant: violations.length === 0,
      violations,
      totalPatients: patients.length,
      totalEpisodes: episodes.length,
      totalCheckIns: checkIns.length,
      totalCarePlans: carePlans.length,
    }
  },
})

/**
 * Rollback & Archival Procedure: Clean up migrated records if an unrecoverable failure occurs.
 */
export const rollbackMigratedBatch = mutation({
  args: {
    patientDisplayIds: v.array(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    removedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const { user } = await requireRole(ctx, ['admin'])

    let removedCount = 0

    for (const displayId of args.patientDisplayIds) {
      const patient = await ctx.db
        .query('patients')
        .withIndex('by_displayId', q => q.eq('displayId', displayId))
        .first()

      if (patient) {
        // Delete checkIns
        const checkIns = await ctx.db
          .query('checkIns')
          .withIndex('by_patientId', q => q.eq('patientId', patient._id))
          .collect()
        for (const c of checkIns) {
          await ctx.db.delete(c._id)
          removedCount++
        }

        // Delete carePlans
        const plans = await ctx.db
          .query('carePlans')
          .withIndex('by_patientId', q => q.eq('patientId', patient._id))
          .collect()
        for (const p of plans) {
          await ctx.db.delete(p._id)
          removedCount++
        }

        // Delete episodes
        const episodes = await ctx.db
          .query('recoveryEpisodes')
          .withIndex('by_patientId', q => q.eq('patientId', patient._id))
          .collect()
        for (const e of episodes) {
          await ctx.db.delete(e._id)
          removedCount++
        }

        // Delete patient profile
        await ctx.db.delete(patient._id)
        removedCount++
      }
    }

    await ctx.db.insert('auditLogs', {
      actorUserId: user._id,
      actorRole: user.role,
      event: `Rolled back migration for ${args.patientDisplayIds.length} patients (${removedCount} records deleted)`,
      targetResource: 'migration',
      action: 'delete',
      createdAt: Date.now(),
    })

    return {
      success: true,
      removedCount,
    }
  },
})
