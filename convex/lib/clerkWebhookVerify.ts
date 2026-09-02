import { Webhook } from 'svix'

export interface ClerkWebhookHeaders {
  svixId: string | null
  svixTimestamp: string | null
  svixSignature: string | null
}

export function readClerkWebhookHeaders(request: Request): ClerkWebhookHeaders {
  return {
    svixId: request.headers.get('svix-id'),
    svixTimestamp: request.headers.get('svix-timestamp'),
    svixSignature: request.headers.get('svix-signature'),
  }
}

export function verifyClerkWebhookPayload(
  secret: string,
  payload: string,
  headers: ClerkWebhookHeaders
): unknown {
  if (!headers.svixId || !headers.svixTimestamp || !headers.svixSignature) {
    throw new Error('missing_signature_headers')
  }

  const verifier = new Webhook(secret)
  verifier.verify(payload, {
    'svix-id': headers.svixId,
    'svix-timestamp': headers.svixTimestamp,
    'svix-signature': headers.svixSignature,
  })

  return JSON.parse(payload) as unknown
}

export function signClerkWebhookPayloadForTest(
  secret: string,
  payload: string,
  eventId: string,
  timestampSeconds: number
): ClerkWebhookHeaders {
  const verifier = new Webhook(secret)
  const signature = verifier.sign(eventId, new Date(timestampSeconds * 1000), payload)

  return {
    svixId: eventId,
    svixTimestamp: String(timestampSeconds),
    svixSignature: signature,
  }
}
