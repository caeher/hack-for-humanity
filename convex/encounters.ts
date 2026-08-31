import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const listByPatient = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('clinicalEncounters')
      .withIndex('by_patientId', q => q.eq('patientId', args.patientId))
      .order('desc')
      .collect()
  },
})

export const createEncounter = mutation({
  args: {
    patientId: v.string(),
    patientName: v.string(),
    encounterType: v.string(),
    diagnosis: v.string(),
    datetime: v.string(),
    notes: v.string(),
    clinicianName: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('clinicalEncounters', {
      ...args,
      createdAt: Date.now(),
    })

    // Also log audit trail entry
    await ctx.db.insert('auditLogs', {
      time: 'Just now',
      actor: args.clinicianName || 'Clinician',
      event: `Documented ${args.encounterType} clinical encounter`,
      resource: args.patientId,
      createdAt: Date.now(),
    })

    return id
  },
})
