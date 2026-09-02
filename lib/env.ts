const PLACEHOLDER_CONVEX_HOST = 'placeholder.convex.cloud'
const PLACEHOLDER_CLERK_HOST = 'placeholder.clerk.accounts.dev'

function missingEnvMessage(name: string): string {
  return (
    `Missing required environment variable ${name}. ` +
    'Copy .env.example to .env.local, add your Clerk keys, then run `npx convex dev` ' +
    '(or `pnpm convex:dev`) so Convex writes NEXT_PUBLIC_CONVEX_URL. See the README.'
  )
}

function placeholderEnvMessage(name: string, value: string): string {
  return (
    `${name} is set to a placeholder value (${value}). ` +
    'Runtime never connects to placeholder Convex or Clerk endpoints. ' +
    'Replace it with your real deployment URL. See the README.'
  )
}

export function isPlaceholderHost(value: string): boolean {
  try {
    const hostname = new URL(value).hostname
    return hostname === PLACEHOLDER_CONVEX_HOST || hostname === PLACEHOLDER_CLERK_HOST
  } catch {
    return value.includes(PLACEHOLDER_CONVEX_HOST) || value.includes(PLACEHOLDER_CLERK_HOST)
  }
}

export function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(missingEnvMessage(name))
  }
  if (isPlaceholderHost(trimmed)) {
    throw new Error(placeholderEnvMessage(name, trimmed))
  }
  return trimmed
}

export function requireHttpsUrl(name: string, value: string | undefined): string {
  const trimmed = requireEnv(name, value)
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error(`${name} must be a valid https URL (got "${trimmed}").`)
  }
  if (url.protocol !== 'https:') {
    throw new Error(`${name} must use https (got "${trimmed}").`)
  }
  return trimmed.replace(/\/$/, '')
}

export function getConvexUrl(): string {
  return requireHttpsUrl('NEXT_PUBLIC_CONVEX_URL', process.env.NEXT_PUBLIC_CONVEX_URL)
}

export function getClerkPublishableKey(): string {
  const key = requireEnv(
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  )
  if (!key.startsWith('pk_test_') && !key.startsWith('pk_live_')) {
    throw new Error(
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_test_ or pk_live_. ' +
        'Copy it from the Clerk Dashboard API keys page.'
    )
  }
  return key
}

export function getClerkSecretKey(): string {
  const key = requireEnv('CLERK_SECRET_KEY', process.env.CLERK_SECRET_KEY)
  if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) {
    throw new Error(
      'CLERK_SECRET_KEY must start with sk_test_ or sk_live_. ' +
        'Copy it from the Clerk Dashboard API keys page. Never commit this value.'
    )
  }
  return key
}
