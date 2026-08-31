'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  TextField,
  SelectField,
  CalendarField,
  SwitchField,
  PhoneField,
  CheckboxField,
  ColorPickerField,
  ComboboxField,
  CurrencyField,
  DatetimeField,
  InputOtpField,
  MultiSelectField,
  NumberField,
  ProgressField,
  RadioGroupField,
  SearchField,
  TextareaField,
  TimeField,
  ToggleField,
  UploadField,
  FieldSize,
  FieldVariant,
  FieldStatus,
} from '@/components/forms'
import {
  User,
  Mail,
  Shield,
  Activity,
  Sparkles,
  ArrowRight,
  Code2,
  Layers,
  Palette,
  CheckCircle2,
  Heart,
  Sliders,
  Send,
  Building,
  CreditCard,
  FileCheck,
} from 'lucide-react'

export function FormShowcase() {
  // Global variant controls
  const [globalSize, setGlobalSize] = useState<FieldSize>('md')
  const [globalVariant, setGlobalVariant] = useState<FieldVariant>('outline')
  const [globalStatus, setGlobalStatus] = useState<FieldStatus>('default')
  const [activeTab, setActiveTab] = useState<'demo' | 'catalog' | 'json'>('demo')

  // Demo Registration Form State (as requested in prompt)
  const [regForm, setRegForm] = useState({
    fullName: 'Maya Chen',
    email: 'maya.chen@example.com',
    role: 'developer',
    birthDate: '1996-05-14',
    phone: '(415) 555-0192',
    newsletter: true,
    bio: 'Patient recovery advocate and full-stack healthcare developer.',
    otp: '942851',
    favoriteColor: '#f9a600',
    preferredTime: '08:30 AM',
    encounterDateTime: '2026-08-31 09:30',
    experienceYears: 6,
    hourlyRate: 120,
    recoveryProgress: 78,
    accountType: 'patient',
    skills: ['react', 'nextjs', 'typescript'],
    agreeTerms: true,
    statusToggle: 'active',
  })

  const [submittedData, setSubmittedData] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleRegChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setRegForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleRegSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedData(regForm)
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-10 pb-20">
      {/* Top Banner / Studio Controller */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-foreground font-mono text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="size-3.5 text-primary" /> 20 Reusable Form Fields
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Form Component System & Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customizable, accessible form controls with variants, validation states, and theme tokens.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'demo' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Registration Form
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'catalog' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All 20 Fields Gallery
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'json' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Live State (JSON)
            </button>
          </div>
        </div>

        {/* Global Variant Controls */}
        <div className="pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ToggleField
            label="Field Size"
            options={[
              { label: 'Small (sm)', value: 'sm' },
              { label: 'Medium (md)', value: 'md' },
              { label: 'Large (lg)', value: 'lg' },
            ]}
            value={globalSize}
            onValueChange={v => setGlobalSize(v as FieldSize)}
          />

          <ToggleField
            label="Visual Variant"
            options={[
              { label: 'Outline', value: 'outline' },
              { label: 'Filled', value: 'filled' },
              { label: 'Ghost', value: 'ghost' },
            ]}
            value={globalVariant}
            onValueChange={v => setGlobalVariant(v as FieldVariant)}
          />

          <ToggleField
            label="Status State"
            options={[
              { label: 'Default', value: 'default' },
              { label: 'Error', value: 'error' },
              { label: 'Success', value: 'success' },
              { label: 'Warning', value: 'warning' },
            ]}
            value={globalStatus}
            onValueChange={v => setGlobalStatus(v as FieldStatus)}
          />
        </div>
      </div>

      {/* TAB 1: REGISTRATION & INTAKE FORM (PROMPT EXAMPLE) */}
      {activeTab === 'demo' && (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
          <form
            onSubmit={handleRegSubmit}
            className="p-8 space-y-6 bg-card rounded-2xl border border-border shadow-md"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">User Registration</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Implemented with `@caeher/react-form-tokens` specification
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-foreground text-background font-bold text-sm">
                C
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                label="Full Name"
                name="fullName"
                value={regForm.fullName}
                onChange={handleRegChange}
                placeholder="John Doe"
                icon={User}
                hint="As it appears on your ID"
                size={globalSize}
                variant={globalVariant}
                status={globalStatus}
                required
              />

              <TextField
                label="Email Address"
                name="email"
                type="email"
                value={regForm.email}
                onChange={handleRegChange}
                placeholder="john@example.com"
                icon={Mail}
                size={globalSize}
                variant={globalVariant}
                status={globalStatus}
                required
              />
            </div>

            <SelectField
              label="Primary Role"
              name="role"
              value={regForm.role}
              onChange={handleRegChange}
              size={globalSize}
              variant={globalVariant}
              status={globalStatus}
              options={[
                { label: 'Developer', value: 'developer' },
                { label: 'Designer', value: 'designer' },
                { label: 'Manager', value: 'manager' },
                { label: 'Clinician / Specialist', value: 'clinician' },
              ]}
            />

            <div className="grid gap-6 sm:grid-cols-2">
              <CalendarField
                label="Date of Birth"
                name="birthDate"
                value={regForm.birthDate}
                onChange={handleRegChange}
                size={globalSize}
                variant={globalVariant}
                status={globalStatus}
              />

              <PhoneField
                label="Phone Number"
                name="phone"
                value={regForm.phone}
                onChange={handleRegChange}
                size={globalSize}
                variant={globalVariant}
                status={globalStatus}
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ColorPickerField
                label="Brand / Avatar Color"
                name="favoriteColor"
                value={regForm.favoriteColor}
                onChange={handleRegChange}
                size={globalSize}
                variant={globalVariant}
                status={globalStatus}
              />

              <TimeField
                label="Preferred Check-In Time"
                name="preferredTime"
                value={regForm.preferredTime}
                onChange={handleRegChange}
                size={globalSize}
                variant={globalVariant}
                status={globalStatus}
              />
            </div>

            <TextareaField
              label="Profile Bio & Clinical Notes"
              name="bio"
              value={regForm.bio}
              onChange={handleRegChange}
              autoResize
              showCount
              maxLength={200}
              variant={globalVariant}
              status={globalStatus}
              hint="Brief summary for your care team."
            />

            <SwitchField
              inline
              label="Subscribe to weekly recovery newsletter"
              sublabel="Receive weekly health summaries and tips"
              name="newsletter"
              checked={regForm.newsletter}
              onChange={handleRegChange}
              size={globalSize}
              status={globalStatus}
            />

            <CheckboxField
              label="I agree to the privacy policy & medical data processing"
              name="agreeTerms"
              checked={regForm.agreeTerms}
              onChange={handleRegChange}
              size={globalSize}
              status={globalStatus}
              required
            />

            <button
              type="submit"
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
            >
              Complete Registration <ArrowRight className="size-4" />
            </button>
          </form>

          {/* Submission Output & Code Preview */}
          <div className="space-y-6">
            {submittedData ? (
              <div className="rounded-2xl border border-success/30 bg-success/5 p-6 space-y-4">
                <div className="flex items-center gap-2 text-success font-semibold">
                  <CheckCircle2 className="size-5" />
                  <span>Form Submitted Successfully!</span>
                </div>
                <pre className="p-4 rounded-xl bg-card border border-border text-xs font-mono overflow-x-auto text-foreground">
                  {JSON.stringify(submittedData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileCheck className="size-4 text-primary" /> Live Validation & State Sync
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fill in or modify the fields on the left. The components communicate seamlessly using standard `name`, `value`, and `onChange` signatures.
                </p>
                <div className="pt-2">
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                    Active theme: {globalVariant} ({globalSize})
                  </span>
                </div>
              </div>
            )}

            {/* Quick Code Example */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <Code2 className="size-4 text-primary" /> Usage Snippet
              </h3>
              <pre className="p-3.5 rounded-xl bg-muted/60 text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed">
{`import { 
  TextField, 
  SelectField, 
  CalendarField, 
  SwitchField, 
  PhoneField 
} from '@/components/forms'

<TextField
  label="Full Name"
  name="fullName"
  value={formData.fullName}
  onChange={handleChange}
  placeholder="John Doe"
  icon={User}
  hint="As it appears on your ID"
/>`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLETE GALLERY OF ALL 20 FIELDS */}
      {activeTab === 'catalog' && (
        <div className="space-y-12">
          {/* Section: Text & Input Controls */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Layers className="size-5 text-primary" /> 1. Text & Direct Input Controls
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. TextField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">1. TextField</span>
                <TextField
                  label="Standard Text Input"
                  placeholder="Type anything..."
                  icon={User}
                  clearable
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="With clearable action and leading icon"
                />
              </div>

              {/* 2. TextareaField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">2. TextareaField</span>
                <TextareaField
                  label="Multi-line Notes"
                  placeholder="Enter detailed notes..."
                  showCount
                  maxLength={150}
                  autoResize
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Auto-resizes with live character limit"
                />
              </div>

              {/* 3. SearchField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">3. SearchField</span>
                <SearchField
                  label="Instant Search"
                  placeholder="Search patients, protocols..."
                  shortcut="⌘K"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="With keyboard badge & instant clear"
                />
              </div>

              {/* 4. NumberField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">4. NumberField</span>
                <NumberField
                  label="Dosage / Repetitions"
                  defaultValue={12}
                  min={0}
                  max={50}
                  step={1}
                  unit="reps"
                  showSlider
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Stepper +/- controls with range sync"
                />
              </div>

              {/* 5. CurrencyField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">5. CurrencyField</span>
                <CurrencyField
                  label="Copay / Treatment Cost"
                  defaultValue="250.00"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="With currency selector ($ USD, € EUR, etc.)"
                />
              </div>

              {/* 6. PhoneField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">6. PhoneField</span>
                <PhoneField
                  label="Mobile Contact"
                  defaultValue="(555) 234-5678"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="International dial codes with flag icons"
                />
              </div>

              {/* 7. InputOtpField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">7. InputOtpField</span>
                <InputOtpField
                  label="Security OTP / PIN Code"
                  length={6}
                  defaultValue="482910"
                  size={globalSize}
                  status={globalStatus}
                  hint="Auto-advancing slots with paste support"
                />
              </div>

              {/* 8. ColorPickerField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">8. ColorPickerField</span>
                <ColorPickerField
                  label="Badge / Tag Color"
                  defaultValue="#f9a600"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Preset palettes + custom hex picker"
                />
              </div>

              {/* 9. ProgressField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">9. ProgressField</span>
                <ProgressField
                  label="Pain Rating (0 - 10)"
                  min={0}
                  max={10}
                  step={1}
                  defaultValue={3}
                  minLabel="No Pain"
                  maxLabel="Severe"
                  size={globalSize}
                  status={globalStatus}
                  hint="Visual fill slider with live score readout"
                />
              </div>
            </div>
          </div>

          {/* Section: Selectors & Pickers */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Sliders className="size-5 text-primary" /> 2. Selection & Dropdown Controls
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 10. SelectField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">10. SelectField</span>
                <SelectField
                  label="Clinical Department"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  options={[
                    { label: 'Orthopedic Surgery', value: 'ortho' },
                    { label: 'Physical Therapy', value: 'pt' },
                    { label: 'Sports Medicine', value: 'sports' },
                  ]}
                  hint="Styled select with chevron indicator"
                />
              </div>

              {/* 11. MultiSelectField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">11. MultiSelectField</span>
                <MultiSelectField
                  label="Assigned Clinical Tags"
                  defaultValue={['acl', 'post-op']}
                  options={[
                    { label: 'ACL Protocol', value: 'acl' },
                    { label: 'Post-Operative', value: 'post-op' },
                    { label: 'High Adherence', value: 'adherence' },
                    { label: 'Medication Review', value: 'meds' },
                  ]}
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Tag pills, removable chips & filter"
                />
              </div>

              {/* 12. ComboboxField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">12. ComboboxField</span>
                <ComboboxField
                  label="Search Diagnosis"
                  defaultValue="acl"
                  options={[
                    { label: 'ACL Reconstruction', value: 'acl', description: 'Knee ligament surgery' },
                    { label: 'Total Knee Arthroplasty', value: 'knee', description: 'Joint replacement' },
                    { label: 'Rotator Cuff Repair', value: 'shoulder', description: 'Shoulder tendon repair' },
                    { label: 'Lumbar Decompression', value: 'spine', description: 'Spinal disc surgery' },
                  ]}
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Searchable dropdown with item descriptions"
                />
              </div>

              {/* 13. CalendarField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">13. CalendarField</span>
                <CalendarField
                  label="Surgery Date"
                  defaultValue="2026-08-13"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Interactive calendar popover with quick presets"
                />
              </div>

              {/* 14. TimeField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">14. TimeField</span>
                <TimeField
                  label="Appointment Time"
                  defaultValue="10:30 AM"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Quick chips for standard clinic slots"
                />
              </div>

              {/* 15. DatetimeField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">15. DatetimeField</span>
                <DatetimeField
                  label="Check-In Timestamp"
                  defaultValue="2026-08-31 08:42"
                  size={globalSize}
                  variant={globalVariant}
                  status={globalStatus}
                  hint="Combined date and time picker"
                />
              </div>
            </div>
          </div>

          {/* Section: Switches, Toggles, Radios, Upload */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" /> 3. Toggles, Radios & File Uploads
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 16. SwitchField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <span className="font-mono text-xs font-bold text-primary">16. SwitchField</span>
                <SwitchField
                  inline
                  label="SMS Alert Notifications"
                  sublabel="Send daily reminders to patient"
                  defaultChecked={true}
                  size={globalSize}
                  status={globalStatus}
                />
                <SwitchField
                  inline
                  label="Wearable Activity Sync"
                  sublabel="Apple Health & Google Fit"
                  defaultChecked={false}
                  size={globalSize}
                  status={globalStatus}
                />
              </div>

              {/* 17. CheckboxField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
                <span className="font-mono text-xs font-bold text-primary">17. CheckboxField</span>
                <CheckboxField
                  label="Morning Mobility Exercises"
                  description="Completed 12 knee flexion repetitions"
                  defaultChecked={true}
                  size={globalSize}
                  status={globalStatus}
                />
                <CheckboxField
                  cardVariant
                  label="Caregiver Permission"
                  description="Allow designated caregiver to view daily tasks"
                  defaultChecked={true}
                  size={globalSize}
                  status={globalStatus}
                />
              </div>

              {/* 18. RadioGroupField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">18. RadioGroupField</span>
                <RadioGroupField
                  label="Recovery Risk Tier"
                  layout="segmented"
                  defaultValue="low"
                  options={[
                    { label: 'Low Risk', value: 'low' },
                    { label: 'Moderate', value: 'med' },
                    { label: 'High Priority', value: 'high' },
                  ]}
                  size={globalSize}
                  status={globalStatus}
                  hint="Segmented pill variant"
                />
              </div>

              {/* 19. ToggleField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
                <span className="font-mono text-xs font-bold text-primary">19. ToggleField</span>
                <ToggleField
                  label="Encounter Mode"
                  defaultValue="in-person"
                  options={[
                    { label: 'In-Person', value: 'in-person' },
                    { label: 'Telehealth', value: 'telehealth' },
                    { label: 'Asynchronous', value: 'async' },
                  ]}
                  size={globalSize}
                  status={globalStatus}
                  hint="Button group segmented toggle"
                />
              </div>

              {/* 20. UploadField */}
              <div className="p-5 rounded-2xl border border-border bg-card space-y-3 md:col-span-2">
                <span className="font-mono text-xs font-bold text-primary">20. UploadField</span>
                <UploadField
                  label="Medical Records & Discharge Summary"
                  sublabel="Upload PDF reports, X-rays or discharge documents"
                  multiple
                  maxFiles={3}
                  maxSizeMB={15}
                  accept=".pdf,.png,.jpg,.jpeg"
                  size={globalSize}
                  status={globalStatus}
                  hint="Drag-and-drop dropzone with file preview list and removal"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIVE STATE (JSON) */}
      {activeTab === 'json' && (
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Active Form State Inspector</h2>
            <span className="text-xs font-mono text-muted-foreground">Reactive State</span>
          </div>
          <pre className="p-6 rounded-xl bg-muted/60 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
            {JSON.stringify(regForm, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
