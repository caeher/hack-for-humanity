import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'cleanup clinical attachment orphans',
  { hours: 1 },
  internal.attachments.runScheduledCleanup,
  {}
)

export default crons
