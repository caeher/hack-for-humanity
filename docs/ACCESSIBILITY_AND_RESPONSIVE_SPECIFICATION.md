# Accessibility, Responsive & Localization Specification (WCAG 2.2 AA)

## 1. Overview & Clinical Concussion UX Rationale

**CRI (Care Recovery Intelligence)** is a coordinated recovery platform supporting patients recovering from mild traumatic brain injury (concussion), caregivers, clinicians, and health system administrators.

Concussion recovery places unique physiological and cognitive demands on human-computer interaction:
1. **Photophobia & Visual Sensitivity:** High contrast must be balanced with calm background tones (`#f8f7f5`) without harsh bright strobing.
2. **Cognitive Fatigue & Reduced Pacing:** Interfaces must minimize cognitive load, break long workflows into discrete steps with clear progress, and avoid unannounced layout shifts.
3. **Vestibular Sensitivity & Motion Sickness:** Parallax, spinning loaders, and decorative CSS animations can trigger dizziness, nausea, or visual vertigo. Motion must be suppressible via `prefers-reduced-motion` and user preference toggles.
4. **Color Independence & Red-Flag Guidance:** Concussion danger signs, neurological red flags (e.g. repeated vomiting, severe neck tenderness, seizure), and clinical triage levels (`Stable`, `Review`, `Elevated`) must never communicate status through color alone. Every indicator must pair distinct geometric/semantic icons (`CheckCircle2`, `AlertTriangle`, `AlertCircle`) with unambiguous textual labels.
5. **Screen Reader & Keyboard Parity:** Patients experiencing ocular strain or using screen readers must have complete access to longitudinal charts, symptom histories, care plans, and emergency guidance.

---

## 2. 22-Route Accessibility & Responsive Audit Matrix

| # | Route | Route Path | WCAG 2.2 AA Verification | 320px Mobile | Tablet (768px) | Desktop (>1024px) | Color Independence & Non-Color Cues |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Landing / Gateway | `/` | Skip link, `<main>`, `<nav aria-label>`, accessible cards | Hero & cards stack; 0 horizontal scroll | 2-column grid | 4-column grid | "Explore" CTA with distinct arrow & filled button |
| **2** | Patient Dashboard | `/patient/dashboard` | Radial meter with `role="meter"` + ARIA values; `sr-only` chart table | Gauge & cards stack vertically; no overflow | 2-col stat cards; chart responsive | 3-col stat cards; side-by-side plan | `ScoreGauge` trend badge includes `CheckCircle2` / `AlertTriangle` |
| **3** | Daily Check-In | `/patient/check-in` | `aria-live="polite"` step announcement; step focus management; slider `aria-valuetext` | Sliders & action buttons wrap cleanly at 320px | Centered container max-w-2xl | Centered container max-w-2xl | Danger-sign banner has `⚠ Urgent` alert role; Likert sliders have verbal labels |
| **4** | Recovery Timeline | `/patient/recovery` | Accessible milestone tree; dual-axis chart with hidden table | Milestones stack vertically; date labels wrap | Responsive chart height (220px) | Dual-axis clinical inspection | Distinct milestone shape icons (pulse, check, shield) |
| **5** | Recovery Insights | `/patient/insights` | Cards with `role="region"`; non-causality disclaimers preserved | Single-column insight cards | 2-column cards | 3-column cards | Confidence badges with distinct border & text tones |
| **6** | Care Plan | `/patient/plan` | Accessible checkboxes with `aria-checked`; keyboard toggleable | Task items wrap comfortably | 2-column layout | 2-column layout | Status tags have text and shape indicators |
| **7** | Messages | `/patient/messages` | `role="log"` with `aria-live="polite"`; message sender labels | Chat pane stacks above care team pane | Split pane (260px / 1fr) | Split pane (260px / 1fr) | Sender names visually & audibly announced; bubble position |
| **8** | Recovery Reports | `/patient/reports` | Printable CSS (`no-print` on nav); scroll region on symptom table | Table in `overflow-x-auto tabIndex={0}` | Centered preview card | Formatted report preview | Source badges (`patient_reported`, `clinician_authored`) |
| **9** | Profile & Preferences | `/patient/profile` | Switch controls with `role="switch"`; a11y toggles apply live | Form fields single column | 2-column card grid | 2-column card grid | Disabled wearable toggle includes explanatory copy |
| **10** | Caregiver Dashboard | `/caregiver/dashboard` | Consent boundary banner with shield icon; read-only indicators | Metric cards stack; privacy badge prominent | 2-col stat cards | 3-col stat cards | "Consent-based access" text badge with `ShieldCheck` icon |
| **11** | Caregiver Patient Detail | `/caregiver/patient/[id]` | Dynamic routing; accessible breadcrumbs; read-only check-in list | Single-column summary | 2-col summary | Full patient overview | Status badges with icons |
| **12** | Caregiver Messages | `/caregiver/messages` | Multi-party thread; `role="log"`; composer form accessible | Stacked chat layout | Split pane | Split pane | Author role explicitly labeled |
| **13** | Clinician Dashboard | `/clinician/dashboard` | Caseload summary; table keyboard scrollable; alert icons | Table scrollable with focus ring | 2-col metric cards | Caseload table + priority alerts | Attention badges: `Routine` (check), `Review` (triangle), `Safety` (alert) |
| **14** | Patient Caseload | `/clinician/patients` | Paginated table with `tabIndex={0}` scroll region; search input | Horizontal scroll container; search full-width | Paginated rows | Paginated rows | Risk level has distinct icon indicator inside badge |
| **15** | Clinician Patient Detail | `/clinician/patients/[id]` | Clinical telemetry; encounter dialog traps focus; ESC dismiss | Telemetry cards stack | Clinical chart | Side-by-side telemetry & notes | Status badges with semantic icons |
| **16** | Clinical Alerts | `/clinician/alerts` | Filter buttons with `aria-pressed`; acknowledge button aria-label | Alert cards stack action buttons | Filter bar row | Full triage list | Severity badges (`High` / `Moderate`) have icons & high contrast |
| **17** | Clinician Reports | `/clinician/reports` | Exportable report with date range select; accessible table | Table wrapped in scroll container | Printable sheet | Printable sheet | Disclaimer and provenance metadata |
| **18** | Organization Overview | `/admin/dashboard` | Metric cards; cohort distribution bars with text alternatives | Metric cards stack; risk bars labeled | 2-col stat cards | 4-col stat cards | Risk distribution bars labeled with percentage & counts |
| **19** | Cohort Outcomes | `/admin/cohorts` | Comparative cards; accessible pathway statistics | Cards stack | 2-col grid | 3-col grid | Pathway performance cards with explicit text stats |
| **20** | Users & Roles | `/admin/users` | User list table; accessible invite modal dialog with focus trap | Table scrollable | Form rows | Form rows | Role badges (`Patient`, `Clinician`, `Admin`) |
| **21** | Security Audit Log | `/admin/audit` | Monospace audit table; keyboard scrollable; event badges | Table horizontal scroll container | Full audit log | Full audit log | Severity badges with icons |
| **22** | Organization Settings | `/admin/settings` | Accessible form controls (TextField, Select, Switch, MultiSelect) | Form inputs stack single-column | 2-column grid | Full settings view | Validation errors announced |

*(Companion routes `/onboarding`, `/patient/assessment`, and `/patient/education` inherit the same AccessibilityProvider, skip links, and semantic token system).*

---

## 3. Concussion-Sensitive UX Guidelines

1. **Cognitive Calming & Low Stimulus:**
   - Background defaults to warm organic tone (`#f8f7f5`) rather than harsh blue-white `#ffffff`.
   - Card elevations use soft `.warm-shadow` (`rgba(38,27,7, 0.06)`) without stark black drop shadows.
   - Text color is warm espresso (`#261b07`), maintaining WCAG AAA contrast ratio ($> 12:1$) on card backgrounds.

2. **Step-by-Step Pacing (Check-In Wizard):**
   - Symptom check-in breaks the 8-symptom inventory into single, focused screens.
   - On step transition, keyboard and screen reader focus is programmatically shifted to the step header (`tabIndex={-1}`) so users do not experience cognitive disorientation.
   - `aria-live="polite"` announces: `"Daily check-in · Step X of 9: [Symptom Name]"`.

3. **Motion Sensitivity & Vestibular Protection:**
   - All animations and transitions are wrapped in `@media (prefers-reduced-motion: reduce)` and the user-configurable `data-reduced-motion="true"` attribute.
   - When enabled, animation durations are clamped to $0.001\text{ ms}$, stopping pulse rings, spinning loaders, and drawer slide animations immediately.

4. **Typography & 200% Zoom Compatibility:**
   - Root layout supports `data-large-text="true"` ($+15\%$ base scaling).
   - Layouts are tested up to $200\%$ browser zoom without text clipping, overlap, or horizontal page scrollbars.

---

## 4. Internationalization & Formatting Architecture

### Centralized i18n Utilities (`lib/i18n/`)
- **`formatters.ts`:**
  - `formatDate(date, options, locale, timeZone)`
  - `formatTime(date, options, locale, timeZone)`
  - `formatDateTime(date, locale, timeZone)`
  - `formatDateRange(start, end, locale, timeZone)`
  - `formatRelativeTime(value, unit, locale)`
  - `formatNumber(value, options, locale)`
  - `formatPercent(value, locale)`
  - `formatSymptomScore(score, max, locale)`
- **`translations.ts`:**
  - Centralized dictionary for all 8 symptoms, 0–6 Likert scale ratings, CDC danger signs, clinical triage statuses, and governing non-diagnostic disclaimers.
- **`locales.ts`:**
  - Supported locales (`en-US`, `en-GB`, `es-US`, `es-ES`, `fr-CA`).
  - Safe client timezone resolution and fallback logic.

### Persistence Strategy
1. **Authenticated Users:** Synced to Convex backend database via `api.profilePreferences.updateForPatient`.
2. **Demo & Guest Users:** Synced to browser `localStorage` (`cri_accessibility_preferences_v1`) and applied immediately to the document root element (`<html>` dataset attributes).

---

## 5. Screen Reader & Non-Visual Access Standards

1. **Longitudinal Charts (`TrendChart`):**
   - Contains a visually hidden table (`<div className="sr-only"><table>...</table></div>`) with date, day, symptom total, and headache values alongside the Recharts SVG.
2. **Symptom Gauges (`ScoreGauge`):**
   - Uses `role="meter"` with explicit `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and descriptive `aria-valuetext`.
3. **Scrollable Regions (`Table` & Report tables):**
   - Equipped with `tabIndex={0}`, `role="region"`, and `aria-label="Scrollable data table"` so keyboard users can scroll table columns horizontally.
4. **Skip Navigation:**
   - Accessible skip link positioned at the top of the body (`.skip-to-content`), pointing to `#main-content`.
5. **Mobile Navigation Drawer (`Sidebar`):**
   - Provides accessible backdrop, `Escape` key dismissal, focus management, and `aria-label="Main sidebar navigation"`.
