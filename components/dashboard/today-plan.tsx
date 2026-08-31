'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export function TodayPlan() {
  const [done, setDone] = useState([true, false, false])
  const tasks = [
    'Morning symptom check-in · 8:00 AM',
    'Review today\'s clinician-provided plan',
    'Prepare questions for the next appointment',
  ]

  const toggleTask = (index: number) => {
    setDone(prev => prev.map((v, n) => (n === index ? !v : v)))
  }

  const remaining = done.filter(d => !d).length

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Today&apos;s recovery plan</h2>
          <p className="text-sm text-muted-foreground">{remaining} of {tasks.length} activities remaining</p>
        </div>
        <Link
          href="/patient/plan"
          className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          View plan
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <div
            key={task}
            onClick={() => toggleTask(i)}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors cursor-pointer select-none"
          >
            <Checkbox
              checked={done[i]}
              onCheckedChange={() => toggleTask(i)}
              className="size-5"
            />
            <span className={cn(done[i] ? 'text-muted-foreground line-through' : 'text-sm font-medium text-foreground')}>
              {task}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
