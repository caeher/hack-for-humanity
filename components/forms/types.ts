import React from 'react'

export type FieldVariant = 'outline' | 'filled' | 'ghost'
export type FieldSize = 'sm' | 'md' | 'lg'
export type FieldStatus = 'default' | 'error' | 'success' | 'warning'

export interface BaseFieldProps {
  id?: string
  name?: string
  label?: React.ReactNode
  sublabel?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  success?: React.ReactNode
  warning?: React.ReactNode
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  size?: FieldSize
  variant?: FieldVariant
  status?: FieldStatus
  inline?: boolean
  className?: string
  wrapperClassName?: string
  labelClassName?: string
  hintClassName?: string
  errorClassName?: string
  icon?: React.ElementType
  iconPosition?: 'left' | 'right'
  startAdornment?: React.ReactNode
  endAdornment?: React.ReactNode
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

export interface OptionItem<T = string> {
  label: string
  value: T
  description?: string
  icon?: React.ElementType
  disabled?: boolean
  badge?: string
  group?: string
}
