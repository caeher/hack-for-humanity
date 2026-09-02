const PLACEHOLDER_CLERK_HOST = 'placeholder.clerk.accounts.dev'

export function requireClerkIssuerDomain(value: string | undefined): string {
  const domain = value?.trim()
  if (!domain) {
    throw new Error(
      'CLERK_JWT_ISSUER_DOMAIN is not set. Create the Clerk JWT template named "convex", ' +
        'then run: npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-instance.clerk.accounts.dev" ' +
        'and re-run npx convex dev. See the README.'
    )
  }

  let url: URL
  try {
    url = new URL(domain)
  } catch {
    throw new Error(
      `CLERK_JWT_ISSUER_DOMAIN must be an https issuer URL (got "${domain}"). ` +
        'Copy the Issuer from Clerk Dashboard > JWT Templates > convex.'
    )
  }

  if (url.protocol !== 'https:') {
    throw new Error(`CLERK_JWT_ISSUER_DOMAIN must use https (got "${domain}").`)
  }

  if (url.hostname === PLACEHOLDER_CLERK_HOST) {
    throw new Error(
      'CLERK_JWT_ISSUER_DOMAIN is a placeholder issuer. Replace it with your Clerk Frontend API URL ' +
        'from the Convex JWT template. Runtime never accepts placeholder Clerk issuers.'
    )
  }

  return domain.replace(/\/$/, '')
}
