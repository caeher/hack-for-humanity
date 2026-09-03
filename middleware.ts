import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import {
  CORRELATION_HEADER_NAME,
  REQUEST_ID_HEADER_NAME,
  getOrCreateCorrelationId,
} from './lib/observability/correlation'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
])

function e2eMiddleware(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(request.headers)
  const response = NextResponse.next()
  response.headers.set(CORRELATION_HEADER_NAME, correlationId)
  response.headers.set(REQUEST_ID_HEADER_NAME, correlationId)
  return response
}

const clerkProtectedMiddleware = clerkMiddleware(async (auth, request) => {
  const correlationId = getOrCreateCorrelationId(request.headers)
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
  const response = NextResponse.next()
  response.headers.set(CORRELATION_HEADER_NAME, correlationId)
  response.headers.set(REQUEST_ID_HEADER_NAME, correlationId)
  return response
})

export default process.env.E2E_TEST_MODE === 'true' ? e2eMiddleware : clerkProtectedMiddleware

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
}

