import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  patients: defineTable({
    patientId: v.string(), // e.g. "P-1042"
    name: v.string(),
    procedure: v.string(), // Legacy: recovery context until issue #6 schema migration
    day: v.number(),
    score: v.number(), // Legacy: tracked symptom total, not a recovery score
    risk: v.union(v.literal('Stable'), v.literal('Review'), v.literal('Elevated')),
    adherence: v.number(),
    surgeon: v.optional(v.string()), // Legacy: assigned clinician
    caregiverId: v.optional(v.string()),
    caregiverName: v.optional(v.string()),
    surgeryDate: v.optional(v.string()), // Legacy: incident date
    notes: v.optional(v.string()),
  })
    .index('by_patientId', ['patientId'])
    .index('by_risk', ['risk']),

  recoveryTrends: defineTable({
    patientId: v.string(),
    day: v.string(), // e.g. "Aug 25" or "Today"
    score: v.number(), // Legacy: symptom burden total
    pain: v.number(), // Legacy: headache rating
    mobility: v.number(), // Legacy and unused by the concussion demo
    date: v.optional(v.string()),
  }).index('by_patientId', ['patientId']),

  checkIns: defineTable({
    patientId: v.string(),
    date: v.string(),
    painScore: v.number(),
    sleepScore: v.number(),
    mobilityScore: v.number(),
    emotionalScore: v.number(),
    symptomQuality: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_patientId', ['patientId'])
    .index('by_date', ['date']),

  alerts: defineTable({
    patientId: v.optional(v.string()),
    patientName: v.string(),
    detail: v.string(),
    severity: v.union(v.literal('High'), v.literal('Medium'), v.literal('Low')),
    status: v.union(v.literal('active'), v.literal('acknowledged'), v.literal('resolved')),
    createdAt: v.number(),
    timeAgo: v.optional(v.string()),
  })
    .index('by_severity', ['severity'])
    .index('by_status', ['status'])
    .index('by_patientName', ['patientName']),

  clinicalEncounters: defineTable({
    patientId: v.string(),
    patientName: v.string(),
    encounterType: v.string(), // 'in-person' | 'telehealth' | 'asynchronous'
    diagnosis: v.string(),
    datetime: v.string(),
    notes: v.string(),
    clinicianName: v.optional(v.string()),
    attachmentUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_patientId', ['patientId']),

  messages: defineTable({
    threadId: v.string(),
    senderId: v.string(),
    senderName: v.string(),
    senderRole: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    recipientId: v.optional(v.string()),
    content: v.string(),
    timestamp: v.string(),
    createdAt: v.number(),
    read: v.boolean(),
  })
    .index('by_threadId', ['threadId'])
    .index('by_senderId', ['senderId']),

  carePlans: defineTable({
    patientId: v.string(),
    title: v.string(),
    category: v.string(), // 'medication' | 'mobility' | 'wound_care' | 'nutrition'
    targetTime: v.optional(v.string()),
    completed: v.boolean(),
    dayNumber: v.optional(v.number()),
  }).index('by_patientId', ['patientId']),

  auditLogs: defineTable({
    time: v.string(),
    actor: v.string(),
    event: v.string(),
    resource: v.string(),
    createdAt: v.number(),
  })
    .index('by_actor', ['actor'])
    .index('by_resource', ['resource']),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal('patient'),
      v.literal('caregiver'),
      v.literal('clinician'),
      v.literal('admin')
    ),
    status: v.union(v.literal('Active'), v.literal('Invited'), v.literal('Suspended')),
    lastActive: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role']),
})
