'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface CalendarFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement> | { target: { name?: string; value: string } }) => void
  minDate?: string
  maxDate?: string
  presets?: { label: string; daysOffset: number }[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const CalendarField = forwardRef<HTMLInputElement, CalendarFieldProps>(
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
      icon: CustomIcon,
      iconPosition,
      startAdornment,
      endAdornment,
      prefix,
      suffix,
      value: controlledValue,
      defaultValue = '',
      onChange,
      minDate,
      maxDate,
      presets = [
        { label: 'Today', daysOffset: 0 },
        { label: 'Tomorrow', daysOffset: 1 },
        { label: '+1 Week', daysOffset: 7 },
      ],
      placeholder = 'YYYY-MM-DD',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState(defaultValue)
    const [isOpen, setIsOpen] = useState(false)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue

    // Parse current date or fallback to today
    const parsedDate = currentValue ? new Date(currentValue + 'T00:00:00') : new Date()
    const [viewYear, setViewYear] = useState(
      isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear()
    )
    const [viewMonth, setViewMonth] = useState(
      isNaN(parsedDate.getTime()) ? new Date().getMonth() : parsedDate.getMonth()
    )

    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const handleDateSelect = (year: number, month: number, day: number) => {
      const formattedMonth = String(month + 1).padStart(2, '0')
      const formattedDay = String(day).padStart(2, '0')
      const dateString = `${year}-${formattedMonth}-${formattedDay}`

      if (controlledValue === undefined) {
        setInternalValue(dateString)
      }

      if (onChange) {
        onChange({
          target: { name, value: dateString } as any,
        })
      }

      setIsOpen(false)
    }

    const handlePreset = (daysOffset: number) => {
      const d = new Date()
      d.setDate(d.getDate() + daysOffset)
      handleDateSelect(d.getFullYear(), d.getMonth(), d.getDate())
    }

    const prevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11)
        setViewYear(y => y - 1)
      } else {
        setViewMonth(m => m - 1)
      }
    }

    const nextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear(y => y + 1)
      } else {
        setViewMonth(m => m + 1)
      }
    }

    // Days in current view month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay()

    const DisplayIcon = CustomIcon || CalendarIcon

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
                  aria-label="Open calendar"
                >
                  <DisplayIcon
                    className={cn('size-4', size === 'sm' && 'size-3.5', size === 'lg' && 'size-5')}
                  />
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
                  onChange?.(e)
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
                  onClick={e => {
                    e.stopPropagation()
                    if (controlledValue === undefined) setInternalValue('')
                    onChange?.({ target: { name, value: '' } } as any)
                  }}
                  className="absolute right-3 z-10 text-muted-foreground hover:text-foreground p-0.5 rounded-full cursor-pointer"
                  aria-label="Clear date"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <PopoverContent align="start" className="w-auto p-3">
              {/* Header navigation */}
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-semibold text-foreground">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {DAY_NAMES.map(day => (
                  <span key={day} className="text-[10px] font-medium text-muted-foreground py-1">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="size-8" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const formattedMonth = String(viewMonth + 1).padStart(2, '0')
                  const formattedDay = String(day).padStart(2, '0')
                  const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`
                  const isSelected = currentValue === dateStr
                  const isToday = new Date().toISOString().slice(0, 10) === dateStr

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDateSelect(viewYear, viewMonth, day)}
                      className={cn(
                        'size-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center cursor-pointer',
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : isToday
                          ? 'border border-primary/40 text-primary hover:bg-primary/10'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>

              {/* Presets */}
              {presets.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-1">
                  {presets.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePreset(preset.daysOffset)}
                      className="px-2 py-1 text-[11px] font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </FieldWrapper>
    )
  }
)

CalendarField.displayName = 'CalendarField'
