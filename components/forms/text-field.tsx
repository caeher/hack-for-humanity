'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Eye, EyeOff, X, AlertCircle } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export const inputVariants = cva(
  'w-full rounded-lg text-sm text-foreground transition-all duration-150 outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50 file:border-0 file:bg-transparent file:text-sm file:font-medium',
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

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    BaseFieldProps {
  clearable?: boolean
  onClear?: () => void
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
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
      icon: Icon,
      iconPosition = 'left',
      startAdornment,
      endAdornment,
      prefix,
      suffix,
      clearable,
      onClear,
      type = 'text',
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const hasValue = value !== undefined ? Boolean(value) : Boolean(defaultValue)

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onClear) {
        onClear()
      } else if (onChange) {
        const syntheticEvent = {
          target: { name, value: '' },
          currentTarget: { name, value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
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
          {prefix && (
            <div className="absolute left-3 z-10 text-muted-foreground text-xs select-none pointer-events-none font-medium">
              {prefix}
            </div>
          )}

          {Icon && iconPosition === 'left' && (
            <div className="absolute left-3 z-10 text-muted-foreground/70 pointer-events-none flex items-center justify-center">
              <Icon className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')} />
            </div>
          )}

          {startAdornment && (
            <div className="absolute left-3 z-10 flex items-center text-muted-foreground">
              {startAdornment}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            name={name}
            type={inputType}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
              (Icon && iconPosition === 'left') && (size === 'sm' ? 'pl-7' : size === 'lg' ? 'pl-11' : 'pl-9'),
              prefix && 'pl-10',
              startAdornment && 'pl-9',
              (Icon && iconPosition === 'right' || isPassword || clearable || endAdornment || suffix) && (size === 'sm' ? 'pr-8' : size === 'lg' ? 'pr-12' : 'pr-10'),
              className
            )}
            {...props}
          />

          {suffix && (
            <div className="absolute right-3 z-10 text-muted-foreground text-xs select-none pointer-events-none font-medium">
              {suffix}
            </div>
          )}

          {clearable && hasValue && !disabled && !readOnly && (
            <button
              type="button"
              onClick={handleClear}
              tabIndex={-1}
              className="absolute right-2.5 z-10 rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Clear text"
            >
              <X className="size-3.5" />
            </button>
          )}

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-2.5 z-10 p-1 text-muted-foreground/70 hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}

          {Icon && iconPosition === 'right' && !isPassword && !clearable && (
            <div className="absolute right-3 z-10 text-muted-foreground/70 pointer-events-none flex items-center justify-center">
              <Icon className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')} />
            </div>
          )}

          {endAdornment && !isPassword && !clearable && (
            <div className="absolute right-3 z-10 flex items-center text-muted-foreground">
              {endAdornment}
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  }
)

TextField.displayName = 'TextField'
