import { describe, expect, test } from 'vitest'
import authConfig from '../auth.config'
import { requireClerkIssuerDomain } from '../lib/clerkIssuer'

describe('Clerk JWT issuer for Convex', () => {
  test('auth.config uses the Convex application ID and a real issuer', () => {
    const provider = authConfig.providers[0]
    expect(provider).toBeDefined()
    if (!provider || !('domain' in provider)) {
      throw new Error('Expected an OIDC Clerk provider with a domain')
    }
    expect(provider.applicationID).toBe('convex')
    expect(provider.domain).toBe('https://clerk.example.test')
    expect(provider.domain).not.toContain('placeholder.clerk.accounts.dev')
  })

  test('rejects missing, placeholder, and non-https issuers', () => {
    expect(() => requireClerkIssuerDomain(undefined)).toThrow(/CLERK_JWT_ISSUER_DOMAIN is not set/)
    expect(() => requireClerkIssuerDomain('https://placeholder.clerk.accounts.dev')).toThrow(
      /placeholder issuer/
    )
    expect(() => requireClerkIssuerDomain('http://example.clerk.accounts.dev')).toThrow(/must use https/)
    expect(requireClerkIssuerDomain('https://verb-noun-00.clerk.accounts.dev/')).toBe(
      'https://verb-noun-00.clerk.accounts.dev'
    )
  })
})
