# AGENTS.md — Agent & Developer Guide for CRI

Welcome to the **CRI (Care Recovery Intelligence)** codebase. This document outlines the project architecture, tech stack, coding standards, design system rules, and workflows for AI agents and human contributors.

---

## 1. Project Overview & Mission

**CRI** is a coordinated recovery workspace designed to unify patient-reported outcomes, care plans, and clinical telemetry for post-operative recovery.

The application serves four primary personas via route groups:
1. **Patient (`/patient/*`):** Daily recovery check-ins, score tracking, care plan adherence, educational insights, messages, and reports.
2. **Caregiver (`/caregiver/*`):** Privacy-conscious, permission-based view to support loved ones with reminders and recovery status.
3. **Clinician (`/clinician/*`):** Caseload triage, longitudinal recovery trajectories, risk classification (`Stable`, `Review`, `Elevated`), clinical encounters, and alerts.
4. **Organization / Admin (`/admin/*`):** Population metrics, cohort comparisons, user provisioning, security audit logs, and organization settings.

---

## 2. Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack support)
- **Language:** TypeScript 5.7 (strict mode enabled in `tsconfig.json`)
- **UI Library:** React 19
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
│   ├── reports/                # Printable recovery summary reports
│   └── ui/                     # Primitives (Button, Badge, Card)
├── docs/                       # Project documentation
│   └── frontend-design-specs.md# Detailed frontend design system specifications
├── lib/
│   ├── cri-data.ts             # Mock datasets, role types, navigation configurations
│   └── utils.ts                # cn() helper (clsx + tailwind-merge)
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
