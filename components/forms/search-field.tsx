'use client'

import React, { forwardRef, useState, useId, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface SearchFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'>,
    BaseFieldProps {
  onClear?: () => void
  loading?: boolean
  shortcut?: string
  enableGlobalShortcut?: boolean
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
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
      value,
      defaultValue,
      onChange,
      onClear,
      loading = false,
      shortcut = '⌘K',
      enableGlobalShortcut = false,
      placeholder = 'Search...',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const hasValue = value !== undefined ? Boolean(value) : Boolean(defaultValue)

    // Global keyboard shortcut listener
    useEffect(() => {
      if (!enableGlobalShortcut) return
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [enableGlobalShortcut])

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
      inputRef.current?.focus()
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
          <div className="absolute left-3 z-10 text-muted-foreground/70 pointer-events-none flex items-center justify-center">
            {loading ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Search className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')} />
            )}
          </div>

          <input
            ref={el => {
              inputRef.current = el
              if (typeof ref === 'function') ref(el)
              else if (ref) ref.current = el
            }}
            id={id}
            name={name}
            type="search"
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
              size === 'sm' ? 'pl-7' : size === 'lg' ? 'pl-11' : 'pl-9',
              shortcut || hasValue ? (size === 'sm' ? 'pr-12' : 'pr-16') : 'pr-4',
              '[&::-webkit-search-cancel-button]:hidden',
              className
            )}
            {...props}
          />

          <div className="absolute right-2.5 z-10 flex items-center gap-1">
            {hasValue && !disabled && !readOnly && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}

            {shortcut && !hasValue && (
              <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none pointer-events-none">
                {shortcut}
              </kbd>
            )}
          </div>
        </div>
      </FieldWrapper>
    )
  }
)

SearchField.displayName = 'SearchField'
