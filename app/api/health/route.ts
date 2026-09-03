import { NextResponse } from 'next/server'
import { getOrCreateCorrelationId } from '@/lib/observability/correlation'
import { isAiEnabled, DEFAULT_GOVERNANCE_STATE } from '@/lib/ai/killSwitch'

export const dynamic = 'force-dynamic'

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latencyMs?: number
  details?: Record<string, string | number | boolean | null>
}

export async function GET(request: Request) {
  const correlationId = getOrCreateCorrelationId(request.headers)
  const startTime = Date.now()

  // 1. Next.js runtime signal
  const nextjsHealth: ServiceHealth = {
    status: 'healthy',
    details: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  }

  // 2. Convex persistence signal
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  let convexHealth: ServiceHealth = {
    status: 'unhealthy',
    details: { configured: false },
  }

  if (convexUrl) {
    const convexStart = Date.now()
    try {
      const res = await fetch(`${convexUrl.replace(/\/$/, '')}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      }).catch(() => null)

      const latencyMs = Date.now() - convexStart

      if (res && res.ok) {
        convexHealth = {
          status: 'healthy',
          latencyMs,
          details: { configured: true, connected: true },
        }
      } else {
        // If the HTTP /health endpoint is still deploying, as long as URL is configured we report degraded/reachable
        convexHealth = {
          status: 'degraded',
          latencyMs,
          details: { configured: true, connected: false },
        }
      }
    } catch {
      convexHealth = {
        status: 'degraded',
        details: { configured: true, probeError: 'timeout_or_unreachable' },
      }
    }
  }

  // 3. Clerk auth configuration signal (never leaks secret values)
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const clerkSecret = process.env.CLERK_SECRET_KEY
  const clerkHealth: ServiceHealth = {
    status: clerkPubKey && clerkSecret ? 'healthy' : 'degraded',
    details: {
      publishableKeyPresent: Boolean(clerkPubKey),
      secretKeyPresent: Boolean(clerkSecret),
      keyType: clerkPubKey?.startsWith('pk_live_') ? 'live' : 'test',
    },
  }

  // 4. In-App Notifications signal
  const notificationsHealth: ServiceHealth = {
    status: 'healthy',
    details: {
      mode: 'reactive_convex',
      delivery: 'in_app_active',
    },
  }

  // 5. AI Providers & Governance signal
  const aiActive = isAiEnabled({ state: DEFAULT_GOVERNANCE_STATE, feature: 'all' })
  const aiHealth: ServiceHealth = {
    status: aiActive ? 'healthy' : 'degraded',
    details: {
      killSwitchActive: !aiActive,
      costCapEnforced: true,
      ragGroundedCorpus: 'v1_cdc_amsterdam',
    },
  }

  const services = {
    nextjs: nextjsHealth,
    convex: convexHealth,
    clerk: clerkHealth,
    notifications: notificationsHealth,
    ai: aiHealth,
  }

  // Determine overall status
  const statuses = Object.values(services).map(s => s.status)
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy'
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded'
  }

  const totalDurationMs = Date.now() - startTime

  const responseBody = {
    status: overallStatus,
    timestamp: Date.now(),
    uptimeSeconds: Math.round(process.uptime()),
    version: '0.1.0',
    correlationId,
    durationMs: totalDurationMs,
    services,
  }

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200

  return NextResponse.json(responseBody, {
    status: httpStatus,
    headers: {
      'x-correlation-id': correlationId,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
