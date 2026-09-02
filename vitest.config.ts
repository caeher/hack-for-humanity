import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'edge-runtime',
    env: {
      // convex-test globs convex/**/*.ts, including auth.config.ts, which
      // refuses placeholder Clerk issuers and requires this variable.
      CLERK_JWT_ISSUER_DOMAIN: 'https://clerk.example.test',
    },
  },
})
