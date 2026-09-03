import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import {
  readClerkWebhookHeaders,
  verifyClerkWebhookPayload,
} from './lib/clerkWebhookVerify'
import { ClerkWebhookEnvelope } from './lib/clerkWebhookTypes'

const http = httpRouter()

http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'convex',
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }),
})

http.route({
  path: '/clerk-webhook',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) {
      console.error('clerk_webhook_misconfigured')
      return new Response('Webhook endpoint is not configured.', { status: 503 })
    }

    const rawBody = await request.text()
    const headers = readClerkWebhookHeaders(request)

    let verifiedPayload: unknown
    try {
      verifiedPayload = verifyClerkWebhookPayload(secret, rawBody, headers)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'signature_verification_failed'
      console.warn('clerk_webhook_signature_rejected', { code })
      return new Response('Invalid webhook signature.', { status: 400 })
    }

    if (
      typeof verifiedPayload !== 'object' ||
      verifiedPayload === null ||
      !('type' in verifiedPayload) ||
      !('data' in verifiedPayload) ||
      typeof verifiedPayload.type !== 'string'
    ) {
      return new Response('Malformed webhook payload.', { status: 400 })
    }

    const eventId = headers.svixId
    if (!eventId) {
      return new Response('Missing webhook event identifier.', { status: 400 })
    }

    const envelope = verifiedPayload as ClerkWebhookEnvelope
    const result = await ctx.runMutation(internal.clerkWebhooks.processWebhookEvent, {
      eventId,
      eventType: envelope.type,
      payload: envelope,
    })

    if (result.outcome === 'failed') {
      console.error('clerk_webhook_processing_failed', {
        eventId,
        eventType: envelope.type,
        errorCode: result.errorCode,
      })
      return new Response('Webhook processing failed.', { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true, outcome: result.outcome }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
})

export default http
