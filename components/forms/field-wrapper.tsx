import React from 'react'
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { BaseFieldProps } from './types'

export interface FieldWrapperProps extends BaseFieldProps {
  children: React.ReactNode
  htmlFor?: string
  counter?: React.ReactNode
}

export function FieldWrapper({
  id,
  htmlFor,
  label,
  sublabel,
  hint,
  error,
  success,
  warning,
  required,
  inline,
  status = 'default',
  className,
  wrapperClassName,
  labelClassName,
  hintClassName,
  errorClassName,
  counter,
  children,
}: FieldWrapperProps) {
  const targetId = htmlFor || id
  const effectiveStatus = error ? 'error' : success ? 'success' : warning ? 'warning' : status

  if (inline) {
    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        <div className={cn('flex items-center justify-between gap-3', className)}>
          {label && (
            <Label
              htmlFor={targetId}
              className={cn(
                'text-sm font-medium text-foreground cursor-pointer select-none',
                labelClassName
              )}
            >
              {label}
              {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
              {sublabel && (
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  {sublabel}
                </span>
              )}
            </Label>
          )}
          {children}
        </div>
        {(error || hint || success || warning) && (
          <div className="flex items-center justify-between text-xs mt-0.5">
            {error ? (
              <p className={cn('text-destructive flex items-center gap-1.5 font-medium', errorClassName)}>
                <AlertCircle className="size-3.5 shrink-0" />
                {error}
              </p>
            ) : warning ? (
              <p className="text-warning flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                {warning}
              </p>
            ) : success ? (
              <p className="text-success flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0" />
                {success}
              </p>
            ) : hint ? (
              <p className={cn('text-muted-foreground flex items-center gap-1', hintClassName)}>
                {hint}
              </p>
            ) : null}
            {counter && <span className="text-muted-foreground ml-auto">{counter}</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', wrapperClassName)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor={targetId}
            className={cn(
              'text-sm font-semibold text-foreground tracking-tight cursor-pointer',
              labelClassName
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
          </Label>
          {sublabel && (
            <span className="text-xs text-muted-foreground font-normal">
              {sublabel}
            </span>
          )}
        </div>
      )}

      <div className={cn('relative w-full', className)}>
        {children}
      </div>

      {(error || hint || success || warning || counter) && (
        <div className="flex items-start justify-between gap-2 text-xs mt-0.5 min-h-4">
          <div className="flex-1">
            {error ? (
              <p className={cn('text-destructive flex items-center gap-1.5 font-medium animate-in fade-in duration-200', errorClassName)}>
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            ) : warning ? (
              <p className="text-warning flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span>{warning}</span>
              </p>
            ) : success ? (
              <p className="text-success flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>{success}</span>
              </p>
            ) : hint ? (
              <p className={cn('text-muted-foreground leading-relaxed', hintClassName)}>
                {hint}
              </p>
            ) : null}
          </div>
          {counter && (
            <div className="text-muted-foreground shrink-0 tabular-nums">
              {counter}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
