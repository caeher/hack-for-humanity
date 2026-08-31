'use client'

import React, { forwardRef, useState, useId, useEffect, useRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export const textareaVariants = cva(
  'w-full rounded-lg text-sm text-foreground transition-all duration-150 outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50 p-3',
  {
    variants: {
      variant: {
        outline: 'border border-input bg-card shadow-xs focus:border-ring focus:ring-2 focus:ring-ring/20',
        filled: 'border border-transparent bg-muted/70 hover:bg-muted focus:bg-card focus:border-ring focus:ring-2 focus:ring-ring/20',
        ghost: 'border-b border-input rounded-none bg-transparent px-0 focus:border-ring focus:ring-0',
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
      status: 'default',
    },
  }
)

export interface TextareaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix'>,
    BaseFieldProps {
  autoResize?: boolean
  showCount?: boolean
  minRows?: number
  maxRows?: number
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
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
      autoResize = false,
      showCount = false,
      maxLength,
      rows = 4,
      minRows = 2,
      maxRows = 12,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const [charCount, setCharCount] = useState(
      value ? String(value).length : defaultValue ? String(defaultValue).length : 0
    )

    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const adjustHeight = () => {
      if (!autoResize || !textareaRef.current) return
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, maxRows * 24)}px`
    }

    useEffect(() => {
      adjustHeight()
    }, [value, defaultValue])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length)
      if (autoResize) adjustHeight()
      onChange?.(e)
    }

    const counterElement = showCount ? (
      <span className="text-[11px] text-muted-foreground font-mono">
        {charCount}{maxLength ? ` / ${maxLength}` : ''}
      </span>
    ) : null

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
        counter={counterElement}
      >
        <textarea
          ref={el => {
            textareaRef.current = el
            if (typeof ref === 'function') ref(el)
            else if (ref) ref.current = el
          }}
          id={id}
          name={name}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          aria-invalid={effectiveStatus === 'error'}
          className={cn(
            textareaVariants({ variant, status: effectiveStatus }),
            autoResize && 'resize-none overflow-y-auto',
            className
          )}
          {...props}
        />
      </FieldWrapper>
    )
  }
)

TextareaField.displayName = 'TextareaField'
