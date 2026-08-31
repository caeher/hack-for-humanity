'use client'

import React, { forwardRef, useId } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export interface CheckboxFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'checked' | 'defaultChecked' | 'onChange'>,
    BaseFieldProps {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean | 'indeterminate'
  indeterminate?: boolean
  description?: React.ReactNode
  cardVariant?: boolean
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  onChange?: (e: { target: { name?: string; checked: boolean; value?: string } }) => void
}

export const CheckboxField = forwardRef<HTMLButtonElement, CheckboxFieldProps>(
  (
    {
      id: customId,
      name,
      label,
      sublabel,
      description,
      hint,
      error,
      success,
      warning,
      required,
      disabled,
      size = 'md',
      status = 'default',
      inline = true,
      cardVariant = false,
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
      checked: controlledChecked,
      defaultChecked = false,
      indeterminate = false,
      onChange,
      onCheckedChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const currentChecked = indeterminate
      ? 'indeterminate'
      : controlledChecked !== undefined
      ? controlledChecked
      : defaultChecked

    const handleCheckedChange = (val: boolean | 'indeterminate') => {
      onCheckedChange?.(val)
      onChange?.({
        target: {
          name,
          checked: val === true,
        },
      })
    }

    const sizeClass = {
      sm: 'size-3.5',
      md: 'size-4.5',
      lg: 'size-5',
    }[size]

    const innerContent = (
      <div
        className={cn(
          'flex items-start gap-3 select-none',
          cardVariant &&
            cn(
              'p-4 rounded-xl border transition-all cursor-pointer w-full',
              currentChecked === true
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border bg-card hover:bg-muted/40',
              disabled && 'opacity-50 cursor-not-allowed'
            )
        )}
      >
        <div className="relative flex items-center pt-0.5">
          <Checkbox
            ref={ref}
            id={id}
            name={name}
            checked={currentChecked}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              sizeClass,
              effectiveStatus === 'error' && 'border-destructive ring-1 ring-destructive',
              effectiveStatus === 'success' && 'border-success ring-1 ring-success',
              effectiveStatus === 'warning' && 'border-warning ring-1 ring-warning',
              className
            )}
          />
        </div>

        {(label || description || sublabel) && (
          <div className="flex-1 cursor-pointer">
            {label && (
              <Label
                htmlFor={id}
                className={cn('text-sm font-medium text-foreground block cursor-pointer', labelClassName)}
              >
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </Label>
            )}
            {(description || sublabel) && (
              <span className="text-xs text-muted-foreground block mt-0.5">
                {description || sublabel}
              </span>
            )}
          </div>
        )}
      </div>
    )

    if (cardVariant) {
      return (
        <FieldWrapper
          id={id}
          hint={hint}
          error={error}
          success={success}
          warning={warning}
          wrapperClassName={wrapperClassName}
          hintClassName={hintClassName}
          errorClassName={errorClassName}
        >
          {innerContent}
        </FieldWrapper>
      )
    }

    return (
      <FieldWrapper
        id={id}
        hint={hint}
        error={error}
        success={success}
        warning={warning}
        inline={inline}
        wrapperClassName={wrapperClassName}
        hintClassName={hintClassName}
        errorClassName={errorClassName}
      >
        {innerContent}
      </FieldWrapper>
    )
  }
)

CheckboxField.displayName = 'CheckboxField'
