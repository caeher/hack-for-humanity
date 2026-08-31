import { mutation } from './_generated/server'

export const seedDatabase = mutation({
  args: {},
  handler: async ctx => {
    // 1. Seed Patients
    // Legacy field names remain until the longitudinal schema migration in issue #6.
    // `procedure` stores recovery context, `score` stores the tracked symptom total,
    // `surgeon` stores the assigned clinician, and `surgeryDate` stores incident date.
    const existingPatients = await ctx.db.query('patients').collect()
    if (existingPatients.length === 0) {
      const initialPatients = [
        {
          patientId: 'P-1042',
          name: 'Maya Chen',
          procedure: 'Clinician-diagnosed concussion',
          day: 12,
          score: 15,
          risk: 'Stable' as const,
          adherence: 92,
          surgeon: 'Dr. Olivia Brooks, Sports Medicine',
          caregiverName: 'David Chen',
          surgeryDate: '2026-08-19',
        },
        {
          patientId: 'P-1038',
          name: 'Daniel Ortiz',
          procedure: 'Suspected concussion',
          day: 5,
          score: 31,
          risk: 'Review' as const,
          adherence: 71,
          surgeon: 'Dr. Olivia Brooks, Sports Medicine',
          surgeryDate: '2026-08-26',
        },
        {
          patientId: 'P-1031',
          name: 'Ava Williams',
          procedure: 'Clinician-diagnosed concussion',
          day: 21,
          score: 10,
          risk: 'Stable' as const,
          adherence: 96,
          surgeon: 'Dr. Marcus Vance, Neurology',
          surgeryDate: '2026-08-10',
        },
        {
          patientId: 'P-1027',
          name: 'James Kim',
          procedure: 'Head injury under evaluation',
          day: 2,
          score: 38,
          risk: 'Elevated' as const,
          adherence: 64,
          surgeon: 'Dr. Olivia Brooks, Sports Medicine',
          surgeryDate: '2026-08-29',
        },
        {
          patientId: 'P-1019',
          name: 'Nora Patel',
          procedure: 'Persistent concussion symptoms',
          day: 34,
          score: 26,
          risk: 'Review' as const,
          adherence: 89,
          surgeon: 'Dr. Marcus Vance, Neurology',
          surgeryDate: '2026-07-28',
        },
      ]

      for (const p of initialPatients) {
        await ctx.db.insert('patients', p)
      }
    }

    // 2. Seed Recovery Trends for Maya Chen (P-1042)
    // `score` stores symptom burden, `pain` stores headache, and `mobility` is unused.
    const existingTrends = await ctx.db.query('recoveryTrends').collect()
    if (existingTrends.length === 0) {
      const initialTrends = [
        { day: 'Aug 25', score: 27, pain: 5, mobility: 0 },
        { day: 'Aug 26', score: 25, pain: 5, mobility: 0 },
        { day: 'Aug 27', score: 23, pain: 4, mobility: 0 },
        { day: 'Aug 28', score: 24, pain: 5, mobility: 0 },
        { day: 'Aug 29', score: 20, pain: 4, mobility: 0 },
        { day: 'Aug 30', score: 18, pain: 3, mobility: 0 },
        { day: 'Today', score: 15, pain: 2, mobility: 0 },
      ]

      for (const t of initialTrends) {
        await ctx.db.insert('recoveryTrends', {
          patientId: 'P-1042',
          ...t,
        })
      }
    }

    // 3. Seed Alerts
    const existingAlerts = await ctx.db.query('alerts').collect()
    if (existingAlerts.length === 0) {
      const initialAlerts = [
        {
          patientId: 'P-1027',
          patientName: 'James Kim',
          detail: 'Self-reported repeated vomiting; emergency guidance displayed',
          severity: 'High' as const,
          status: 'active' as const,
          timeAgo: '18 min ago',
          createdAt: Date.now() - 18 * 60 * 1000,
        },
        {
          patientId: 'P-1038',
          patientName: 'Daniel Ortiz',
          detail: 'Headache increased 3 points in 24 hours',
          severity: 'Medium' as const,
          status: 'active' as const,
          timeAgo: '1 hr ago',
          createdAt: Date.now() - 60 * 60 * 1000,
        },
        {
          patientId: 'P-1042',
          patientName: 'Maya Chen',
          detail: 'Sleep quality below baseline for 3 nights',
          severity: 'Low' as const,
          status: 'active' as const,
          timeAgo: '3 hrs ago',
          createdAt: Date.now() - 3 * 60 * 60 * 1000,
        },
      ]

      for (const a of initialAlerts) {
        await ctx.db.insert('alerts', a)
      }
    }

    // 4. Seed Care Plans for P-1042
    const existingPlans = await ctx.db.query('carePlans').collect()
    if (existingPlans.length === 0) {
      const initialTasks = [
        {
          patientId: 'P-1042',
          title: 'Morning symptom check-in',
          category: 'check_in',
          targetTime: '08:00 AM',
          completed: true,
          dayNumber: 12,
        },
        {
          patientId: 'P-1042',
          title: 'Review clinician-provided recovery plan',
          category: 'care_plan',
          targetTime: '10:30 AM',
          completed: true,
          dayNumber: 12,
        },
        {
          patientId: 'P-1042',
          title: 'Prepare questions for follow-up appointment',
          category: 'appointment',
          targetTime: '01:00 PM',
          completed: false,
          dayNumber: 12,
        },
        {
          patientId: 'P-1042',
          title: 'Evening symptom and activity reflection',
          category: 'check_in',
          targetTime: '06:00 PM',
          completed: false,
          dayNumber: 12,
        },
      ]

      for (const task of initialTasks) {
        await ctx.db.insert('carePlans', task)
      }
    }

    // 5. Seed Audit Logs
    const existingAudit = await ctx.db.query('auditLogs').collect()
    if (existingAudit.length === 0) {
      const initialAudit = [
        { time: '10:42 AM', actor: 'Dr. Brooks', event: 'Viewed recovery report', resource: 'P-1042', createdAt: Date.now() - 10000 },
        { time: '9:18 AM', actor: 'Admin Lee', event: 'Changed user role', resource: 'U-088', createdAt: Date.now() - 20000 },
        { time: 'Yesterday', actor: 'Maya Chen', event: 'Shared caregiver access', resource: 'P-1042', createdAt: Date.now() - 86400000 },
        { time: 'Aug 29', actor: 'Dr. Brooks', event: 'Updated clinical care plan', resource: 'P-1038', createdAt: Date.now() - 172800000 },
        { time: 'Aug 28', actor: 'System', event: 'Generated automated weekly report', resource: 'Cohort-A', createdAt: Date.now() - 259200000 },
      ]

      for (const log of initialAudit) {
        await ctx.db.insert('auditLogs', log)
      }
    }

    return { success: true, message: 'Database seeded successfully.' }
  },
})
