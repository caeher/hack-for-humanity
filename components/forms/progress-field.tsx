'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export interface ProgressFieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size' | 'defaultValue' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: number
  defaultValue?: number
  onChange?: (e: { target: { name?: string; value: number } }) => void
  min?: number
  max?: number
  step?: number
  minLabel?: React.ReactNode
  maxLabel?: React.ReactNode
  showValueBadge?: boolean
  unit?: string
  marks?: { value: number; label: string }[]
  mode?: 'slider' | 'indicator'
}

export const ProgressField = forwardRef<HTMLDivElement, ProgressFieldProps>(
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
      minLabel,
      maxLabel,
      showValueBadge = true,
      unit = '',
      marks,
      value: controlledValue,
      defaultValue = 50,
      onChange,
      mode = 'slider',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState<number>(defaultValue)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const percentage = Math.min(Math.max(((currentValue - min) / (max - min)) * 100, 0), 100)
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const handleSliderChange = (vals: number[]) => {
      const num = vals[0] ?? 0
      if (controlledValue === undefined) {
        setInternalValue(num)
      }
      onChange?.({
        target: { name, value: num },
      })
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
        counter={
          showValueBadge && (
            <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-foreground">
              <span>{currentValue}</span>
              {unit && <span className="text-xs font-normal text-muted-foreground">{unit}</span>}
            </div>
          )
        }
      >
        <div ref={ref} className="flex flex-col gap-2.5 w-full py-1" {...props}>
          <div className="relative flex items-center w-full">
            {mode === 'indicator' || readOnly ? (
              <Progress
                value={percentage}
                className={cn('w-full', className)}
              />
            ) : (
              <Slider
                id={id}
                name={name}
                min={min}
                max={max}
                step={step}
                value={[currentValue]}
                onValueChange={handleSliderChange}
                disabled={disabled}
                aria-invalid={effectiveStatus === 'error'}
                aria-label={typeof label === 'string' ? label : 'Symptom rating'}
                aria-valuetext={max === 6 ? `${currentValue} — ${currentValue === 0 ? 'None' : currentValue <= 2 ? 'Mild' : currentValue <= 4 ? 'Moderate' : 'Severe'}` : `${currentValue}${unit}`}
                className={cn(
                  'w-full',
                  effectiveStatus === 'error' && '[&_[role=slider]]:border-destructive',
                  className
                )}
              />
            )}
          </div>

          {/* Min / Max Labels or Custom Marks */}
          {(minLabel || maxLabel || marks) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              {marks ? (
                marks.map(mark => (
                  <button
                    key={mark.value}
                    type="button"
                    onClick={() => {
                      if (!disabled && !readOnly) {
                        if (controlledValue === undefined) setInternalValue(mark.value)
                        onChange?.({ target: { name, value: mark.value } })
                      }
                    }}
                    className={cn(
                      'text-[11px] hover:text-foreground transition-colors cursor-pointer',
                      mark.value === currentValue && 'text-foreground font-bold'
                    )}
                  >
                    {mark.label}
                  </button>
                ))
              ) : (
                <>
                  <span>{minLabel || `${min}${unit}`}</span>
                  <span>{maxLabel || `${max}${unit}`}</span>
                </>
              )}
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  }
)

ProgressField.displayName = 'ProgressField'
