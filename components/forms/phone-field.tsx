'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Phone, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface CountryCode {
  code: string
  dialCode: string
  flag: string
  name: string
}

export const DEFAULT_COUNTRIES: CountryCode[] = [
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'United States' },
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'PE', dialCode: '+51', flag: '🇵🇪', name: 'Peru' },
  { code: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'CA', dialCode: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'BR', dialCode: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: 'DE', dialCode: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dialCode: '+33', flag: '🇫🇷', name: 'France' },
]

export interface PhoneFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    BaseFieldProps {
  countries?: CountryCode[]
  defaultCountry?: string
  onCountryChange?: (country: CountryCode) => void
}

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  (
    {
      id: customId,
      name,
      label,
      sublabel,
      hint,
      error,
      success,
      warning,
      required,
      disabled,
      readOnly,
      size = 'md',
      variant = 'outline',
      status = 'default',
      inline,
      className,
      wrapperClassName,
      labelClassName,
      hintClassName,
      errorClassName,
      icon,
      iconPosition,
      startAdornment,
      endAdornment,
      prefix,
      suffix,
      countries = DEFAULT_COUNTRIES,
      defaultCountry = 'US',
      onCountryChange,
      value,
      defaultValue,
      onChange,
      placeholder = '(555) 000-0000',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(
      () => countries.find(c => c.code === defaultCountry) || countries[0]
    )
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const found = countries.find(c => c.code === e.target.value)
      if (found) {
        setSelectedCountry(found)
        onCountryChange?.(found)
      }
    }

    return (
      <FieldWrapper
        id={id}
        label={label}
        sublabel={sublabel}
        hint={hint}
        error={error}
        success={success}
        warning={warning}
        required={required}
        inline={inline}
        status={effectiveStatus}
        wrapperClassName={wrapperClassName}
        labelClassName={labelClassName}
        hintClassName={hintClassName}
        errorClassName={errorClassName}
      >
        <div className="relative flex items-center w-full">
          {/* Country code selector */}
          <div className="absolute left-1.5 z-10 flex items-center">
            <div className="relative flex items-center pl-2 pr-1 py-1 rounded-md hover:bg-muted/80 transition-colors">
              <span className="mr-1 text-sm">{selectedCountry.flag}</span>
              <span className="text-xs font-semibold text-foreground mr-1">
                {selectedCountry.dialCode}
              </span>
              <ChevronDown className="size-3 text-muted-foreground" />
              <select
                aria-label="Country Code"
                value={selectedCountry.code}
                onChange={handleCountrySelect}
                disabled={disabled || readOnly}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                {countries.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="h-4 w-px bg-border ml-1" />
          </div>

          <input
            ref={ref}
            id={id}
            name={name}
            type="tel"
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
              'pl-24',
              className
            )}
            {...props}
          />

          <div className="absolute right-3 pointer-events-none text-muted-foreground/60">
            <Phone className="size-4" />
          </div>
        </div>
      </FieldWrapper>
    )
  }
)

PhoneField.displayName = 'PhoneField'
