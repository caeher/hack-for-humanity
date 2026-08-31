import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad'

export const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tracking-tight transition-colors select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-[color-mix(in_srgb,var(--destructive)_12%,white)] text-[var(--destructive)]',
        outline: 'border border-border text-foreground',
        good: 'bg-[color-mix(in_srgb,var(--success)_12%,white)] text-[var(--success)]',
        warn: 'bg-[color-mix(in_srgb,var(--warning)_12%,white)] text-[var(--warning)]',
        bad: 'bg-[color-mix(in_srgb,var(--destructive)_10%,white)] text-[var(--destructive)]',
        neutral: 'bg-secondary text-muted-foreground',
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
}

export function Badge({
  children,
  tone,
  variant,
  className,
  ...props
}: BadgeProps) {
  // If tone is explicitly passed, map it to the corresponding tone variant for backwards compatibility
  const effectiveVariant = tone || variant || 'neutral'

  return (
    <span
      className={cn(badgeVariants({ variant: effectiveVariant }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

