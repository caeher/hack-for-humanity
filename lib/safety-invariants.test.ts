import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')

const PROHIBITED_RECOVERY_SCORE_PATTERNS = [
  /Recovery Score/i,
  /Healing Index/i,
  /Health Grade/i,
  /Concussion Cure Rating/i,
  /\brecoveryScore\b/,
  /score\s*=\s*\d+\s*\/\s*100/i,
]

const REQUIRED_SAFE_COPY = {
  checkInFlow: ['tel:911', 'patient-reported symptom total', 'out of 48'],
  profileForm: ['Wearable data sync (planned)', 'Not connected in this prototype'],
  scoreGauge: ['not a clinical recovery score', 'maxscore = 48'],
}

const NON_CAUSAL_PHRASES = ['coincided', 'temporal association', 'does not establish cause']

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '_generated') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc)
    } else if (/\.(tsx?|md)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      acc.push(full)
    }
  }
  return acc
}

describe('PR #39 safety boundary regressions', () => {
  const appAndComponents = [
    ...collectSourceFiles(resolve(ROOT, 'app')),
    ...collectSourceFiles(resolve(ROOT, 'components')),
    ...collectSourceFiles(resolve(ROOT, 'lib')),
  ]

  it('does not reintroduce prohibited 0-100 Recovery Score terminology in UI copy', () => {
    const violations: string[] = []
    for (const file of appAndComponents) {
      const content = readFileSync(file, 'utf8')
      for (const pattern of PROHIBITED_RECOVERY_SCORE_PATTERNS) {
        if (!pattern.test(content)) continue
        // Allowed negation in ScoreGauge disclaimer per PR #39 baseline.
        if (
          file.endsWith('score-gauge.tsx') &&
          /not a clinical recovery score/i.test(content)
        ) {
          continue
        }
        if (
          (file.endsWith('symptomMethodology.ts') ||
            file.endsWith('SYMPTOM_METHODOLOGY.md') ||
            file.endsWith('recovery-timeline.tsx')) &&
          /not a clinical recovery score/i.test(content)
        ) {
          continue
        }
        violations.push(`${file}: matched ${pattern}`)
      }
    }
    expect(violations).toEqual([])
  })

  it('preserves mandatory PR #39 safety copy in check-in and profile surfaces', () => {
    const checkInFlow = readFileSync(
      resolve(ROOT, 'components/patient/check-in-flow.tsx'),
      'utf8'
    ).toLowerCase()
    const safetyOutcomePanel = readFileSync(
      resolve(ROOT, 'components/safety/safety-outcome-panel.tsx'),
      'utf8'
    ).toLowerCase()
    const profileForm = readFileSync(
      resolve(ROOT, 'components/patient/patient-profile-form.tsx'),
      'utf8'
    ).toLowerCase()
    const scoreGauge = readFileSync(
      resolve(ROOT, 'components/dashboard/score-gauge.tsx'),
      'utf8'
    ).toLowerCase()

    const checkInSafetyCopy =
      checkInFlow +
      safetyOutcomePanel +
      readFileSync(resolve(ROOT, 'lib/safety/emergency.ts'), 'utf8').toLowerCase()
    for (const phrase of REQUIRED_SAFE_COPY.checkInFlow) {
      expect(checkInSafetyCopy).toContain(phrase.toLowerCase())
    }
    for (const phrase of REQUIRED_SAFE_COPY.profileForm) {
      expect(profileForm).toContain(phrase.toLowerCase())
    }
    for (const phrase of REQUIRED_SAFE_COPY.scoreGauge) {
      expect(scoreGauge).toContain(phrase.toLowerCase())
    }
  })

  it('keeps non-causal pattern phrasing in patient insights', () => {
    const insightsPage = readFileSync(
      resolve(ROOT, 'app/(patient)/patient/insights/page.tsx'),
      'utf8'
    )
    const matched = NON_CAUSAL_PHRASES.some(phrase => insightsPage.toLowerCase().includes(phrase))
    expect(matched).toBe(true)
  })

  it('documents eight symptom dimensions rated 0-6 in check-in flow', () => {
    const checkInFlow = readFileSync(
      resolve(ROOT, 'components/patient/check-in-flow.tsx'),
      'utf8'
    )
    expect(checkInFlow).toMatch(/headache/)
    expect(checkInFlow).toMatch(/sleepDifficulty/)
    expect(checkInFlow).toMatch(/max=\{6\}/)
    expect(checkInFlow).toMatch(/min=\{0\}/)
  })
})
