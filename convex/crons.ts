import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'cleanup clinical attachment orphans',
  { hours: 1 },
  internal.attachments.runScheduledCleanup,
  {}
)

crons.interval(
  'process check-in reminder notifications',
  { hours: 1 },
  internal.notificationJobs.processDueReminders,
  {}
)

crons.interval(
  'rebuild cohort analytics snapshots',
  { hours: 6 },
  internal.cohortAnalytics.rebuildAllSnapshots,
  {}
)

crons.interval(
  'run statutory data retention purge',
  { hours: 24 },
  internal.retention.runScheduledRetentionJob,
  {}
)

export default crons
