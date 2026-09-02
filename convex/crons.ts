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

export default crons
