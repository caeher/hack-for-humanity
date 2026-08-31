'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { BaseFieldProps, OptionItem } from './types'
import { FieldWrapper } from './field-wrapper'

export interface ToggleFieldProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value' | 'prefix'>,
    BaseFieldProps {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean) => void
  options?: (string | OptionItem<string>)[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  multiple?: boolean
  selectedValues?: string[]
  onSelectedValuesChange?: (values: string[]) => void
}

export const ToggleField = forwardRef<HTMLButtonElement, ToggleFieldProps>(
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
      size = 'md',
      status = 'default',
      inline,
      className,
      wrapperClassName,
      labelClassName,
      hintClassName,
      errorClassName,
      icon: Icon,
      iconPosition,
      startAdornment,
      endAdornment,
      prefix,
      suffix,
      children,
      // Single toggle props
      pressed: controlledPressed,
      defaultPressed = false,
      onPressedChange,
      // Multi-option toggle group props
      options,
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      multiple = false,
      selectedValues: controlledSelectedValues,
      onSelectedValuesChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    // Single toggle state
    const [internalPressed, setInternalPressed] = useState(defaultPressed)
    const isPressed = controlledPressed !== undefined ? controlledPressed : internalPressed

    // Group state
    const [internalValue, setInternalValue] = useState(defaultValue)
    const currentValue = controlledValue !== undefined ? controlledValue : internalValue

    const [internalSelectedValues, setInternalSelectedValues] = useState<string[]>([])
    const currentSelectedValues = controlledSelectedValues !== undefined ? controlledSelectedValues : internalSelectedValues

    const handleSinglePressedChange = (nextPressed: boolean) => {
      if (disabled) return
      if (controlledPressed === undefined) setInternalPressed(nextPressed)
      onPressedChange?.(nextPressed)
    }

    const handleSingleGroupChange = (val: string) => {
      if (disabled) return
      if (controlledValue === undefined) setInternalValue(val)
      onValueChange?.(val)
    }

    const handleMultipleGroupChange = (vals: string[]) => {
      if (disabled) return
      if (controlledSelectedValues === undefined) setInternalSelectedValues(vals)
      onSelectedValuesChange?.(vals)
    }

    const toggleSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'

    // Render Option Group
    if (options && options.length > 0) {
      const normalizedOptions: OptionItem<string>[] = options.map(opt =>
        typeof opt === 'string' ? { label: opt, value: opt } : opt
      )

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
          {multiple ? (
            <ToggleGroup
              type="multiple"
              value={currentSelectedValues}
              onValueChange={handleMultipleGroupChange}
              disabled={disabled}
              className={cn('inline-flex p-1 bg-muted rounded-xl gap-1 flex-wrap justify-start', className)}
            >
              {normalizedOptions.map(opt => {
                const OptIcon = opt.icon
                return (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    disabled={disabled || opt.disabled}
                    size={toggleSize}
                    variant="outline"
                    className="rounded-lg gap-1.5"
                  >
                    {OptIcon && <OptIcon className="size-4 shrink-0" />}
                    <span>{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] bg-muted px-1 rounded font-bold">{opt.badge}</span>
                    )}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          ) : (
            <ToggleGroup
              type="single"
              value={currentValue}
              onValueChange={handleSingleGroupChange}
              disabled={disabled}
              className={cn('inline-flex p-1 bg-muted rounded-xl gap-1 flex-wrap justify-start', className)}
            >
              {normalizedOptions.map(opt => {
                const OptIcon = opt.icon
                return (
                  <ToggleGroupItem
                    key={opt.value}
                    value={opt.value}
                    disabled={disabled || opt.disabled}
                    size={toggleSize}
                    variant="outline"
                    className="rounded-lg gap-1.5"
                  >
                    {OptIcon && <OptIcon className="size-4 shrink-0" />}
                    <span>{opt.label}</span>
                    {opt.badge && (
                      <span className="text-[10px] bg-muted px-1 rounded font-bold">{opt.badge}</span>
                    )}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          )}
        </FieldWrapper>
      )
    }

    // Render Single Toggle Button
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
        <Toggle
          ref={ref}
          id={id}
          pressed={isPressed}
          onPressedChange={handleSinglePressedChange}
          disabled={disabled}
          size={toggleSize}
          variant="outline"
          className={cn(
            'gap-2',
            effectiveStatus === 'error' && 'border-destructive ring-1 ring-destructive',
            effectiveStatus === 'success' && 'border-success ring-1 ring-success',
            effectiveStatus === 'warning' && 'border-warning ring-1 ring-warning',
            className
          )}
        >
          {Icon && <Icon className="size-4 shrink-0" />}
          {children || label}
        </Toggle>
      </FieldWrapper>
    )
  }
)

ToggleField.displayName = 'ToggleField'
