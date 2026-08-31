'use client'

import { useState } from 'react'
import {
  TextField,
  SelectField,
  CalendarField,
  SwitchField,
  PhoneField,
} from '@/components/forms'
import { Mail, User } from 'lucide-react'

export function RegistrationForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'developer',
    birthDate: '',
    phone: '',
    newsletter: true,
  })

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form Submitted:', formData)
    alert(`Form submitted for ${formData.fullName || 'User'}!`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto p-8 space-y-6 bg-card rounded-2xl border border-border warm-shadow"
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">User Registration</h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Full Name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="John Doe"
          icon={User}
          hint="As it appears on your ID"
        />

        <TextField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          icon={Mail}
        />
      </div>

      <SelectField
        label="Primary Role"
        name="role"
        value={formData.role}
        onChange={handleChange}
        options={[
          { label: 'Developer', value: 'developer' },
          { label: 'Designer', value: 'designer' },
          { label: 'Manager', value: 'manager' },
        ]}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <CalendarField
          label="Date of Birth"
          name="birthDate"
          value={formData.birthDate}
          onChange={handleChange}
        />

        <PhoneField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>

      <SwitchField
        inline
        label="Subscribe to newsletter"
        name="newsletter"
        checked={formData.newsletter}
        onChange={handleChange}
      />

      <button
        type="submit"
        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-colors cursor-pointer"
      >
        Complete Registration
      </button>
    </form>
  )
}
