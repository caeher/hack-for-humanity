'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface NumberFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: number
  defaultValue?: number
  onChange?: (e: { target: { name?: string; value: number } }) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  showSlider?: boolean
}

export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
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
      min = 0,
      max = 100,
      step = 1,
      unit,
      showSlider = false,
      value: controlledValue,
      defaultValue = 0,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState<number>(defaultValue)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const clamp = (val: number) => Math.min(Math.max(val, min), max)

    const updateVal = (newVal: number) => {
      const clamped = clamp(newVal)
      if (controlledValue === undefined) {
        setInternalValue(clamped)
      }
      onChange?.({
        target: { name, value: clamped },
      })
    }

    const handleIncrement = () => {
      if (!disabled && !readOnly) {
        updateVal(Number((currentValue + step).toFixed(4)))
      }
    }

    const handleDecrement = () => {
      if (!disabled && !readOnly) {
        updateVal(Number((currentValue - step).toFixed(4)))
      }
    }

    const handleDirectInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value)
      if (isNaN(val)) {
        updateVal(min)
      } else {
        updateVal(val)
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
        <div className="flex flex-col gap-2 w-full">
          <div className="relative flex items-center w-full">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled || readOnly || currentValue <= min}
              className="absolute left-1.5 z-10 size-7 rounded-md bg-muted/80 hover:bg-muted text-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease value"
            >
              <Minus className="size-3.5" />
            </button>

            <input
              ref={ref}
              id={id}
              name={name}
              type="number"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={handleDirectInput}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              aria-invalid={effectiveStatus === 'error'}
              className={cn(
                inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
                'px-10 text-center font-mono font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                unit && 'pr-16',
                className
              )}
              {...props}
            />

            {unit && (
              <span className="absolute right-10 text-xs font-semibold text-muted-foreground pointer-events-none">
                {unit}
              </span>
            )}

            {/* Increment Button */}
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled || readOnly || currentValue >= max}
              className="absolute right-1.5 z-10 size-7 rounded-md bg-muted/80 hover:bg-muted text-foreground flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase value"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          {showSlider && (
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={currentValue}
              onChange={e => updateVal(parseFloat(e.target.value))}
              disabled={disabled || readOnly}
              className="w-full accent-[var(--primary)] h-1.5 bg-muted rounded-lg cursor-pointer"
            />
          )}
        </div>
      </FieldWrapper>
    )
  }
)

NumberField.displayName = 'NumberField'
