# Concussion Recovery Intelligence (CRI)

> **A coordinated, evidence-grounded concussion recovery workspace designed to organize patient-reported symptoms, daily context, safety guidance, and clinician-facing summaries.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Convex](https://img.shields.io/badge/Backend-Convex-ff5e00?style=flat)](https://convex.dev/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff?style=flat)](https://clerk.com/)

---

## 📖 Key Documentation & Specifications

- 🛡️ **[Clinical Scope, Safety Boundaries & Evidence Governance Specification](docs/CLINICAL_SCOPE_AND_SAFETY.md)** — **Core clinical contract**, allowed vs prohibited claims, evidence citations, safety engine tiers, and the PR review safety checklist.
- 📋 **[Concussion Demo Review & PR #39 Baseline](docs/concussion-demo-review.md)** — Current baseline alignment, danger-sign intercept, backlog overview, and Phase 0 roadmap.
- 🧠 **[Product Vision & Research Foundation](docs/base.md)** — Longitudinal tracking rationale, active recovery pacing, and research grounding.
- 🎨 **[Frontend Design System Specifications](docs/frontend-design-specs.md)** — Color tokens, typography, component layouts, and accessibility requirements.
- 🤖 **[Agent & Contributor Guidelines](AGENTS.md)** — Engineering rules, directory map, styling practices, and conventional commits.

---

## 🚨 Strict Clinical Red Lines

CRI is an observational tracking and recovery support tool. It is **never** a substitute for professional clinical medical care.

1. **NO Diagnosis:** CRI never determines whether a user has a concussion or any other medical condition.
2. **NO Prescriptions:** CRI never recommends or adjusts medication regimens or dosages.
3. **NO Prognostic Predictions:** CRI never promises specific recovery timelines (e.g., "recovered in 5 days").
4. **NO Activity Clearance:** CRI never clears an individual for return-to-sport, return-to-learn, or return-to-work. Clearance requires in-person medical evaluation.
5. **NO Reassurance Override:** Emergency danger signs (CDC Red Flags) immediately trigger an emergency screen intercept with direct 911 access.

---

## 👥 Personas & Workspaces

CRI provides four dedicated role-based portals:

| Workspace | Route Group | Description |
| :--- | :--- | :--- |
| **Patient** | `/patient/*` | <60-second daily check-in (8 symptoms, 0–6 Likert scale), physical/cognitive exertion logging, descriptive symptom total trajectory (0–48), educational insights, and appointment prep reports. |
| **Caregiver** | `/caregiver/*` | Permission-gated recovery monitoring, non-causal trend observation, check-in reminders, and support tools for parents/partners. |
| **Clinician** | `/clinician/*` | Caseload triage dashboard (`Stable`, `Review`, `Elevated`), longitudinal recovery trajectories, encounter note documentation, and printable encounter summary reports. |
| **Admin / Org** | `/admin/*` | Role-based user provisioning (RBAC), security audit logs, clinical guideline source citation governance, and aggregated cohort metrics. |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Frontend:** React 19, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Recharts
- **Backend & Persistence:** Convex reactive backend
- **Authentication:** Clerk (`@clerk/nextjs`) integrated with Convex
- **Package Manager:** `pnpm`
- **Code Quality:** TypeScript 5.7 (Strict Mode), Husky, Commitlint, Commitizen

---

## 🚀 Local setup (Next.js + Clerk + Convex)

A new contributor should be able to run CRI from this README alone. The app **refuses placeholder Convex and Clerk endpoints** — there is no `https://placeholder.convex.cloud` fallback.

### Prerequisites

- Node.js 20.9 or later
- `pnpm` (`npm install -g pnpm`)
- A [Clerk](https://dashboard.clerk.com/) application
- A [Convex](https://dashboard.convex.dev/) account (`npx convex login`)

### 1. Clone and install

```bash
git clone https://github.com/caeher/hack-for-humanity.git
cd hack-for-humanity
pnpm install
cp .env.example .env.local
```

### 2. Clerk API keys

In the Clerk Dashboard, open **API keys** and copy the values into `.env.local`:

| Variable | Where it comes from |
| :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key (`pk_test_...` or `pk_live_...`) |
| `CLERK_SECRET_KEY` | Secret key (`sk_test_...` or `sk_live_...`). Never commit this. |

Sign-in routes are already set (`/sign-in`, `/sign-up`).

### 3. Clerk JWT template for Convex

Convex accepts Clerk session tokens only from a JWT template named **`convex`**.

1. Clerk Dashboard → **JWT Templates** → **New template** → **Convex**.
2. Keep the template name `convex` (this must match `applicationID` in `convex/auth.config.ts`).
3. Default claims already include `"aud": "convex"`. You can keep the Convex defaults:

```json
{
  "aud": "convex",
  "name": "{{user.full_name}}",
  "email": "{{user.primary_email_address}}",
  "picture": "{{user.image_url}}",
  "nickname": "{{user.username}}",
  "given_name": "{{user.first_name}}",
  "family_name": "{{user.last_name}}",
  "updated_at": "{{user.updated_at}}"
}
```

4. Copy the **Issuer** URL (Clerk Frontend API URL). In development it looks like `https://verb-noun-00.clerk.accounts.dev`.
5. Set it in `.env.local` as `CLERK_JWT_ISSUER_DOMAIN`.

Official references: [Convex + Clerk](https://docs.convex.dev/auth/clerk) and [Clerk’s Convex integration](https://clerk.com/docs/guides/development/integrations/databases/convex).

### 4. Start Convex (writes the frontend URL and regenerates types)

Use **`npx convex dev`** for development — never `npx convex deploy` unless you are shipping to production.

```bash
npx convex login
pnpm convex:dev
```

The first run creates (or links) a **dev** deployment, writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`, and regenerates `convex/_generated/*`.

Leave this process running. Push the Clerk issuer onto that same deployment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-instance.clerk.accounts.dev"
```

Restart `pnpm convex:dev` once so `convex/auth.config.ts` syncs with the new issuer. Confirm with `npx convex env list`.

### 5. Seed demo data (optional)

With `convex dev` running:

```bash
pnpm convex:seed
```

This runs `seed:seedDatabase` against the **dev** deployment only (it refuses production unless you pass `force`). Seeded users use synthetic `tokenIdentifier` values for fixtures. Signing in with your own Clerk account creates a **separate** user via `AuthSync` — it does not log you in as a seeded persona.

### 6. Start Next.js

In a second terminal:

```bash
pnpm dev
```

Or run both together:

```bash
pnpm dev:all
```

Open [http://localhost:3000](http://localhost:3000), sign in, and confirm Clerk and Convex both see the session (`useConvexAuth()` should report authenticated after the JWT round-trip).

---

## 🧪 Scripts & verification

```bash
pnpm lint        # ESLint (Convex, env helpers, providers)
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
pnpm check       # lint + typecheck + test
pnpm build       # production Next.js build (requires a real .env.local)
pnpm start       # serve the production build
pnpm convex:codegen
pnpm commit      # interactive conventional commit
```

---

## 🔧 Troubleshooting

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| `Missing required environment variable NEXT_PUBLIC_CONVEX_URL` | Convex CLI has not written the frontend URL | Run `npx convex dev` and copy the `https://….convex.cloud` URL it writes into `.env.local` |
| Error mentions `placeholder.convex.cloud` or `placeholder.clerk.accounts.dev` | A leftover prototype fallback | Replace the value with your real deployment / Clerk issuer. The runtime never uses placeholders. |
| Clerk sign-in works, but Convex queries return unauthenticated | JWT template missing, misnamed, or issuer not set on Convex | Template name must be `convex`. Set `CLERK_JWT_ISSUER_DOMAIN` with `npx convex env set`, then re-run `npx convex dev`. |
| `CLERK_JWT_ISSUER_DOMAIN is not set` during `convex dev` | Issuer exists only in `.env.local` | Convex functions do **not** read Next.js env files. Push the issuer with `npx convex env set`. |
| Seeded patients are not “you” after sign-in | Expected | Seed identities are synthetic. Your Clerk user is synced separately. |
| Generated Convex types are stale | `convex/_generated` out of date | Run `pnpm convex:dev` or `pnpm convex:codegen` |
| `pnpm build` fails on env validation | `.env.local` incomplete | Fill Clerk keys and a real `NEXT_PUBLIC_CONVEX_URL` before building |

Do not commit `.env`, `.env.local`, or Clerk secret keys. `.env.example` documents names only.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
