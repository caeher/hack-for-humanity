'use client'

import React, { forwardRef, useState, useId } from 'react'
import { ChevronsUpDown, Check, X, Search } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { BaseFieldProps, OptionItem } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

export interface ComboboxFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  options: (string | OptionItem<string>)[]
  value?: string
  defaultValue?: string
  onChange?: (e: { target: { name?: string; value: string } }) => void
  allowCustom?: boolean
  emptyText?: string
}

export const ComboboxField = forwardRef<HTMLInputElement, ComboboxFieldProps>(
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
      defaultValue = '',
      onChange,
      allowCustom = false,
      placeholder = 'Select or search...',
      emptyText = 'No matching options found',
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState(defaultValue)
    const [searchQuery, setSearchQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    // Normalize options
    const normalizedOptions: OptionItem<string>[] = options.map(opt =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt
    )

    const selectedOption = normalizedOptions.find(opt => opt.value === currentValue)

    // Filtered options based on search
    const filteredOptions = normalizedOptions.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opt.value.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleSelect = (val: string) => {
      if (controlledValue === undefined) {
        setInternalValue(val)
      }
      onChange?.({
        target: { name, value: val },
      })
      setIsOpen(false)
      setSearchQuery('')
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (controlledValue === undefined) {
        setInternalValue('')
      }
      onChange?.({
        target: { name, value: '' },
      })
      setSearchQuery('')
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
            <PopoverTrigger asChild disabled={disabled || readOnly}>
              <div
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-invalid={effectiveStatus === 'error'}
                className={cn(
                  inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
                  'flex items-center justify-between cursor-pointer select-none',
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

                <span className={cn('truncate', !selectedOption && 'text-muted-foreground/60')}>
                  {selectedOption ? selectedOption.label : placeholder}
                </span>

                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {currentValue && !disabled && !readOnly && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="Clear selection"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                  <ChevronsUpDown className="size-4 text-muted-foreground/70" />
                </div>
              </div>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-2"
            >
              {/* Search input in popover */}
              <div className="relative flex items-center px-2 py-1 mb-1 border-b border-border/80 pb-2">
                <Search className="size-3.5 text-muted-foreground mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type to filter..."
                  className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Options list */}
              <div className="max-h-56 overflow-y-auto space-y-0.5" role="listbox">
                {filteredOptions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    {emptyText}
                    {allowCustom && searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => handleSelect(searchQuery.trim())}
                        className="mt-2 block w-full rounded-lg bg-primary/10 text-primary py-1.5 text-xs font-semibold hover:bg-primary/20 cursor-pointer"
                      >
                        Use &quot;{searchQuery.trim()}&quot;
                      </button>
                    )}
                  </div>
                ) : (
                  filteredOptions.map(opt => {
                    const isSelected = opt.value === currentValue
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(opt.value)}
                        disabled={opt.disabled}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer',
                          isSelected ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground',
                          opt.disabled && 'opacity-40 cursor-not-allowed'
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {opt.icon && <opt.icon className="size-3.5 shrink-0" />}
                          <div>
                            <span className="block truncate">{opt.label}</span>
                            {opt.description && (
                              <span
                                className={cn(
                                  'block text-[10px] font-normal truncate',
                                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                )}
                              >
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="size-3.5 shrink-0 ml-2" />}
                      </button>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Hidden input for form compatibility */}
          <input
            ref={ref}
            type="hidden"
            id={id}
            name={name}
            value={currentValue}
            {...props}
          />
        </div>
      </FieldWrapper>
    )
  }
)

ComboboxField.displayName = 'ComboboxField'
