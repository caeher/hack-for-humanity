'use client'

import React, { forwardRef, useId } from 'react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export interface SwitchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'checked' | 'defaultChecked' | 'onChange'>,
    BaseFieldProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onChange?: (e: { target: { name?: string; checked: boolean; value?: string } }) => void
  checkedLabel?: string
  uncheckedLabel?: string
}

export const SwitchField = forwardRef<HTMLButtonElement, SwitchFieldProps>(
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
      inline = true,
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
      onChange,
      onCheckedChange,
      checkedLabel,
      uncheckedLabel,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked)

    const isChecked = controlledChecked !== undefined ? controlledChecked : internalChecked

    const handleCheckedChange = (val: boolean) => {
      if (controlledChecked === undefined) {
        setInternalChecked(val)
      }
      onCheckedChange?.(val)
      onChange?.({
        target: {
          name,
          checked: val,
        },
      })
    }

    const sizeClass = {
      sm: 'h-4 w-7 [&>span]:size-3 [&>span[data-state=checked]]:translate-x-3',
      md: 'h-5 w-9 [&>span]:size-4 [&>span[data-state=checked]]:translate-x-4',
      lg: 'h-6 w-11 [&>span]:size-5 [&>span[data-state=checked]]:translate-x-5',
    }[size]

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
        <div className="flex items-center gap-2">
          {uncheckedLabel && !isChecked && (
            <span className="text-xs text-muted-foreground select-none">{uncheckedLabel}</span>
          )}

          <Switch
            ref={ref}
            id={id}
            name={name}
            checked={isChecked}
            onCheckedChange={handleCheckedChange}
            disabled={disabled}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              sizeClass,
              effectiveStatus === 'error' && 'ring-1 ring-destructive',
              effectiveStatus === 'success' && 'ring-1 ring-success',
              effectiveStatus === 'warning' && 'ring-1 ring-warning',
              className
            )}
          />

          {checkedLabel && isChecked && (
            <span className="text-xs font-medium text-foreground select-none">{checkedLabel}</span>
          )}
        </div>
      </FieldWrapper>
    )
  }
)

SwitchField.displayName = 'SwitchField'
