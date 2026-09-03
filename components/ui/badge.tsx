import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react'

export type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad'

export const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-tight transition-colors select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-[color-mix(in_srgb,var(--destructive)_12%,white)] text-[var(--destructive)] border border-destructive/30',
        outline: 'border border-border text-foreground',
        good: 'bg-[color-mix(in_srgb,var(--success)_12%,white)] text-[var(--success)] border border-success/30',
        warn: 'bg-[color-mix(in_srgb,var(--warning)_12%,white)] text-[var(--warning)] border border-warning/30',
        bad: 'bg-[color-mix(in_srgb,var(--destructive)_10%,white)] text-[var(--destructive)] border border-destructive/30',
        neutral: 'bg-secondary text-muted-foreground border border-border/60',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  tone?: BadgeTone
  showIndicator?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

export function Badge({
  children,
  tone,
  variant,
  showIndicator = false,
  icon: CustomIcon,
  className,
  ...props
}: BadgeProps) {
  // If tone is explicitly passed, map it to the corresponding tone variant for backwards compatibility
  const effectiveVariant = tone || variant || 'neutral'

  const ToneIcon =
    CustomIcon ??
    (showIndicator
      ? effectiveVariant === 'good'
        ? CheckCircle2
        : effectiveVariant === 'warn'
        ? AlertTriangle
        : effectiveVariant === 'bad' || effectiveVariant === 'destructive'
        ? AlertCircle
        : null
      : null)

  return (
    <span
      className={cn(badgeVariants({ variant: effectiveVariant }), className)}
      {...props}
    >
      {ToneIcon && <ToneIcon className="mr-1 size-3 shrink-0 text-current" aria-hidden="true" />}
      {children}
    </span>
  )
}

