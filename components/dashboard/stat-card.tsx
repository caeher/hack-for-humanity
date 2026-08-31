import React from 'react'
import { Card } from '@/components/ui/card'

export interface StatCardProps {
  label: string
  value: string
  detail: string
  icon: React.ElementType
}

export function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-[-.04em] text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </Card>
  )
}
