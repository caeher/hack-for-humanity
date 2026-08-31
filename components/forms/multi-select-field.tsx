'use client'

import React, { forwardRef, useState, useId } from 'react'
import { ChevronsUpDown, Check, X, Search } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { BaseFieldProps, OptionItem } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface MultiSelectFieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'prefix' | 'defaultValue'>,
    BaseFieldProps {
  options: (string | OptionItem<string>)[]
  value?: string[]
  defaultValue?: string[]
  onChange?: (e: { target: { name?: string; value: string[] } }) => void
  maxVisibleTags?: number
  placeholder?: string
  searchPlaceholder?: string
}

export const MultiSelectField = forwardRef<HTMLDivElement, MultiSelectFieldProps>(
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
      options = [],
      value: controlledValue,
      defaultValue = [],
      onChange,
      maxVisibleTags = 3,
      placeholder = 'Select multiple options...',
      searchPlaceholder = 'Filter options...',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState<string[]>(defaultValue)
    const [searchQuery, setSearchQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const normalizedOptions: OptionItem<string>[] = options.map(opt =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    )

    const filteredOptions = normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleToggle = (val: string) => {
      const next = currentValue.includes(val)
        ? currentValue.filter(v => v !== val)
        : [...currentValue, val]

      if (controlledValue === undefined) {
        setInternalValue(next)
      }
      onChange?.({
        target: { name, value: next },
      })
    }

    const handleRemoveTag = (e: React.MouseEvent, val: string) => {
      e.stopPropagation()
      const next = currentValue.filter(v => v !== val)
      if (controlledValue === undefined) {
        setInternalValue(next)
      }
      onChange?.({
        target: { name, value: next },
      })
    }

    const handleClearAll = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (controlledValue === undefined) {
        setInternalValue([])
      }
      onChange?.({
        target: { name, value: [] },
      })
    }

    const selectedLabels = currentValue
      .map(v => normalizedOptions.find(o => o.value === v)?.label || v)

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
        <div ref={ref} className="relative w-full" {...props}>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild disabled={disabled || readOnly}>
              <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-invalid={effectiveStatus === 'error'}
                className={cn(
                  inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
                  'min-h-[2.5rem] h-auto py-1 flex items-center justify-between cursor-pointer select-none',
                  CustomIcon && (size === 'sm' ? 'pl-7' : size === 'lg' ? 'pl-11' : 'pl-9'),
                  disabled && 'opacity-50 cursor-not-allowed',
                  className
                )}
              >
                {CustomIcon && (
                  <div className="absolute left-3 z-10 text-muted-foreground pointer-events-none">
                    <CustomIcon className="size-4" />
                  </div>
                )}

                <div className="flex flex-wrap gap-1 flex-1 items-center pr-2">
                  {currentValue.length === 0 ? (
                    <span className="text-muted-foreground/60 text-xs sm:text-sm">{placeholder}</span>
                  ) : (
                    <>
                      {selectedLabels.slice(0, maxVisibleTags).map((labelStr, i) => {
                        const val = currentValue[i]
                        return (
                          <span
                            key={val}
                            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground"
                          >
                            <span className="truncate max-w-[120px]">{labelStr}</span>
                            {!disabled && !readOnly && (
                              <button
                                type="button"
                                onClick={e => handleRemoveTag(e, val)}
                                className="rounded-full hover:bg-card p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label={`Remove ${labelStr}`}
                              >
                                <X className="size-3" />
                              </button>
                            )}
                          </span>
                        )
                      })}

                      {currentValue.length > maxVisibleTags && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          +{currentValue.length - maxVisibleTags} more
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentValue.length > 0 && !disabled && !readOnly && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      aria-label="Clear all"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <ChevronsUpDown className="size-4 text-muted-foreground/70" />
                </div>
              </div>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-2">
              {/* Search input in popover */}
              <div className="relative flex items-center px-2 py-1 mb-1 border-b border-border/80 pb-2">
                <Search className="size-3.5 text-muted-foreground mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Options list */}
              <div className="max-h-56 overflow-y-auto space-y-0.5" role="listbox">
                {filteredOptions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map(opt => {
                    const isSelected = currentValue.includes(opt.value)
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => !opt.disabled && handleToggle(opt.value)}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer select-none',
                          isSelected ? 'bg-primary/10 text-foreground font-semibold' : 'hover:bg-muted text-foreground',
                          opt.disabled && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={opt.disabled}
                          onCheckedChange={() => !opt.disabled && handleToggle(opt.value)}
                        />
                        <div className="flex-1 truncate">
                          <span className="block truncate">{opt.label}</span>
                          {opt.description && (
                            <span className="block text-[10px] text-muted-foreground font-normal truncate">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </FieldWrapper>
    )
  }
)

MultiSelectField.displayName = 'MultiSelectField'
