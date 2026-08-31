'use client'

import React, { forwardRef, useState, useId } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BaseFieldProps, OptionItem } from './types'
import { FieldWrapper } from './field-wrapper'

export type RadioLayout = 'vertical' | 'horizontal' | 'grid' | 'segmented' | 'cards'

export interface RadioGroupFieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'prefix' | 'defaultValue' | 'dir'>,
    BaseFieldProps {
  options: (string | OptionItem<string>)[]
  value?: string
  defaultValue?: string
  dir?: 'ltr' | 'rtl'
  onValueChange?: (value: string) => void
  onChange?: (e: { target: { name?: string; value: string } }) => void
  layout?: RadioLayout
  columns?: number
}

export const RadioGroupField = forwardRef<HTMLDivElement, RadioGroupFieldProps>(
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
      options = [],
      value: controlledValue,
      defaultValue = '',
      onChange,
      onValueChange,
      layout = 'vertical',
      columns = 2,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState(defaultValue)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const normalizedOptions: OptionItem<string>[] = options.map(opt =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    )

    const handleSelect = (val: string) => {
      if (disabled || readOnly) return
      if (controlledValue === undefined) {
        setInternalValue(val)
      }
      onValueChange?.(val)
      onChange?.({
        target: { name, value: val },
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
      >
        <RadioGroup
          ref={ref}
          id={id}
          name={name}
          value={currentValue}
          onValueChange={handleSelect}
          disabled={disabled || readOnly}
          aria-invalid={effectiveStatus === 'error'}
          className={cn(
            'w-full',
            layout === 'vertical' && 'flex flex-col gap-2.5',
            layout === 'horizontal' && 'flex flex-row flex-wrap items-center gap-4',
            layout === 'grid' && `grid grid-cols-1 sm:grid-cols-${columns} gap-3`,
            layout === 'segmented' && 'inline-flex flex-row p-1 bg-muted rounded-xl gap-1 w-full sm:w-auto',
            layout === 'cards' && 'grid gap-3 sm:grid-cols-2',
            className
          )}
          {...props}
        >
          {normalizedOptions.map(opt => {
            const isSelected = currentValue === opt.value
            const optId = `${id}-${opt.value}`
            const Icon = opt.icon

            if (layout === 'segmented') {
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled || opt.disabled || readOnly}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all select-none cursor-pointer',
                    isSelected
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card/50',
                    (disabled || opt.disabled || readOnly) && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {Icon && <Icon className="size-3.5" />}
                    <span>{opt.label}</span>
                  </div>
                </button>
              )
            }

            if (layout === 'cards') {
              return (
                <div
                  key={opt.value}
                  onClick={() => !opt.disabled && !disabled && !readOnly && handleSelect(opt.value)}
                  className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between select-none',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary'
                      : 'border-border bg-card hover:bg-muted/40',
                    (disabled || opt.disabled || readOnly) && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {Icon && (
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                      )}
                      <div>
                        <Label
                          htmlFor={optId}
                          className="text-sm font-semibold text-foreground block cursor-pointer"
                        >
                          {opt.label}
                        </Label>
                        {opt.description && (
                          <span className="text-xs text-muted-foreground block mt-0.5 leading-relaxed">
                            {opt.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <RadioGroupItem
                      value={opt.value}
                      id={optId}
                      disabled={disabled || opt.disabled || readOnly}
                      className={cn(
                        'mt-0.5',
                        isSelected && 'border-primary bg-primary text-primary-foreground'
                      )}
                    />
                  </div>

                  {opt.badge && (
                    <div className="mt-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {opt.badge}
                      </span>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <div
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 cursor-pointer select-none group',
                  (disabled || opt.disabled || readOnly) && 'opacity-40 cursor-not-allowed'
                )}
                onClick={() => !disabled && !opt.disabled && !readOnly && handleSelect(opt.value)}
              >
                <RadioGroupItem
                  value={opt.value}
                  id={optId}
                  disabled={disabled || opt.disabled || readOnly}
                />

                <div className="flex flex-col">
                  <Label
                    htmlFor={optId}
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    {opt.label}
                  </Label>
                  {opt.description && (
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  )}
                </div>
              </div>
            )
          })}
        </RadioGroup>
      </FieldWrapper>
    )
  }
)

RadioGroupField.displayName = 'RadioGroupField'
