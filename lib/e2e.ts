/**
 * When true, the app runs in CI Playwright smoke mode without live Clerk/Convex.
 * Set via NEXT_PUBLIC_E2E_TEST_MODE=true in GitHub Actions and Playwright.
 */
export const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true'
