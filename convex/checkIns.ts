import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listByPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .collect()
  },
})

export const getLatest = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('checkIns')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .first()
  },
})

export const submitCheckIn = mutation({
  args: {
    patientId: v.string(),
    date: v.string(),
    painScore: v.number(),
    sleepScore: v.number(),
    mobilityScore: v.number(),
    emotionalScore: v.number(),
    symptomQuality: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('checkIns', {
      ...args,
      createdAt: Date.now(),
    })

    // Optionally calculate composite score: 100 - (pain * 5) + (mobility * 3) + (sleep * 2) normalized
    // and update patient score
    const patient = await ctx.db
      .query('patients')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .first()

    if (patient) {
      // Calculate normalized score (0 - 100)
      const calculatedScore = Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (10 - args.painScore) * 3.5 +
              args.mobilityScore * 3.5 +
              args.sleepScore * 1.5 +
              args.emotionalScore * 1.5
          )
        )
      )

      await ctx.db.patch(patient._id, {
        score: calculatedScore,
        day: patient.day + 1,
      })

      // Add recovery trend entry
      await ctx.db.insert('recoveryTrends', {
        patientId: args.patientId,
        day: `Day ${patient.day + 1}`,
        score: calculatedScore,
        pain: args.painScore,
        mobility: Math.round(args.mobilityScore * 10),
        date: args.date,
      })
    }

    return id
  },
})
