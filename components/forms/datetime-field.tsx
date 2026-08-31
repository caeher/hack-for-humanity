'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface DatetimeFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: string
  defaultValue?: string
  onChange?: (e: { target: { name?: string; value: string } }) => void
  format12h?: boolean
}

export const DatetimeField = forwardRef<HTMLInputElement, DatetimeFieldProps>(
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
      value: controlledValue,
      defaultValue = '',
      onChange,
      format12h = false,
      placeholder = 'YYYY-MM-DD HH:MM',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState(defaultValue)
    const [isOpen, setIsOpen] = useState(false)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    // Parse date & time parts
    const [datePart = '', timePart = ''] = currentValue.includes('T')
      ? currentValue.split('T')
      : currentValue.split(' ')

    const [selectedDate, setSelectedDate] = useState(datePart || new Date().toISOString().slice(0, 10))
    const [selectedTime, setSelectedTime] = useState(timePart || '12:00')

    const updateCombinedValue = (newDate: string, newTime: string) => {
      const combined = newDate && newTime ? `${newDate} ${newTime}` : newDate || newTime || ''
      if (controlledValue === undefined) {
        setInternalValue(combined)
      }
      onChange?.({
        target: { name, value: combined },
      })
    }

    const handleDateChange = (val: string) => {
      setSelectedDate(val)
      updateCombinedValue(val, selectedTime)
    }

    const handleTimeChange = (val: string) => {
      setSelectedTime(val)
      updateCombinedValue(selectedDate, val)
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      setSelectedDate('')
      setSelectedTime('')
      if (controlledValue === undefined) {
        setInternalValue('')
      }
      onChange?.({ target: { name, value: '' } })
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
        <div className="relative w-full">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <div className="relative flex items-center">
              <PopoverTrigger asChild disabled={disabled || readOnly}>
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute left-3 z-10 text-muted-foreground/70 hover:text-foreground cursor-pointer"
                  aria-label="Open datetime picker"
                >
                  <Calendar className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')} />
                </button>
              </PopoverTrigger>

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
                  currentValue && 'pr-9',
                  'cursor-pointer',
                  className
                )}
                {...props}
              />

              {currentValue && !disabled && !readOnly && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 z-10 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                  aria-label="Clear value"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <PopoverContent align="start" className="w-80 p-4 space-y-4">
              {/* Date Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Time Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  Time
                </label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={e => handleTimeChange(e.target.value)}
                  className="w-full rounded-lg border border-input bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Quick Times */}
              <div className="pt-2 border-t border-border flex flex-wrap gap-1.5">
                {['08:00', '12:00', '14:30', '18:00'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTimeChange(t)}
                    className={cn(
                      'px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                      selectedTime === t
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Done
              </button>
            </PopoverContent>
          </Popover>
        </div>
      </FieldWrapper>
    )
  }
)

DatetimeField.displayName = 'DatetimeField'
