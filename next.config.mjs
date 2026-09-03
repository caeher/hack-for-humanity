function assertRequiredEnv() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim()
  const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  const clerkSecretKey = process.env.CLERK_SECRET_KEY?.trim()

  const missing = []
  if (!convexUrl) missing.push('NEXT_PUBLIC_CONVEX_URL')
  if (!clerkPublishableKey) missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
  if (!clerkSecretKey) missing.push('CLERK_SECRET_KEY')

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example to .env.local, add your Clerk keys, then run `npx convex dev` so Convex writes NEXT_PUBLIC_CONVEX_URL. See the README.'
    )
  }

  if (convexUrl.includes('placeholder.convex.cloud')) {
    throw new Error(
      'NEXT_PUBLIC_CONVEX_URL points at https://placeholder.convex.cloud. ' +
        'Runtime never connects to placeholder endpoints. Run `npx convex dev` and use the URL it writes to .env.local.'
    )
  }
}

assertRequiredEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com",
      "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
          { key: 'Content-Security-Policy', value: cspDirectives },
        ],
      },
    ]
  },
}

export default nextConfig
