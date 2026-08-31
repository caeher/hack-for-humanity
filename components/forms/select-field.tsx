'use client'

import React, { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { BaseFieldProps, OptionItem } from './types'
import { FieldWrapper } from './field-wrapper'

export const selectVariants = cva(
  'w-full appearance-none rounded-lg text-sm text-foreground transition-all duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50 cursor-pointer pr-10',
  {
    variants: {
      variant: {
        outline: 'border border-input bg-card shadow-xs focus:border-ring focus:ring-2 focus:ring-ring/20',
        filled: 'border border-transparent bg-muted/70 hover:bg-muted focus:bg-card focus:border-ring focus:ring-2 focus:ring-ring/20',
        ghost: 'border-b border-input rounded-none bg-transparent px-0 focus:border-ring focus:ring-0',
      },
      fieldSize: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-10 px-3.5 text-sm',
        lg: 'h-12 px-4 text-base',
      },
      status: {
        default: '',
        error: 'border-destructive focus:border-destructive focus:ring-destructive/20 text-destructive',
        success: 'border-success focus:border-success focus:ring-success/20',
        warning: 'border-warning focus:border-warning focus:ring-warning/20',
      },
    },
    defaultVariants: {
      variant: 'outline',
      fieldSize: 'md',
      status: 'default',
    },
  }
)

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'prefix'>,
    BaseFieldProps {
  options?: (string | OptionItem<string | number>)[]
  placeholder?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
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
      variant = 'outline',
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
      options = [],
      placeholder,
      children,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    // Group options if any have a group property
    const groupedOptions = React.useMemo(() => {
      const groups: Record<string, (string | OptionItem<string | number>)[]> = {}
      const ungrouped: (string | OptionItem<string | number>)[] = []

      options.forEach(opt => {
        if (typeof opt === 'object' && opt.group) {
          if (!groups[opt.group]) groups[opt.group] = []
          groups[opt.group].push(opt)
        } else {
          ungrouped.push(opt)
        }
      })

      return { groups, ungrouped }
    }, [options])

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
          {Icon && (
            <div className="absolute left-3 z-10 text-muted-foreground/70 pointer-events-none flex items-center justify-center">
              <Icon className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')} />
            </div>
          )}

          <select
            ref={ref}
            id={id}
            name={name}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            disabled={disabled}
            required={required}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              selectVariants({ variant, fieldSize: size, status: effectiveStatus }),
              Icon && (size === 'sm' ? 'pl-7' : size === 'lg' ? 'pl-11' : 'pl-9'),
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden={required}>
                {placeholder}
              </option>
            )}

            {children}

            {groupedOptions.ungrouped.map(opt => {
              if (typeof opt === 'string') {
                return (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                )
              }
              return (
                <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              )
            })}

            {Object.entries(groupedOptions.groups).map(([groupName, groupOpts]) => (
              <optgroup key={groupName} label={groupName}>
                {groupOpts.map(opt => {
                  if (typeof opt === 'string') {
                    return (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    )
                  }
                  return (
                    <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                      {opt.label}
                    </option>
                  )
                })}
              </optgroup>
            ))}
          </select>

          <div className="absolute right-3 pointer-events-none text-muted-foreground">
            <ChevronDown className="size-4 opacity-70" />
          </div>
        </div>
      </FieldWrapper>
    )
  }
)

SelectField.displayName = 'SelectField'
