# CRI Comprehensive Functional Baseline & Visual Regression Matrix (PR #39 Baseline)

## Executive Summary & Objective

**Document ID:** CRI-SPEC-BASELINE-001  
**Baseline Version:** 1.0.0 (PR #39 Merged Baseline)  
**Date:** September 1, 2026  
**Status:** Approved / Active Baseline  
**Objective:** Establish a verifiable, exhaustive functional and visual baseline of the current **Concussion Recovery Intelligence (CRI)** application across all 22 routes, multi-role shells, form fields, interactive states, safety copy, and clinical safety invariants. This ensures that upcoming full-stack backend integrations (Convex reactive persistence, Clerk RBAC enforcement, Safety Engine rules, RAG educational retrieval) and UI enhancements do not break or regress concussion-aligned workflows.

---

## 1. Global Shell & Layout Architecture Baseline

The application architecture utilizes Next.js 16 App Router with route groups for role segregation (`(admin)`, `(caregiver)`, `(clinician)`, `(patient)`, `(auth)`), wrapped in a shared layout shell system.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        RootLayout (app/layout.tsx)                         │
│       • Fonts: Inter (sans) & Geist Mono (mono)                            │
│       • ConvexClientProvider (Clerk + Convex Reactive Client)             │
│       • Global Design System: CSS Variables (--color-*) in globals.css     │
├────────────────────────────────────────────────────────────────────────────┤
│                    DashboardLayout (components/layouts)                    │
│ ┌───────────────────────┬────────────────────────────────────────────────┐ │
│ │ Sidebar               │ Header                                         │ │
│ │ • Width: w-64         │ • Sticky top-0 z-20 with backdrop blur         │ │
│ │ • Contextual nav      │ • Role switcher dropdown (Demo role changer)   │ │
│ │ • Mobile drawer state │ • Notifications button (Badge dot indicator)   │ │
│ │ • Prototype footer tag│ • Clerk UserButton (signed-in) / Sign-in modal │ │
│ └───────────────────────┴────────────────────────────────────────────────┘ │
│ │ Main View Container (max-w-[1440px], px-4 md:px-7 lg:px-8, warm-shadow)  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Global Layout Components

| Component | File Path | Current State | Interactive States & Capabilities | Data Source |
| :--- | :--- | :--- | :--- | :--- |
| **`DashboardLayout`** | [`dashboard-layout.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/layouts/dashboard-layout.tsx) | Functional | Manages mobile drawer toggle state (`sidebarOpen`); injects `Sidebar`, `Header`, and responsive container. | Local React State |
| **`Sidebar`** | [`sidebar.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/layouts/sidebar.tsx) | Functional | Responsive drawer (`-translate-x-full` on mobile, fixed on `lg:`), active link highlighting (`usePathname`), prototype environment disclaimer. | [`lib/cri-data.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/lib/cri-data.ts) (`nav`) |
| **`Header`** | [`header.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/layouts/header.tsx) | Functional | Mobile menu trigger, role switching `<Select>` (navigates via `router.push`), notification trigger, Clerk `<UserButton>` / `<SignInButton>` toggle. | [`lib/cri-data.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/lib/cri-data.ts) (`roles`), Clerk Auth |
| **`PageHeader`** | [`page-header.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/layouts/page-header.tsx) | Functional | Standardized page header with `eyebrow`, `title`, `description`, and `action` slot. | Props |
| **`ConvexClientProvider`** | [`convex-client-provider.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/providers/convex-client-provider.tsx) | Functional | `ConvexProviderWithClerk` wrapping `ClerkProvider` for client-side authentication and reactive Convex synchronization. | Clerk + Convex Client |

---

## 2. Inventory of 22 Application Routes & Capability Classification Matrix

### Capability Status Legend:
- **`Functional`**: Fully working client-side or integrated UI with real state, validation, and interactivity.
- **`Simulated`**: Working UI populated with mocked in-memory datasets (`cri-data.ts` or local component state) that reset on page reload.
- **`Partially Connected`**: UI wired to Clerk or Convex client, but backend schema/queries are in a legacy state or missing mutations.
- **`Blocked`**: Intentionally disabled UI state or awaiting upstream infrastructure.

### 2.1 Public & Gateway Routes (1 Route + 2 Auth Routes)

| # | Route | Route Path & File | Primary Components | CTAs, Forms & Interactive Elements | Current Data Source | Classification | Expected Behavior vs Current State |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Landing / Gateway** | `/`<br>[`app/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/page.tsx) | Hero section, Portal Grid cards, Global Nav | • "Explore patient view" button<br>• "Explore clinical view" button<br>• 4 Portal Cards (`/patient/dashboard`, `/caregiver/dashboard`, `/clinician/dashboard`, `/admin/dashboard`)<br>• Clerk Sign In / Get Started buttons | In-memory `portals` array | **Functional** | **Expected:** Directs users to selected portal or opens Clerk modal.<br>**Current:** Perfectly functional navigation and Clerk modal triggers. |
| **—** | **Sign In** | `/sign-in/[[...sign-in]]`<br>[`app/(auth)/sign-in/...`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(auth)/sign-in/[[...sign-in]]/page.tsx) | Clerk `<SignIn>` | Clerk OAuth / Email authentication form | Clerk Auth API | **Functional** | **Expected:** Authenticates user and redirects to assigned workspace.<br>**Current:** Standard Clerk modal/page rendering. |
| **—** | **Sign Up** | `/sign-up/[[...sign-up]]`<br>[`app/(auth)/sign-up/...`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(auth)/sign-up/[[...sign-up]]/page.tsx) | Clerk `<SignUp>` | Clerk registration form | Clerk Auth API | **Functional** | **Expected:** Creates Clerk user profile.<br>**Current:** Standard Clerk signup flow. |

---

### 2.2 Patient Recovery Portal (8 Routes)

| # | Route | Route Path & File | Primary Components | CTAs, Forms & Interactive Elements | Current Data Source | Classification | Expected Behavior vs Current State |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **2** | **Patient Dashboard** | `/patient/dashboard`<br>[`app/(patient)/patient/dashboard/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/dashboard/page.tsx) | `ScoreGauge`, `TrendChart`, `StatCard` (3), `TodayPlan`, `InsightCard` | • "Start daily check-in" CTA<br>• Today's recovery plan checklist toggles<br>• "View plan" link | Hardcoded constants & `cri-data.ts` | **Simulated** | **Expected:** Displays authenticated patient's live daily score, 7-day trend, and checklist.<br>**Current:** Renders static 15/48 ScoreGauge and in-memory checklist toggles. |
| **3** | **Daily Check-In** | `/patient/check-in`<br>[`app/(patient)/patient/check-in/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/check-in/page.tsx) | `CheckInFlow` (Multi-step wizard) | • 8 Symptom rating sliders (0–6)<br>• Danger signs multi-checkbox<br>• Activity impact radio (`yes`/`no`/`not-sure`)<br>• Context textarea (250 char limit)<br>• Emergency Intercept with "Call 911" link (`tel:911`)<br>• "Finish check-in" button | Component `useState` (Session-only) | **Functional** (UI/Logic) / **Simulated** (Storage) | **Expected:** Submits check-in to Convex backend and evaluates safety rules.<br>**Current:** Full interactive multi-step flow with danger-sign intercept, but responses reset on reload. |
| **4** | **Recovery Timeline** | `/patient/recovery`<br>[`app/(patient)/patient/recovery/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/recovery/page.tsx) | `RecoveryTimeline`, `TrendChart` (clinical dual-axis), Milestones list, `StatCard` (3) | • Trajectory chart inspection<br>• Milestone progression nodes | In-memory milestone array & `cri-data.ts` | **Simulated** | **Expected:** Real longitudinal log data with timestamped clinical encounters.<br>**Current:** Renders static mock milestones (Aug 19–Sep 3) and dual-axis chart. |
| **5** | **Recovery Insights** | `/patient/insights`<br>[`app/(patient)/patient/insights/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/insights/page.tsx) | `InsightCard`, 3 Insight Grid Cards with confidence badges, Disclaimer | • "View evidence" action links on each card | In-memory pattern array | **Simulated** | **Expected:** Derived from statistical pattern engine over $\ge 5$ check-ins with RAG citations.<br>**Current:** Displays static pattern copy adhering to non-causality language standards. |
| **6** | **Care Plan** | `/patient/plan`<br>[`app/(patient)/patient/plan/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/plan/page.tsx) | `CarePlanSection`, `TodayPlan`, Reminders Card, Upcoming Care Card | • Checklist toggles<br>• "Week view" button<br>• "View appointment" link | In-memory plan items & `useState` | **Simulated** | **Expected:** Clinician-assigned care plan tasks fetched from Convex `carePlans`.<br>**Current:** Static reminder cards and in-memory checklist toggles. |
| **7** | **Messages** | `/patient/messages`<br>[`app/(patient)/patient/messages/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/messages/page.tsx) | `MessagesChatView` (Split-pane chat) | • Search care team input<br>• Care team selector<br>• Message composition `TextField`<br>• Send message button / form submit | Component `useState` (Appends to local message array) | **Functional** (UI) / **Simulated** (Storage) | **Expected:** Realtime bidirectional messaging via Convex `messages` table.<br>**Current:** Allows sending messages during active session; resets on page refresh. |
| **8** | **Recovery Reports** | `/patient/reports`<br>[`app/(patient)/patient/reports/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/reports/page.tsx) | `RecoveryReportsView`, `StatCard` (3), Summary Sheet, Disclaimer | • "Generate report" (`window.print()` trigger)<br>• "Preview" button<br>• "Share" button | In-memory report summary & `cri-data.ts` | **Functional** (Print) / **Simulated** (Data) | **Expected:** Dynamic PDF/print generation from historical Convex check-in database.<br>**Current:** Clean print stylesheet (`no-print` hiding headers/nav) printing formatted mock summary card. |
| **9** | **Profile & Preferences** | `/patient/profile`<br>[`app/(patient)/patient/profile/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/profile/page.tsx) | `PatientProfileForm`, 2 Form Section Cards | • Full Name `TextField`<br>• Email `TextField`<br>• Phone `PhoneField`<br>• Color theme `ColorPickerField`<br>• Daily SMS `SwitchField`<br>• High contrast `SwitchField`<br>• Wearables `SwitchField` (**Disabled**)<br>• "Save Preferences" button | Component `useState` | **Functional** (Inputs) / **Blocked** (Wearables) | **Expected:** Persists preferences to user account.<br>**Current:** Interactive form state with disabled wearable sync toggle explaining planned prototype status. |

---

### 2.3 Caregiver Portal (3 Routes)

| # | Route | Route Path & File | Primary Components | CTAs, Forms & Interactive Elements | Current Data Source | Classification | Expected Behavior vs Current State |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **10** | **Caregiver Dashboard** | `/caregiver/dashboard`<br>[`app/(caregiver)/caregiver/dashboard/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(caregiver)/caregiver/dashboard/page.tsx) | `CaregiverOverview`, `StatCard` (3), `TrendChart`, "How you can help" Card | • "Access approved" security badge<br>• Trend chart inspection<br>• Supportive care tip list | `cri-data.ts` (`recoveryTrend`) & static copy | **Simulated** | **Expected:** Permission-gated view of assigned loved one's non-private recovery signals.<br>**Current:** Static overview for Maya Chen (P-1042) with privacy notice banner. |
| **11** | **Patient Detail (Caregiver)** | `/caregiver/patient/[id]`<br>[`app/(caregiver)/caregiver/patient/[id]/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(caregiver)/caregiver/patient/[id]/page.tsx) | `CaregiverOverview` (Parameterized) | • Dynamic `patientId` routing<br>• Access verification badge | Next.js dynamic params + `cri-data.ts` | **Simulated** | **Expected:** Resolves specific patient ID authorized for caregiver.<br>**Current:** Accepts `id` parameter (e.g. `P-1042`) and renders caregiver overview. |
| **12** | **Caregiver Messages** | `/caregiver/messages`<br>[`app/(caregiver)/caregiver/messages/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(caregiver)/caregiver/messages/page.tsx) | `MessagesChatView` | • Search input<br>• Care team selector<br>• Message composer & submit | Component `useState` | **Functional** (UI) / **Simulated** (Storage) | **Expected:** Multi-party messaging between caregiver, patient, and clinician.<br>**Current:** Reusable chat interface with session-only message list. |

---

### 2.4 Clinician & Clinical Caseload Portal (5 Routes)

| # | Route | Route Path & File | Primary Components | CTAs, Forms & Interactive Elements | Current Data Source | Classification | Expected Behavior vs Current State |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **13** | **Clinician Dashboard** | `/clinician/dashboard`<br>[`app/(clinician)/clinician/dashboard/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(clinician)/clinician/dashboard/page.tsx) | `CaseloadOverview`, `StatCard` (4), `TrendChart`, Priority Alerts Card, `PatientTable`, `UserInviteModal` | • "Enroll Patient" header button<br>• Patient search filter<br>• Patient row navigation links (`/clinician/patients/[id]`)<br>• Priority alert list | `cri-data.ts` (`patients`, `alerts`, `recoveryTrend`) | **Simulated** | **Expected:** Realtime caseload risk triage (`Stable`, `Review`, `Elevated`) from Convex `patients` & `alerts`.<br>**Current:** Interactive table search, working enroll modal with form fields, mock caseload metrics. |
| **14** | **Patient Caseload** | `/clinician/patients`<br>[`app/(clinician)/clinician/patients/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(clinician)/clinician/patients/page.tsx) | `PatientTable`, `UserInviteModal` | • Search by name / recovery context<br>• "Enroll New Patient" CTA<br>• Row click to detail view | `cri-data.ts` (`patients`) | **Functional** (Search/Modal) / **Simulated** (Data) | **Expected:** Paginated, filtered directory of all assigned patients.<br>**Current:** Live client-side text filtering over 5 mock patients with Attention badges (`Routine`, `Review`, `Safety`). |
| **15** | **Patient Detail (Clinician)** | `/clinician/patients/[id]`<br>[`app/(clinician)/clinician/patients/[id]/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(clinician)/clinician/patients/[id]/page.tsx) | `PatientDetailView`, `StatCard` (4), `TrendChart` (clinical), `InsightCard`, `ClinicalEncounterModal` | • "Add clinical note" header CTA<br>• Encounter modal form (Encounter type toggle, review context combobox, datetime, notes textarea, file upload)<br>• Recent check-ins list | Dynamic param + `cri-data.ts` | **Functional** (Modal/UI) / **Simulated** (Data) | **Expected:** Longitudinal patient trajectory with encounter creation saving to Convex `clinicalEncounters`.<br>**Current:** Full encounter modal with Radix dialog and accessible form fields; triggers completion alert. |
| **16** | **Clinical Alerts** | `/clinician/alerts`<br>[`app/(clinician)/clinician/alerts/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(clinician)/clinician/alerts/page.tsx) | `ClinicalAlertsList` | • Filter buttons ('All', 'High priority', 'Unassigned', 'Resolved')<br>• "Acknowledge" button per alert (toggles to 'Acknowledged') | `cri-data.ts` (`alerts`) + local `resolved` state | **Functional** (Filter/Ack) / **Simulated** (Data) | **Expected:** Live triage queue with Convex mutation acknowledging/resolving alerts.<br>**Current:** Interactive acknowledge state toggle on mock alerts (James Kim, Daniel Ortiz, Maya Chen). |
| **17** | **Clinician Reports** | `/clinician/reports`<br>[`app/(clinician)/clinician/reports/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(clinician)/clinician/reports/page.tsx) | `RecoveryReportsView` | • "Generate report" (`window.print()`)<br>• "Preview" & "Share" buttons | `cri-data.ts` | **Functional** (Print) / **Simulated** (Data) | **Expected:** Provider summary export with clinical encounter timeline.<br>**Current:** Print-optimized report preview with disclaimer. |

---

### 2.5 Administrator & Organization Portal (5 Routes)

| # | Route | Route Path & File | Primary Components | CTAs, Forms & Interactive Elements | Current Data Source | Classification | Expected Behavior vs Current State |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **18** | **Organization Overview** | `/admin/dashboard`<br>[`app/(admin)/admin/dashboard/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(admin)/admin/dashboard/page.tsx) | `OrganizationOverview`, `StatCard` (4), `TrendChart`, Risk Distribution bars, Pathway Performance grid | • Operational metric review<br>• Pathway performance inspect | Static aggregate mock values | **Simulated** | **Expected:** Live de-identified population analytics across enrolled cohorts.<br>**Current:** Renders 1,248 enrolled patients metric, 86.4% engagement, and risk bars (78% Stable, 17% Review, 5% Elevated). |
| **19** | **Cohort Outcomes** | `/admin/cohorts`<br>[`app/(admin)/admin/cohorts/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(admin)/admin/cohorts/page.tsx) | `OrganizationOverview` (`isCohorts={true}`) | • Cohort outcome inspection<br>• Pathway comparative cards | Static aggregate mock values | **Simulated** | **Expected:** Multi-cohort comparative analytics.<br>**Current:** Reuses `OrganizationOverview` with 'Cohort outcomes' header title. |
| **20** | **Users & Roles** | `/admin/users`<br>[`app/(admin)/admin/users/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(admin)/admin/users/page.tsx) | `PatientTable`, `UserInviteModal` | • "Invite user" CTA<br>• Search users input<br>• Registration modal with Role select, BirthDate calendar, Phone, Newsletter switch | `cri-data.ts` (`patients`) + Form State | **Functional** (Modal/UI) / **Simulated** (Data) | **Expected:** RBAC user provisioning connected to Clerk & Convex `users` table.<br>**Current:** Complete accessible user invite modal with form fields; triggers success alert. |
| **21** | **Audit Log** | `/admin/audit`<br>[`app/(admin)/admin/audit/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(admin)/admin/audit/page.tsx) | `AuditLogTable` | • Tabular audit trail inspection (Time, Actor, Event, Resource) | In-memory `auditEvents` array | **Simulated** | **Expected:** Immutable audit logs written by Convex mutations for compliance.<br>**Current:** Formatted table displaying mock audit records (Dr. Brooks, Admin Lee, Maya Chen). |
| **22** | **Organization Settings** | `/admin/settings`<br>[`app/(admin)/admin/settings/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(admin)/admin/settings/page.tsx) | `OrganizationSettingsForm` | • Settings category nav (Org, Roles, Alerts, Integrations, Governance)<br>• Org Name `TextField`<br>• Contact Email `TextField`<br>• Retention Policy `SelectField`<br>• Cohort Capacity `NumberField`<br>• Fee `CurrencyField`<br>• Accent `ColorPickerField`<br>• Active Pathways `MultiSelectField`<br>• Auto-escalation `SwitchField`<br>• "Save changes" CTA | Component `useState` | **Functional** (Inputs) / **Simulated** (Persistence) | **Expected:** Persists organization parameters to backend.<br>**Current:** Full rich interactive form with 8 field types. |

---

## 3. Responsive Reference States Matrix

All 22 routes must adhere to responsive design criteria across three canonical viewport breakpoints and print stylesheets:

| Viewport / Media | Breakpoint Range | Shell Behavior | Grid & Layout Adaptations | Touch & Accessibility Targets |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `< 768px` (320px–767px) | • Sidebar collapses to hidden drawer (`-translate-x-full`).<br>• Hamburger menu button visible in Header.<br>• Header role switcher compact width (`w-36`).<br>• Sign-in/Sign-up text hidden; avatar / icon visible. | • Multi-column grids collapse to single column (`grid-cols-1`).<br>• Tables switch to horizontal scroll container.<br>• Split-pane chat stacks search/roster above messages.<br>• Modals occupy full screen width with 16px margins. | • Minimum touch targets $\ge 44 \times 44\text{ px}$.<br>• Check-in Likert slider has large drag handle.<br>• Danger signs checkboxes have full-width tap area. |
| **Tablet** | `768px`–`1024px` | • Sidebar remains collapsible drawer.<br>• Header displays role label and text action buttons.<br>• Stat card grids switch to 2 or 3 columns (`md:grid-cols-3` or `md:grid-cols-2`). | • Dashboard charts adapt height to 220px.<br>• Modals render at max-w-lg centered with overlay.<br>• Forms display 2-column input rows (`sm:grid-cols-2`). | • Standard tablet touch targets.<br>• Accessible focus rings on keyboard navigation. |
| **Desktop** | `> 1024px` (`lg:`, `xl:`, `2xl:`) | • Sidebar permanently pinned at left (`w-64`, `lg:translate-x-0`).<br>• Content offset by `lg:pl-64`.<br>• Hamburger menu hidden (`lg:hidden`).<br>• Header sticky with max container `max-w-[1440px]`. | • Asymmetric dashboard layouts (`lg:grid-cols-[1fr_1.7fr]`, `lg:grid-cols-[1.6fr_1fr]`).<br>• Split-pane chat side-by-side (260px roster + dynamic conversation pane).<br>• 4-column KPI cards (`md:grid-cols-4`). | • Keyboard shortcuts, autofocus traps in modals, full ARIA descriptions. |
| **Print** | `@media print` | • `.no-print` class suppresses Sidebar, Header, Mobile menu, Action buttons.<br>• Backgrounds force light mode paper print.<br>• Breadcrumbs and page headers formatted cleanly. | • Report summary cards expand to full printable page width.<br>• Disclaimers and source metadata remain pinned at bottom. | • High contrast grayscale-compatible typography. |

---

## 4. Core Concussion & Safety Invariants (PR #39 Baseline Protections)

The following invariants were established in PR #39 to replace legacy orthopedic artifacts with evidence-grounded concussion recovery standards. **Any pull request modifying these elements must be blocked unless accompanied by an explicit clinical decision record.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MANDATORY SAFETY INVARIANTS                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. 8-Symptom Inventory: Rated 0 (None) to 6 (Severe)                        │
│ 2. Patient-Reported Symptom Total: Sum 0–48 (NEVER "Recovery Score")        │
│ 3. CDC Danger Signs Intercept: Immediate 911 / ED Escalation Priority       │
│ 4. Non-Causal Pattern Phrasing: Temporal associations only                  │
│ 5. Disabled Wearables: "Wearable data sync (planned)" disclaimer            │
│ 6. Permanent Disclaimers: Non-diagnostic prototype notice on all views      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 The Eight-Symptom Likert Inventory
Defined in [`check-in-flow.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/patient/check-in-flow.tsx#L11-L52) based on CDC HEADS UP and Amsterdam 2022 consensus:
1. `headache` — "How strong was your headache today?"
2. `dizziness` — "How much dizziness or trouble with balance did you have?"
3. `nausea` — "How much nausea did you experience?"
4. `lightSensitivity` — "How sensitive were you to light?"
5. `noiseSensitivity` — "How sensitive were you to noise?"
6. `fatigue` — "How much fatigue or low energy did you have?"
7. `concentration` — "How difficult was it to concentrate?"
8. `sleepDifficulty` — "How much difficulty did you have with sleep?"

*Rule:* Scale is strictly integer 0 (None) to 6 (Severe). No symptom category may be deleted or combined.

### 4.2 Tier 1 Red-Flag Danger Signs Intercept
Defined in [`check-in-flow.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/patient/check-in-flow.tsx#L54-L63):
- Worsening headache that does not go away
- Repeated vomiting
- Seizure or convulsion
- Slurred speech or unusual behavior
- Increasing confusion, restlessness, or agitation
- Weakness, numbness, or decreased coordination
- One pupil larger than the other
- Extreme drowsiness, loss of consciousness, or difficulty waking up

*Behavioral Invariant:* If any danger sign is checked, the "Continue" CTA immediately transforms into **"View urgent guidance"** (`bg-destructive`). Stepping forward bypasses standard check-in completion and presents a high-visibility emergency alert card with tap-to-call 911 link (`tel:911`). Standard check-in completion is prohibited.

### 4.3 Metric Terminology & Copy Standards
- **Standard Term:** *"Patient-Reported Symptom Total (0–48)"* or *"Symptom total"*.
- **Prohibited Terms:** *"Recovery Score"*, *"Healing Index"*, *"Health Grade"*, *"Concussion Cure Rating"*.
- **Gauge Subtitle:** *"Patient-reported total across eight tracked symptoms. Not a clinical recovery score."*

### 4.4 Wearable Data State Invariant
- Location: [`patient-profile-form.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/patient/patient-profile-form.tsx#L77-L82).
- Status: **Disabled Switch** (`disabled={true}`).
- Mandatory Copy: Label: *"Wearable data sync (planned)"*, Sublabel: *"Not connected in this prototype. No device data is being collected."*
- Prohibited Action: Do not claim live Apple Health, Health Connect, or device syncing without approved hardware adapters.

### 4.5 Pattern Phrasing & Non-Causality
- Location: [`insight-card.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/dashboard/insight-card.tsx), [`patient/insights/page.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/app/(patient)/patient/insights/page.tsx).
- Phrasing Standard: *"Shorter sleep and higher headache ratings appeared together"*, *"CRI found a temporal association in simulated check-in data. It does not establish cause."*
- Prohibited Phrasing: *"Screen time caused your headache"*, *"Sleep deprivation triggered symptoms"*.

---

## 5. Role-Specific Regression Matrix & Minimum Smoke Test Protocols

### 5.1 Patient Role Smoke Test Protocol (`/patient/*`)
1. **P-SMOKE-01 (Dashboard Load):** Navigate to `/patient/dashboard`. Verify PageHeader displays "Good morning, Maya", ScoreGauge shows "15 of 48", 7-day trajectory chart renders, and 3 StatCards are visible.
2. **P-SMOKE-02 (Routine Check-in):** Click "Start daily check-in" -> Complete 8 symptom ratings (0–6) -> Leave danger signs empty -> Select "No" for activity impact -> Click "Finish check-in". Verify completion screen shows symptom total and disclaimer.
3. **P-SMOKE-03 (Danger Sign Intercept):** Start check-in -> Rate symptoms -> Check "Repeated vomiting" -> Verify button switches to "View urgent guidance" -> Click -> Verify Emergency 911 screen appears with `tel:911` link.
4. **P-SMOKE-04 (Recovery Timeline):** Navigate to `/patient/recovery`. Verify dual-axis trajectory chart and 4 milestones render.
5. **P-SMOKE-05 (Care Plan Interaction):** Navigate to `/patient/plan`. Toggle checklist item checkbox; verify line-through styling and remaining count update.
6. **P-SMOKE-06 (Messaging):** Navigate to `/patient/messages`. Type message in `TextField` -> Click Send -> Verify message appears in right-aligned conversation bubble.
7. **P-SMOKE-07 (Print Report):** Navigate to `/patient/reports`. Click "Generate report" -> Verify print preview opens without layout destruction.
8. **P-SMOKE-08 (Profile Wearable Check):** Navigate to `/patient/profile`. Verify "Wearable data sync (planned)" switch is disabled.

### 5.2 Caregiver Role Smoke Test Protocol (`/caregiver/*`)
1. **CG-SMOKE-01 (Dashboard Load):** Switch role to Caregiver -> Navigate to `/caregiver/dashboard`. Verify "Access approved" badge, Maya Chen's symptom total (15/48), and support suggestions render.
2. **CG-SMOKE-02 (Dynamic Route):** Navigate to `/caregiver/patient/P-1042`. Verify view resolves patient ID correctly.
3. **CG-SMOKE-03 (Caregiver Messaging):** Navigate to `/caregiver/messages`. Verify chat interface loads and accepts input.

### 5.3 Clinician Role Smoke Test Protocol (`/clinician/*`)
1. **CL-SMOKE-01 (Caseload Dashboard):** Switch role to Clinician -> Navigate to `/clinician/dashboard`. Verify 4 KPI cards (42 active patients, 6 needs review, 87% check-in rate, 24/48 avg symptoms) and Priority Alerts render.
2. **CL-SMOKE-02 (Patient Search):** Type "Maya" in table SearchField -> Verify table filters to Maya Chen (P-1042).
3. **CL-SMOKE-03 (Patient Detail Navigation):** Click "Maya Chen" in table -> Navigate to `/clinician/patients/P-1042`. Verify patient header and clinical trajectory chart render.
4. **CL-SMOKE-04 (Clinical Encounter Modal):** On patient detail view, click "Add clinical note" -> Fill out encounter type, diagnosis, datetime, notes -> Click "Save Encounter" -> Verify alert confirms save and modal closes.
5. **CL-SMOKE-05 (Alerts Triage):** Navigate to `/clinician/alerts`. Click "Acknowledge" on James Kim alert -> Verify button text updates to "Acknowledged".
6. **CL-SMOKE-06 (Enroll Patient Modal):** Navigate to `/clinician/patients` -> Click "Enroll New Patient" -> Fill form -> Submit -> Verify success alert.

### 5.4 Organization / Admin Smoke Test Protocol (`/admin/*`)
1. **AD-SMOKE-01 (Org Dashboard):** Switch role to Organization -> Navigate to `/admin/dashboard`. Verify 1,248 enrolled patients metric, Risk Distribution bars, and pathway cards render.
2. **AD-SMOKE-02 (Cohorts View):** Navigate to `/admin/cohorts`. Verify Cohort outcomes page renders properly.
3. **AD-SMOKE-03 (User Invite Modal):** Navigate to `/admin/users`. Click "Invite user" -> Verify registration dialog opens with role selector and date field.
4. **AD-SMOKE-04 (Audit Log Table):** Navigate to `/admin/audit`. Verify 5 audit log rows render with monospace timestamps and IDs.
5. **AD-SMOKE-05 (Settings Form):** Navigate to `/admin/settings`. Modify Org Name and Retention Policy -> Click "Save changes".

---

## 6. Known Technical & Architectural Debt Registry

Before proceeding with full-stack backend integration, the following debt items must be addressed or accounted for in migration plans:

| Category | Item ID | Description & Current State | Affected Files | Migration / Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Schema** | **DEBT-01** | **Resolved (Issue #6):** Replaced legacy post-surgical table fields (`procedure`, `surgeon`, `surgeryDate`) with `incidentDate`, `injuryContext`, and ID-based clinician relations. | [`convex/schema.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/convex/schema.ts), [`convex/migrations.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/convex/migrations.ts) | Fully migrated to longitudinal concussion model with automated transformers and rollback testing. |
| **Backend Schema** | **DEBT-02** | **Resolved (Issue #6):** `checkIns` schema standardized on 8 concussion symptoms (0–6 Likert), danger signs, activity impact, and non-diagnostic `symptomTotal` (0–48). | [`convex/schema.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/convex/schema.ts), [`convex/checkIns.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/convex/checkIns.ts) | Fully migrated; legacy composite recovery score formulas removed. |
| **Backend Schema** | **DEBT-03** | **Resolved (Issue #6):** `carePlans.category` updated to concussion pacing, education, and accommodation categories. | [`convex/schema.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/convex/schema.ts), [`convex/lib/validators.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/convex/lib/validators.ts) | Removed legacy `wound_care`; added `education` and `accommodations`. |
| **UI State** | **DEBT-04** | Daily check-in form (`CheckInFlow`) keeps responses in React `useState` and does not persist to Convex backend. | [`check-in-flow.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/patient/check-in-flow.tsx#L65-L77) | Issue #10: Wire `submitCheckIn` Convex mutation on completion. |
| **UI State** | **DEBT-05** | Split-pane messaging (`MessagesChatView`) stores chat history in component state; resets on reload. | [`messages-chat-view.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/messages/messages-chat-view.tsx#L12-L32) | Issue #27: Wire `messages.listByThread` and `messages.send` reactive Convex functions. |
| **UI State** | **DEBT-06** | Clinical encounter modal and user invite modal use browser `alert()` upon form submission. | [`clinical-encounter-modal.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/clinician/clinical-encounter-modal.tsx#L45), [`user-invite-modal.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/admin/user-invite-modal.tsx#L54) | Issue #26: Wire Convex `clinicalEncounters.create` and `users.create` mutations with toast notification feedback. |
| **Auth & RBAC** | **DEBT-07** | Demo role switcher dropdown in Header allows client-side switching without verifying Clerk organization metadata or Convex user role. | [`header.tsx`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/components/layouts/header.tsx#L57-L67) | Issue #5: Enforce server-side role-based route gating in middleware / layout wrappers for production. |
| **Hardcoded Constants** | **DEBT-08** | In-memory patient list (`patients`), alerts (`alerts`), and recovery trend (`recoveryTrend`) in `cri-data.ts`. | [`lib/cri-data.ts`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/lib/cri-data.ts) | Issue #7 & #11: Replace static imports with reactive `useQuery(api.patients.list)` and `useQuery(api.recoveryTrends.get)`. |

---

## 7. Change Control & Capability Deprecation Protocol

To ensure long-term clinical safety and prevent regressions during rapid development:
1. **Mandatory PR Review Checklist:** All pull requests touching UI copy, check-in logic, scoring formulas, or backend schema must be verified against the checklist in [`docs/CLINICAL_SCOPE_AND_SAFETY.md`](file:///c:/Users/echoe/Desktop/hack-for-humanity/hack-for-humanity/docs/CLINICAL_SCOPE_AND_SAFETY.md#L267-L283).
2. **Semantic Capability Decision Records (SCDR):** Any future modification, semantic change, or removal of an existing route, form field, safety banner, or role workflow requires a documented Decision Record citing:
   - Proposed change & rationale
   - Clinical governing authority cited (CDC, Amsterdam 2022, ONF Living Guidelines)
   - Impact assessment across all 4 personas
   - Approval by clinical contributor or project lead

---

## 8. Verification Plan & Build Confirmation

### 8.1 Automated Build Verification
- **Command:** `pnpm build` (Next.js 16.3.0 Turbopack)
- **Status:** **PASSED (Exit Code 0)**
- **Output:** Verified static prerendering and dynamic generation of all **22 application routes** + 2 Clerk auth routes:
  ```
  Route (app)
  ┌ ƒ /
  ├ ○ /_not-found
  ├ ○ /admin/audit
  ├ ○ /admin/cohorts
  ├ ○ /admin/dashboard
  ├ ○ /admin/settings
  ├ ○ /admin/users
  ├ ○ /caregiver/dashboard
  ├ ○ /caregiver/messages
  ├ ƒ /caregiver/patient/[id]
  ├ ○ /clinician/alerts
  ├ ○ /clinician/dashboard
  ├ ○ /clinician/patients
  ├ ƒ /clinician/patients/[id]
  ├ ○ /clinician/reports
  ├ ○ /patient/check-in
  ├ ○ /patient/dashboard
  ├ ○ /patient/insights
  ├ ○ /patient/messages
  ├ ○ /patient/plan
  ├ ○ /patient/profile
  ├ ○ /patient/recovery
  ├ ○ /patient/reports
  ├ ƒ /sign-in/[[...sign-in]]
  └ ƒ /sign-up/[[...sign-up]]
  ```

### 8.2 Acceptance Criteria Verification Summary

| Criteria | Status | Verification Detail |
| :--- | :---: | :--- |
| **All 22 generated routes present in matrix** | **DONE** | Fully inventoried in Section 2 with route paths, component bindings, data sources, and expected behaviors. |
| **Every CTA & form has documented expected behavior & current state** | **DONE** | Detailed in Section 2 across all 22 routes, including modals, checklists, sliders, switches, and submit triggers. |
| **Reference evidence exists for Patient, Caregiver, Clinician, and Admin** | **DONE** | Section 1, Section 2, and Section 3 map exact component references, responsive rules, and data sources across all 4 portals. |
| **Minimum smoke test defined per role** | **DONE** | Section 5 defines step-by-step smoke test sequences (P-SMOKE-01..08, CG-SMOKE-01..03, CL-SMOKE-01..06, AD-SMOKE-01..05). |
| **Safety boundaries introduced by PR #39 protected by regression checks** | **DONE** | Section 4 protects 8-symptom Likert 0-6 inventory, Tier 1 red-flag danger sign intercept, 0-48 symptom total copy standard, disabled wearable sync state, and non-causal pattern phrasing. |
| **Future removal or semantic change requires documented decision** | **DONE** | Section 7 establishes the Semantic Capability Decision Record (SCDR) protocol and clinical checklist governance. |
