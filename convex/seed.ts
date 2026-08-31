import { mutation } from './_generated/server'

export const seedDatabase = mutation({
  args: {},
  handler: async ctx => {
    // 1. Seed Patients
    const existingPatients = await ctx.db.query('patients').collect()
    if (existingPatients.length === 0) {
      const initialPatients = [
        {
          patientId: 'P-1042',
          name: 'Maya Chen',
          procedure: 'ACL reconstruction',
          day: 18,
          score: 78,
          risk: 'Stable' as const,
          adherence: 92,
          surgeon: 'Dr. Olivia Brooks',
          caregiverName: 'David Chen',
          surgeryDate: '2026-08-13',
        },
        {
          patientId: 'P-1038',
          name: 'Daniel Ortiz',
          procedure: 'Total knee replacement',
          day: 9,
          score: 54,
          risk: 'Review' as const,
          adherence: 71,
          surgeon: 'Dr. Olivia Brooks',
          surgeryDate: '2026-08-22',
        },
        {
          patientId: 'P-1031',
          name: 'Ava Williams',
          procedure: 'Rotator cuff repair',
          day: 27,
          score: 83,
          risk: 'Stable' as const,
          adherence: 96,
          surgeon: 'Dr. Marcus Vance',
          surgeryDate: '2026-08-04',
        },
        {
          patientId: 'P-1027',
          name: 'James Kim',
          procedure: 'Lumbar decompression',
          day: 6,
          score: 46,
          risk: 'Elevated' as const,
          adherence: 64,
          surgeon: 'Dr. Olivia Brooks',
          surgeryDate: '2026-08-25',
        },
        {
          patientId: 'P-1019',
          name: 'Nora Patel',
          procedure: 'Hip replacement',
          day: 34,
          score: 88,
          risk: 'Stable' as const,
          adherence: 89,
          surgeon: 'Dr. Marcus Vance',
          surgeryDate: '2026-07-28',
        },
      ]

      for (const p of initialPatients) {
        await ctx.db.insert('patients', p)
      }
    }

    // 2. Seed Recovery Trends for Maya Chen (P-1042)
    const existingTrends = await ctx.db.query('recoveryTrends').collect()
    if (existingTrends.length === 0) {
      const initialTrends = [
        { day: 'Aug 25', score: 58, pain: 7, mobility: 42 },
        { day: 'Aug 26', score: 62, pain: 6, mobility: 48 },
        { day: 'Aug 27', score: 64, pain: 6, mobility: 51 },
        { day: 'Aug 28', score: 68, pain: 5, mobility: 57 },
        { day: 'Aug 29', score: 72, pain: 4, mobility: 63 },
        { day: 'Aug 30', score: 74, pain: 4, mobility: 68 },
        { day: 'Today', score: 78, pain: 3, mobility: 72 },
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
          detail: 'Pain increased 3 points in 24 hours',
          severity: 'High' as const,
          status: 'active' as const,
          timeAgo: '18 min ago',
          createdAt: Date.now() - 18 * 60 * 1000,
        },
        {
          patientId: 'P-1038',
          patientName: 'Daniel Ortiz',
          detail: 'Missed medication and mobility check-in',
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
          title: 'Morning Ice & Elevation (20 min)',
          category: 'wound_care',
          targetTime: '08:00 AM',
          completed: true,
          dayNumber: 18,
        },
        {
          patientId: 'P-1042',
          title: 'Physical Therapy: Quad Sets & Heel Slides',
          category: 'mobility',
          targetTime: '10:30 AM',
          completed: true,
          dayNumber: 18,
        },
        {
          patientId: 'P-1042',
          title: 'Post-op Anti-inflammatory (Naproxen 500mg)',
          category: 'medication',
          targetTime: '01:00 PM',
          completed: false,
          dayNumber: 18,
        },
        {
          patientId: 'P-1042',
          title: 'Evening Walking Drill (10 min assisted)',
          category: 'mobility',
          targetTime: '06:00 PM',
          completed: false,
          dayNumber: 18,
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
