import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    // Single retry surfaces flakes without masking them indefinitely.
    retry: 1,
    reporters: process.env.CI ? ['default', 'json'] : ['default'],
    outputFile: process.env.CI ? { json: 'test-results/vitest-results.json' } : undefined,
    projects: [
      {
        resolve: {
          alias: {
            '@': path.resolve(import.meta.dirname, '.'),
          },
        },
        test: {
          name: 'convex',
          include: ['convex/**/*.test.ts'],
          environment: 'edge-runtime',
          env: {
            CLERK_JWT_ISSUER_DOMAIN: 'https://clerk.example.test',
          },
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(import.meta.dirname, '.'),
          },
        },
        test: {
          name: 'lib',
          include: ['lib/**/*.test.ts'],
          environment: 'node',
          env: {
            CLERK_JWT_ISSUER_DOMAIN: 'https://clerk.example.test',
          },
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(import.meta.dirname, '.'),
          },
        },
        test: {
          name: 'components',
          include: ['components/**/*.test.tsx'],
          environment: 'happy-dom',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
})
