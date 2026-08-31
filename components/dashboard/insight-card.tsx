import React from 'react'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface InsightCardProps {
  title?: string
  description?: string
  footer?: string
}

export function InsightCard({
  title = 'Your sleep may be affecting morning stiffness',
  description = 'On nights with 7+ hours of sleep, your morning mobility scores were 14% higher.',
  footer = 'BASED ON 12 CHECK-INS · MODERATE CONFIDENCE',
}: InsightCardProps) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-lg bg-accent text-foreground">
          <Sparkles className="size-5" />
        </div>
        <Badge>CRI insight</Badge>
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-5 border-t border-border pt-4">
        <p className="font-mono text-xs text-muted-foreground uppercase">{footer}</p>
      </div>
    </Card>
  )
}
