#!/usr/bin/env node
/**
 * Verifies application routes against baseline/routes.json using the Next.js
 * app-path-routes manifest produced by `pnpm build` (no second build).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const baselinePath = resolve(root, 'baseline/routes.json')
const manifestPath = resolve(root, '.next/app-path-routes-manifest.json')

function normalizeRoute(route) {
  const withoutGroups = route.replace(/\/\([^)]+\)/g, '')
  const cleaned = withoutGroups
    .replace(/\/page$/, '')
    .replace(/\/index$/, '')
    .replace(/\/route$/, '')
  if (!cleaned || cleaned === '/page') return '/'
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

function loadBaseline() {
  return JSON.parse(readFileSync(baselinePath, 'utf8')).routes.map(normalizeRoute)
}

function loadManifestRoutes() {
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Missing ${manifestPath}. Run pnpm build before verifying routes.`
    )
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const paths = Object.keys(manifest)
  return paths.map(normalizeRoute).filter(r => r !== '/_not-found')
}

function main() {
  const expected = loadBaseline().sort()
  const discovered = loadManifestRoutes().sort()

  const expectedSet = new Set(expected)
  const discoveredSet = new Set(discovered)

  const missing = expected.filter(r => !discoveredSet.has(r))
  const extra = discovered.filter(
    r =>
      !expectedSet.has(r) &&
      !r.startsWith('/sign-in') &&
      !r.startsWith('/sign-up') &&
      r !== '/_not-found' &&
      r !== '/_global-error'
  )

  if (missing.length > 0 || extra.length > 0) {
    console.error('Route baseline mismatch.')
    if (missing.length > 0) console.error('Missing:', missing.join(', '))
    if (extra.length > 0) console.error('Unexpected:', extra.join(', '))
    process.exit(1)
  }

  console.log(`Route baseline verified: ${expected.length} routes match manifest.`)
}

main()
