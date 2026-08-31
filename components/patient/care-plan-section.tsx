import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layouts/page-header'
import { TodayPlan } from '@/components/dashboard/today-plan'

export function CarePlanSection() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Personalized pathway"
        title="Recovery plan"
        description="Keep clinician-provided instructions, appointments, and personal reminders in one place."
        action={
          <button className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Week view
          </button>
        }
      />
      <TodayPlan />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Plan reminders</h2>
          <div className="mt-4 flex flex-col gap-3">
            {['Bring symptom summary to follow-up', 'Write down questions for the care team'].map(x => (
              <div
                className="flex items-center justify-between rounded-lg bg-muted p-4"
                key={x}
              >
                <span className="text-sm font-medium text-foreground">{x}</span>
                <Badge tone="good">Added by patient</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Upcoming care</h2>
          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="font-semibold text-foreground">Concussion follow-up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sep 3 · 10:30 AM · Dr. Olivia Brooks
            </p>
            <button className="mt-4 text-sm font-semibold text-foreground underline underline-offset-4 hover:text-primary">
              View appointment
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
