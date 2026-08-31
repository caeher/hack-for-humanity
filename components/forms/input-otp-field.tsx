'use client'

import React, { forwardRef, useState, useId, useRef, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BaseFieldProps } from './types'
import { FieldWrapper } from './field-wrapper'

export interface InputOtpFieldProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'prefix'>,
    BaseFieldProps {
  length?: number
  value?: string
  defaultValue?: string
  onChange?: (e: { target: { name?: string; value: string } }) => void
  onComplete?: (code: string) => void
  masked?: boolean
  allowMaskToggle?: boolean
}

export const InputOtpField = forwardRef<HTMLDivElement, InputOtpFieldProps>(
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
      length = 6,
      value: controlledValue,
      defaultValue = '',
      onChange,
      onComplete,
      masked = false,
      allowMaskToggle = true,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const id = customId || generatedId
    const [internalValue, setInternalValue] = useState(defaultValue)
    const [isMasked, setIsMasked] = useState(masked)
    const inputsRef = useRef<(HTMLInputElement | null)[]>([])

    const currentValue = (controlledValue !== undefined ? controlledValue : internalValue).slice(0, length)
    const digits = Array.from({ length }, (_, i) => currentValue[i] || '')
    const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

    const updateValue = (newVal: string) => {
      const sanitized = newVal.replace(/[^0-9a-zA-Z]/g, '').slice(0, length)
      if (controlledValue === undefined) {
        setInternalValue(sanitized)
      }
      onChange?.({
        target: { name, value: sanitized },
      })
      if (sanitized.length === length) {
        onComplete?.(sanitized)
      }
    }

    const handleChange = (index: number, char: string) => {
      const chars = [...digits]
      chars[index] = char.slice(-1)
      const nextVal = chars.join('')
      updateValue(nextVal)

      if (char && index < length - 1) {
        inputsRef.current[index + 1]?.focus()
      }
    }

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus()
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputsRef.current[index - 1]?.focus()
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        inputsRef.current[index + 1]?.focus()
      }
    }

    const handlePaste = (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text').trim()
      updateValue(pasted)
      const targetIndex = Math.min(pasted.length, length - 1)
      inputsRef.current[targetIndex]?.focus()
    }

    const sizeClasses = {
      sm: 'size-8 text-sm rounded-md',
      md: 'size-11 text-lg rounded-lg',
      lg: 'size-14 text-2xl rounded-xl',
    }[size]

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
        <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
          <div className="flex items-center gap-2" onPaste={handlePaste}>
            {Array.from({ length }).map((_, index) => (
              <React.Fragment key={index}>
                <input
                  ref={el => {
                    inputsRef.current[index] = el
                  }}
                  type={isMasked ? 'password' : 'text'}
                  inputMode="numeric"
                  maxLength={1}
                  disabled={disabled}
                  readOnly={readOnly}
                  value={digits[index] || ''}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1} of ${length}`}
                  className={cn(
                    'border border-input bg-card text-center font-mono font-bold text-foreground transition-all outline-none',
                    'focus:border-ring focus:ring-2 focus:ring-ring/20',
                    effectiveStatus === 'error' && 'border-destructive text-destructive',
                    effectiveStatus === 'success' && 'border-success',
                    digits[index] ? 'border-primary/60 shadow-xs' : '',
                    sizeClasses
                  )}
                />
                {length === 6 && index === 2 && (
                  <span className="text-muted-foreground font-bold select-none px-0.5">-</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {allowMaskToggle && (
            <button
              type="button"
              onClick={() => setIsMasked(!isMasked)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
              aria-label={isMasked ? 'Show OTP' : 'Hide OTP'}
            >
              {isMasked ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
      </FieldWrapper>
    )
  }
)

InputOtpField.displayName = 'InputOtpField'
