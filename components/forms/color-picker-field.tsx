'use client'

import React, { forwardRef, useState, useId } from 'react'
import { Pipette, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'
import { inputVariants } from './text-field'

const DEFAULT_PRESET_COLORS = [
  '#f9a600', // Primary Amber/Gold
  '#426c57', // Forest / Success
  '#a43e35', // Crimson / Destructive
  '#3b82f6', // Sky Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#64748b', // Slate
  '#261b07', // Dark Theme Foreground
  '#ffffff', // White
  '#000000', // Black
]

export interface ColorPickerFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'value' | 'onChange' | 'prefix'>,
    BaseFieldProps {
  value?: string
  defaultValue?: string
  onChange?: (e: { target: { name?: string; value: string } }) => void
  presets?: string[]
  allowCustom?: boolean
}

export const ColorPickerField = forwardRef<HTMLInputElement, ColorPickerFieldProps>(
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
      defaultValue = '#f9a600',
      onChange,
      presets = DEFAULT_PRESET_COLORS,
      allowCustom = true,
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

    const handleSelectColor = (hex: string) => {
      if (controlledValue === undefined) {
        setInternalValue(hex)
      }
      onChange?.({
        target: { name, value: hex },
      })
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
                role="button"
                tabIndex={0}
                aria-invalid={effectiveStatus === 'error'}
                className={cn(
                  inputVariants({ variant, fieldSize: size, status: effectiveStatus }),
                  'flex items-center justify-between cursor-pointer select-none',
                  disabled && 'opacity-50 cursor-not-allowed',
                  className
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-5 rounded-md border border-border shadow-xs shrink-0"
                    style={{ backgroundColor: currentValue || 'transparent' }}
                  />
                  <span className="font-mono text-xs font-semibold uppercase text-foreground">
                    {currentValue || 'Select color'}
                  </span>
                </div>

                <Pipette className="size-4 text-muted-foreground/70" />
              </div>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-64 p-3 space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Presets
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {presets.map(c => {
                    const isSelected = currentValue?.toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleSelectColor(c)}
                        className={cn(
                          'size-7 rounded-md border transition-transform hover:scale-110 flex items-center justify-center cursor-pointer',
                          isSelected ? 'border-foreground shadow-xs ring-1 ring-ring' : 'border-border/80'
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      >
                        {isSelected && (
                          <Check
                            className={cn(
                              'size-3.5 stroke-[3]',
                              ['#ffffff', '#fff'].includes(c.toLowerCase()) ? 'text-black' : 'text-white'
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {allowCustom && (
                <div className="pt-2.5 border-t border-border flex items-center gap-2">
                  <input
                    type="color"
                    value={currentValue}
                    onChange={e => handleSelectColor(e.target.value)}
                    className="size-8 rounded-lg border border-input cursor-pointer bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={currentValue}
                    onChange={e => handleSelectColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 rounded-lg border border-input bg-card px-2.5 py-1 font-mono text-xs text-foreground uppercase outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Hidden input for HTML form submission */}
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

ColorPickerField.displayName = 'ColorPickerField'
