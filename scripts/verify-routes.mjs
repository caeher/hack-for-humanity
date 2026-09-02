#!/usr/bin/env node
/**
 * Verifies that Next.js build output includes the expected 22 application routes
 * from baseline/routes.json. Fails CI when routes are added or removed without
 * updating the baseline intentionally.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const baselinePath = resolve(root, 'baseline/routes.json')

function loadBaseline() {
  const raw = readFileSync(baselinePath, 'utf8')
  const parsed = JSON.parse(raw)
  return parsed.routes
}

function normalizeRoute(route) {
  return route.replace(/\/$/, '') || '/'
}

function extractRoutesFromBuildOutput(output) {
  const routes = new Set()
  const routeLine = /^\s*[├└ƒ○]\s+(\S+)/gm
  let match
  while ((match = routeLine.exec(output)) !== null) {
    const route = normalizeRoute(match[1])
    if (route.startsWith('/')) {
      routes.add(route)
    }
  }
  return routes
}

function main() {
  const expected = loadBaseline().map(normalizeRoute).sort()

  const build = spawnSync('pnpm', ['build'], {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  const combined = `${build.stdout}\n${build.stderr}`

  if (build.status !== 0) {
    console.error('pnpm build failed while verifying routes:')
    console.error(combined)
    process.exit(build.status ?? 1)
  }

  const discovered = extractRoutesFromBuildOutput(combined)
  const discoveredList = [...discovered].sort()
  const missing = expected.filter(r => !discovered.has(r))
  const extra = discoveredList.filter(
    r =>
      !expected.includes(r) &&
      !r.startsWith('/sign-in') &&
      !r.startsWith('/sign-up') &&
      r !== '/_not-found'
  )

  if (missing.length > 0 || extra.length > 0) {
    console.error('Route baseline mismatch.')
    if (missing.length > 0) {
      console.error('Missing from build:', missing.join(', '))
    }
    if (extra.length > 0) {
      console.error(
        'Unexpected routes (update baseline/routes.json if intentional):',
        extra.join(', ')
      )
    }
    process.exit(1)
  }

  console.log(`Route baseline verified: ${expected.length} routes match.`)
}

main()
