import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test, expect } from '@playwright/test'

const baseline = JSON.parse(
  readFileSync(resolve(process.cwd(), 'baseline/routes.json'), 'utf8')
) as { routes: string[] }

function resolveDynamicRoute(route: string): string {
  return route.replace('[id]', 'P-1042')
}

const ROLE_ROUTES: Record<string, string[]> = {
  patient: baseline.routes.filter(r => r.startsWith('/patient')),
  caregiver: baseline.routes.filter(r => r.startsWith('/caregiver')),
  clinician: baseline.routes.filter(r => r.startsWith('/clinician')),
  admin: baseline.routes.filter(r => r.startsWith('/admin')),
}

const ROLE_HOME: Record<string, string> = {
  patient: '/patient/dashboard',
  caregiver: '/caregiver/dashboard',
  clinician: '/clinician/dashboard',
  admin: '/admin/dashboard',
}

for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
  test.describe(`${role} smoke journey`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(ROLE_HOME[role])
      await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 30_000 })
    })

    for (const route of routes) {
      const path = resolveDynamicRoute(route)

      test(`loads ${path}`, async ({ page }) => {
        await page.goto(path)
        await expect(page).not.toHaveTitle(/error/i)
        await expect(page.locator('body')).not.toBeEmpty()
        await expect(page.getByText(/medical disclaimer|prototype|symptom|dashboard|recovery/i).first()).toBeVisible({
          timeout: 15_000,
        })
      })
    }
  })
}

test.describe('gateway and denied-access scenarios', () => {
  test('landing page exposes all four portal entry points', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /patient/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /caregiver/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /clinician/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /organization|admin/i }).first()).toBeVisible()
  })

  test('patient check-in exposes danger-sign intercept copy', async ({ page }) => {
    await page.goto('/patient/check-in')
    await expect(page.getByText(/daily check-in/i).first()).toBeVisible()
    for (let step = 0; step < 8; step += 1) {
      await page.getByRole('button', { name: /continue/i }).click()
    }
    await expect(page.getByRole('heading', { name: /before you finish, check for danger signs/i })).toBeVisible()
  })

  test('onboarding page explains tracking is not diagnosis', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByText(/set up your recovery profile/i).first()).toBeVisible()
    await expect(page.getByText(/does not diagnose/i).first()).toBeVisible()
  })

  test('profile keeps wearable sync in disabled planned state', async ({ page }) => {
    await page.goto('/patient/profile')
    await expect(page.getByText(/wearable data sync \(planned\)/i)).toBeVisible()
    await expect(page.getByText(/not connected in this prototype/i)).toBeVisible()
  })
})

test('route baseline count matches expected 23 application routes', async () => {
  expect(baseline.routes).toHaveLength(23)
})
