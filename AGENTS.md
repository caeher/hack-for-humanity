# AGENTS.md — Agent & Developer Guide for CRI

Welcome to the **CRI (Care Recovery Intelligence)** codebase. This document outlines the project architecture, tech stack, coding standards, design system rules, and workflows for AI agents and human contributors.

---

## 1. Project Overview & Mission

**CRI** is a coordinated concussion recovery workspace designed to organize patient-reported symptoms, daily context, safety guidance, and clinician-facing summaries.

The application serves four primary personas via route groups:
1. **Patient (`/patient/*`):** Daily recovery check-ins, symptom tracking, care plan adherence, educational insights, messages, and reports.
2. **Caregiver (`/caregiver/*`):** Privacy-conscious, permission-based view to support loved ones with reminders and recovery status.
3. **Clinician (`/clinician/*`):** Caseload triage, longitudinal recovery trajectories, risk classification (`Stable`, `Review`, `Elevated`), clinical encounters, and alerts.
4. **Organization / Admin (`/admin/*`):** Population metrics, cohort comparisons, user provisioning, security audit logs, and organization settings.

---

## 2. Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack support)
- **Language:** TypeScript 5.7 (strict mode enabled in `tsconfig.json`)
- **UI Library:** React 19
- **Authentication:** [Clerk](https://clerk.com/) (`@clerk/nextjs`) integrated with Convex (`ConvexProviderWithClerk`)
- **Backend & Database:** [Convex](https://convex.dev/) reactive backend
- **Primitives & Components:** [Radix UI](https://www.radix-ui.com/) (`@radix-ui/react-*`), [Shadcn UI](https://ui.shadcn.com/) architecture, [Lucide React](https://lucide.dev/) icons
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with `@theme inline` and `tw-animate-css`
- **Charts & Data Viz:** [Recharts](https://recharts.org/)
- **Utility Libraries:** `clsx`, `tailwind-merge`, `class-variance-authority` (CVA)
- **Git Hooks & Quality:** Husky, Commitlint (`@commitlint/config-conventional`), Commitizen (`cz-conventional-changelog`)
- **Package Manager:** `pnpm`

---

## 3. Repository Directory Map

```
.
├── AGENTS.md                   # This instruction file for AI agents
├── app/                        # Next.js App Router root
│   ├── (admin)/                # Organization & Admin workspace
│   ├── (auth)/                 # Clerk authentication routes (/sign-in, /sign-up)
│   ├── (caregiver)/            # Caregiver workspace
│   ├── (clinician)/            # Clinician & Clinical workspace
│   ├── (patient)/              # Patient recovery workspace
│   ├── globals.css             # Tailwind v4 theme variables & base styles
│   ├── layout.tsx              # Root HTML layout with Google Inter & Geist Mono fonts
│   └── page.tsx                # Landing page & workspace selector
├── components/                 # Component library
│   ├── admin/                  # Admin & organization widgets (audit log, invite modal, etc.)
│   ├── caregiver/              # Caregiver-specific components
│   ├── clinician/              # Caseload table, alerts list, encounter modal, detail view
│   ├── dashboard/              # Stat cards, trend charts, score gauges, daily plans, insights
│   ├── forms/                  # 20+ accessible form fields + field wrapper system
│   ├── layouts/                # DashboardLayout, Sidebar, Header, PageHeader
│   ├── messages/               # Split-pane secure messaging chat component
│   ├── patient/                # Check-in flow, care plan, timeline, patient profile
│   ├── providers/              # Convex & Clerk unified client provider
│   ├── reports/                # Printable recovery summary reports
│   └── ui/                     # Primitives (Button, Badge, Card)
├── convex/                     # Convex reactive backend schema, functions & auth config
│   ├── auth.config.ts          # Clerk JWT authentication verification for Convex
│   ├── schema.ts               # Database schema definition
│   └── ...                     # Reactive queries, mutations and actions
├── docs/                       # Project documentation
│   ├── base.md                 # Concussion Recovery Intelligence product vision and safety boundaries
│   ├── CLINICAL_SCOPE_AND_SAFETY.md # Clinical scope, safety boundaries, evidence governance & PR review checklist
│   ├── concussion-demo-review.md # Current demo baseline, PR #39 summary, and GitHub backlog
│   └── frontend-design-specs.md  # Detailed frontend design system specifications
├── lib/
│   ├── cri-data.ts             # Mock datasets, role types, navigation configurations
│   └── utils.ts                # cn() helper (clsx + tailwind-merge)
├── middleware.ts               # Clerk route protection & auth middleware
├── components.json             # Shadcn configuration
├── commitlint.config.mjs       # Conventional commits linting configuration
├── next.config.mjs             # Next.js configuration & security headers
├── package.json                # Project dependencies & scripts
└── tsconfig.json               # TypeScript configuration with @/* aliases
```

---

## 4. Development Workflows & Commands

Use `pnpm` to run commands:

```bash
# Install dependencies
pnpm install

# Start development server (Turbopack)
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Interactive conventional commit wizard
pnpm commit
```

---

## 5. Coding & Architecture Guidelines for Agents

### 5.1 Design System & Theming
- **Color Tokens:** Never use hardcoded arbitrary color values in components (e.g. avoid `bg-[#f8f7f5]`). Always use semantic Tailwind variables configured in `app/globals.css`:
  - `bg-background` / `text-foreground`
  - `bg-card` / `text-card-foreground`
  - `bg-primary` / `text-primary-foreground`
  - `bg-secondary` / `text-secondary-foreground`
  - `bg-muted` / `text-muted-foreground`
  - `bg-accent` / `text-accent-foreground`
  - `border-border` / `ring-ring`
  - Status colors: `text-destructive`, `text-success`, `text-warning`
- **Design Specifications:** Refer to `docs/frontend-design-specs.md` before adding new UI components or modifying layouts.
- **Shadows & Accents:** Use `.warm-shadow` for elevated cards and `.paper-grid` for textured backgrounds.
- **Print Styles:** Use the `.no-print` class on navigation sidebars and headers so that report pages print cleanly.

### 5.2 Component Guidelines
- **Server vs Client Components:**
  - Mark files with `'use client'` only when they use React hooks (`useState`, `useEffect`, etc.), browser APIs, or interactive event listeners.
  - Keep parent layouts and static pages as Server Components when possible.
- **Class Merging:** Always use `cn(...)` from `@/lib/utils` to combine class names safely.
- **Forms Ecosystem:** When building forms, use the components in `@/components/forms` (`TextField`, `SelectField`, `ProgressField`, `SwitchField`, `DatetimeField`, etc.). They are pre-wired with `FieldWrapper` for consistent labels, hints, and error messaging.
- **Path Aliases:** Always use `@/` path alias for imports (e.g., `@/components/...`, `@/lib/...`).

### 5.3 Types & Shared Data
- Shared mock data, role definitions, and navigation structures live in `lib/cri-data.ts`.
- Types should be explicitly exported and typed. Avoid `any` where possible.

### 5.4 Commit Message Standard
All commit messages must adhere to the Conventional Commits specification:
- `feat: <description>` — New feature
- `fix: <description>` — Bug fix
- `docs: <description>` — Documentation update
- `refactor: <description>` — Code refactor without feature changes
- `style: <description>` — Styling/formatting changes
- `chore: <description>` — Build, dependencies, or tooling changes

---

## 6. Verification Checklist for Agents

When completing a task, verify:
1. `pnpm build` succeeds without TypeScript or Next.js build errors.
2. Responsive design works across mobile (`< 768px`), tablet (`768px - 1024px`), and desktop (`> 1024px`).
3. Focus states (`focus-visible`) and keyboard navigation remain accessible.
4. Clean component props and TypeScript interfaces are provided.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
