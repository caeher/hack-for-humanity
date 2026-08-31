'use client'

import React, { forwardRef, useState, useId } from 'react'
import { ChevronDown, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface CurrencyConfig {
  code: string
  symbol: string
  name: string
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
]

export interface CurrencyFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: number | string
  defaultValue?: number | string
  onChange?: (e: { target: { name?: string; value: number; formattedValue: string } }) => void
  currencies?: CurrencyConfig[]
  defaultCurrency?: string
  onCurrencyChange?: (currency: CurrencyConfig) => void
  decimals?: number
  allowCurrencySelect?: boolean
}

export const CurrencyField = forwardRef<HTMLInputElement, CurrencyFieldProps>(
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
      currencies = DEFAULT_CURRENCIES,
      defaultCurrency = 'USD',
      onCurrencyChange,
      value: controlledValue,
      defaultValue = '',
      onChange,
      decimals = 2,
      allowCurrencySelect = true,
      placeholder = '0.00',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyConfig>(
      () => currencies.find(c => c.code === defaultCurrency) || currencies[0]
    )
    const [internalValue, setInternalValue] = useState<string>(
      defaultValue !== '' ? String(defaultValue) : ''
    )

    const currentValue = controlledValue !== undefined ? String(controlledValue) : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Allow only numbers and one decimal dot
      const raw = e.target.value.replace(/[^0-9.]/g, '')
      const parts = raw.split('.')
      const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw

      if (controlledValue === undefined) {
        setInternalValue(sanitized)
      }

      const numVal = parseFloat(sanitized) || 0
      onChange?.({
        target: {
          name,
          value: numVal,
          formattedValue: `${selectedCurrency.symbol}${sanitized}`,
        },
      })
    }

    const handleCurrencySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const found = currencies.find(c => c.code === e.target.value)
      if (found) {
        setSelectedCurrency(found)
        onCurrencyChange?.(found)
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
          {/* Currency selector / prefix */}
          <div className="absolute left-1.5 z-10 flex items-center">
            {allowCurrencySelect ? (
              <div className="relative flex items-center pl-2 pr-1 py-1 rounded-md hover:bg-muted transition-colors">
                <span className="text-xs font-semibold text-foreground mr-1">
                  {selectedCurrency.symbol} {selectedCurrency.code}
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
                <select
                  aria-label="Currency code"
                  value={selectedCurrency.code}
                  onChange={handleCurrencySelect}
                  disabled={disabled || readOnly}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} ({c.name})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="pl-3 text-sm font-semibold text-muted-foreground">
                {selectedCurrency.symbol}
              </span>
            )}
            <div className="h-4 w-px bg-border ml-1.5" />
          </div>

          <input
            ref={ref}
            id={id}
            name={name}
            type="text"
            inputMode="decimal"
            value={currentValue}
            onChange={handleInputChange}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
              allowCurrencySelect ? 'pl-24' : 'pl-10',
              'pr-12 text-right font-mono tabular-nums',
              className
            )}
            {...props}
          />

          <span className="absolute right-3 text-xs font-mono text-muted-foreground pointer-events-none">
            {selectedCurrency.code}
          </span>
        </div>
      </FieldWrapper>
    )
  }
)

CurrencyField.displayName = 'CurrencyField'
