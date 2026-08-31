'use client'

import React, { forwardRef, useState, useId, useRef, useEffect } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface TimeFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: string
  defaultValue?: string
  onChange?: (e: { target: { name?: string; value: string } }) => void
  stepMinutes?: number
  presets?: string[]
  format24h?: boolean
}

const DEFAULT_PRESETS_12H = ['08:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '05:00 PM', '08:00 PM']
const DEFAULT_PRESETS_24H = ['08:00', '10:30', '12:00', '14:30', '17:00', '20:00']

export const TimeField = forwardRef<HTMLInputElement, TimeFieldProps>(
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
      stepMinutes,
      value: controlledValue,
      defaultValue = '',
      onChange,
      format24h = false,
      presets = format24h ? DEFAULT_PRESETS_24H : DEFAULT_PRESETS_12H,
      placeholder = format24h ? 'HH:MM' : 'HH:MM AM/PM',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState(defaultValue)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen])

    const handleSelect = (timeStr: string) => {
      if (controlledValue === undefined) {
        setInternalValue(timeStr)
      }
      onChange?.({
        target: { name, value: timeStr },
      })
      setIsOpen(false)
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
        <div ref={containerRef} className="relative w-full">
          <div className="relative flex items-center">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => !disabled && !readOnly && setIsOpen(!isOpen)}
              className="absolute left-3 z-10 text-muted-foreground/70 hover:text-foreground cursor-pointer"
              aria-label="Open time picker"
            >
              <Clock className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')} />
            </button>

            <input
              ref={ref}
              id={id}
              name={name}
              type="text"
              value={currentValue}
              placeholder={placeholder}
              onClick={() => !disabled && !readOnly && setIsOpen(true)}
              onChange={e => {
                const val = e.target.value
                if (controlledValue === undefined) setInternalValue(val)
                onChange?.({ target: { name, value: val } })
              }}
              disabled={disabled}
              readOnly={readOnly}
              required={required}
              aria-invalid={effectiveStatus === 'error'}
              className={cn(
                inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
                size === 'sm' ? 'pl-7' : size === 'lg' ? 'pl-11' : 'pl-9',
                'pr-9 cursor-pointer',
                className
              )}
              {...props}
            />

            <div className="absolute right-3 pointer-events-none text-muted-foreground/60">
              <ChevronDown className="size-4 opacity-70" />
            </div>
          </div>

          {isOpen && !disabled && !readOnly && (
            <div className="absolute top-full left-0 mt-1.5 z-50 w-64 rounded-xl border border-border bg-card p-3 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Common Times</span>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date()
                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !format24h })
                    handleSelect(timeStr)
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  Now
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {presets.map(time => {
                  const isSelected = currentValue.toLowerCase() === time.toLowerCase()
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleSelect(time)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-medium text-center transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted text-foreground bg-muted/40'
                      )}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  }
)

TimeField.displayName = 'TimeField'
