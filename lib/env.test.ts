import { describe, expect, test } from 'vitest'
import {
  getClerkPublishableKey,
  getClerkSecretKey,
  getConvexUrl,
  isPlaceholderHost,
  requireEnv,
  requireHttpsUrl,
} from './env'

describe('environment validation', () => {
  test('rejects empty values with a setup pointer', () => {
    expect(() => requireEnv('NEXT_PUBLIC_CONVEX_URL', '   ')).toThrow(/Missing required environment variable/)
    expect(() => requireEnv('NEXT_PUBLIC_CONVEX_URL', undefined)).toThrow(/\.env\.example/)
  })

  test('rejects placeholder Convex and Clerk hosts', () => {
    expect(isPlaceholderHost('https://placeholder.convex.cloud')).toBe(true)
    expect(isPlaceholderHost('https://placeholder.clerk.accounts.dev')).toBe(true)
    expect(isPlaceholderHost('https://happy-animal-123.convex.cloud')).toBe(false)

    expect(() =>
      requireHttpsUrl('NEXT_PUBLIC_CONVEX_URL', 'https://placeholder.convex.cloud')
    ).toThrow(/placeholder/)
    expect(() =>
      requireHttpsUrl('CLERK_JWT_ISSUER_DOMAIN', 'https://placeholder.clerk.accounts.dev')
    ).toThrow(/placeholder/)
  })

  test('requires https URLs', () => {
    expect(() => requireHttpsUrl('NEXT_PUBLIC_CONVEX_URL', 'not-a-url')).toThrow(/valid https URL/)
    expect(() => requireHttpsUrl('NEXT_PUBLIC_CONVEX_URL', 'http://example.convex.cloud')).toThrow(
      /must use https/
    )
    expect(requireHttpsUrl('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud/')).toBe(
      'https://example.convex.cloud'
    )
  })

  test('getConvexUrl reads NEXT_PUBLIC_CONVEX_URL', () => {
    const previous = process.env.NEXT_PUBLIC_CONVEX_URL
    process.env.NEXT_PUBLIC_CONVEX_URL = 'https://example.convex.cloud'
    try {
      expect(getConvexUrl()).toBe('https://example.convex.cloud')
    } finally {
      process.env.NEXT_PUBLIC_CONVEX_URL = previous
    }
  })

  test('Clerk key helpers enforce pk_/sk_ prefixes', () => {
    const previousPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    const previousSk = process.env.CLERK_SECRET_KEY
    try {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'not-a-key'
      expect(() => getClerkPublishableKey()).toThrow(/pk_test_|pk_live_/)

      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_example'
      expect(getClerkPublishableKey()).toBe('pk_test_example')

      process.env.CLERK_SECRET_KEY = 'not-a-key'
      expect(() => getClerkSecretKey()).toThrow(/sk_test_|sk_live_/)

      process.env.CLERK_SECRET_KEY = 'sk_test_example'
      expect(getClerkSecretKey()).toBe('sk_test_example')
    } finally {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = previousPk
      process.env.CLERK_SECRET_KEY = previousSk
    }
  })
})
