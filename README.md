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

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- `pnpm` (`npm install -g pnpm`)

### Installation & Setup

```bash
# Clone repository
git clone https://github.com/caeher/hack-for-humanity.git
cd hack-for-humanity

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🧪 Build & Verification

```bash
# Type check and build for production
pnpm build

# Start production server
pnpm start

# Interactive conventional commit
pnpm commit
```

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
