import { v } from 'convex/values'

// --- Enums & Value Validators ---

export const roleValidator = v.union(
  v.literal('patient'),
  v.literal('caregiver'),
  v.literal('clinician'),
  v.literal('admin')
)

export const riskValidator = v.union(
  v.literal('Stable'),
  v.literal('Review'),
  v.literal('Elevated')
)

export const alertSeverityValidator = v.union(
  v.literal('High'),
  v.literal('Medium'),
  v.literal('Low')
)

export const alertStatusValidator = v.union(
  v.literal('active'),
  v.literal('acknowledged'),
  v.literal('resolved')
)

export const userStatusValidator = v.union(
  v.literal('Active'),
  v.literal('Invited'),
  v.literal('Suspended')
)

// --- Document Validators ---

export const userDocValidator = v.object({
  _id: v.id('users'),
  _creationTime: v.number(),
  name: v.string(),
  email: v.string(),
  tokenIdentifier: v.optional(v.string()),
  role: roleValidator,
  status: userStatusValidator,
  lastActive: v.optional(v.string()),
  createdAt: v.number(),
})

export const patientDocValidator = v.object({
  _id: v.id('patients'),
  _creationTime: v.number(),
  patientId: v.string(),
  name: v.string(),
  procedure: v.string(),
  day: v.number(),
  score: v.number(),
  risk: riskValidator,
  adherence: v.number(),
  surgeon: v.optional(v.string()),
  caregiverId: v.optional(v.string()),
  caregiverName: v.optional(v.string()),
  surgeryDate: v.optional(v.string()),
  notes: v.optional(v.string()),
})

export const checkInDocValidator = v.object({
  _id: v.id('checkIns'),
  _creationTime: v.number(),
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

export const alertDocValidator = v.object({
  _id: v.id('alerts'),
  _creationTime: v.number(),
  patientId: v.optional(v.string()),
  patientName: v.string(),
  detail: v.string(),
  severity: alertSeverityValidator,
  status: alertStatusValidator,
  createdAt: v.number(),
  timeAgo: v.optional(v.string()),
})

export const encounterDocValidator = v.object({
  _id: v.id('clinicalEncounters'),
  _creationTime: v.number(),
  patientId: v.string(),
  patientName: v.string(),
  encounterType: v.string(),
  diagnosis: v.string(),
  datetime: v.string(),
  notes: v.string(),
  clinicianName: v.optional(v.string()),
  attachmentUrl: v.optional(v.string()),
  createdAt: v.number(),
})

export const messageDocValidator = v.object({
  _id: v.id('messages'),
  _creationTime: v.number(),
  threadId: v.string(),
  senderId: v.string(),
  senderName: v.string(),
  senderRole: roleValidator,
  recipientId: v.optional(v.string()),
  content: v.string(),
  timestamp: v.string(),
  createdAt: v.number(),
  read: v.boolean(),
})

export const carePlanDocValidator = v.object({
  _id: v.id('carePlans'),
  _creationTime: v.number(),
  patientId: v.string(),
  title: v.string(),
  category: v.string(),
  targetTime: v.optional(v.string()),
  completed: v.boolean(),
  dayNumber: v.optional(v.number()),
})

export const recoveryTrendDocValidator = v.object({
  _id: v.id('recoveryTrends'),
  _creationTime: v.number(),
  patientId: v.string(),
  day: v.string(),
  score: v.number(),
  pain: v.number(),
  mobility: v.number(),
  date: v.optional(v.string()),
})

export const auditLogDocValidator = v.object({
  _id: v.id('auditLogs'),
  _creationTime: v.number(),
  time: v.string(),
  actor: v.string(),
  event: v.string(),
  resource: v.string(),
  createdAt: v.number(),
})
