'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'

export interface TodayPlanTask {
  id?: Id<'carePlans'>
  title: string
  targetTime?: string
  completed: boolean
}

export interface TodayPlanProps {
  tasks?: TodayPlanTask[]
  mode?: 'live' | 'demo'
  isLoading?: boolean
  emptyMessage?: string
}

const DEMO_TASKS: TodayPlanTask[] = [
  { title: 'Morning symptom check-in · 8:00 AM', completed: true },
  { title: "Review today's clinician-provided plan", completed: false },
  { title: 'Prepare questions for the next appointment', completed: false },
]

export function TodayPlan({
  tasks,
  mode = 'demo',
  isLoading = false,
  emptyMessage,
}: TodayPlanProps) {
  const [demoDone, setDemoDone] = useState([true, false, false])
  const toggleTask = useMutation(api.carePlans.toggleTask)
  const [pendingTaskId, setPendingTaskId] = useState<Id<'carePlans'> | null>(null)

  const resolvedTasks = tasks ?? DEMO_TASKS
  const isDemo = mode === 'demo' || resolvedTasks.every(task => !task.id)

  const handleToggle = async (index: number) => {
    const task = resolvedTasks[index]
    if (!task) return

    if (isDemo || !task.id) {
      setDemoDone(prev => prev.map((value, itemIndex) => (itemIndex === index ? !value : value)))
      return
    }

    setPendingTaskId(task.id)
    try {
      await toggleTask({ taskId: task.id, completed: !task.completed })
    } finally {
      setPendingTaskId(null)
    }
  }

  const completedStates = isDemo
    ? demoDone
    : resolvedTasks.map(task => task.completed)

  const remaining = completedStates.filter(done => !done).length

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-56 rounded bg-muted" />
          <div className="mt-4 h-12 rounded-lg bg-muted" />
          <div className="h-12 rounded-lg bg-muted" />
        </div>
      </Card>
    )
  }

  if (resolvedTasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Today&apos;s recovery plan</h2>
            <p className="text-sm text-muted-foreground">No plan items assigned for today</p>
          </div>
          <Link
            href="/patient/plan"
            className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            View plan
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          {emptyMessage ??
            'Your care team has not assigned pacing items for today. Check back after your next clinical visit.'}
        </p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Today&apos;s recovery plan</h2>
          <p className="text-sm text-muted-foreground">
            {remaining} of {resolvedTasks.length} activities remaining
          </p>
        </div>
        <Link
          href="/patient/plan"
          className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          View plan
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {resolvedTasks.map((task, index) => {
          const checked = completedStates[index] ?? false
          const isPending = task.id !== undefined && pendingTaskId === task.id
          const label = task.targetTime ? `${task.title} · ${task.targetTime}` : task.title

          return (
            <div
              key={task.id ?? task.title}
              onClick={() => void handleToggle(index)}
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted transition-colors cursor-pointer select-none"
            >
              {isPending ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => void handleToggle(index)}
                  className="size-5"
                />
              )}
              <span
                className={cn(
                  checked ? 'text-muted-foreground line-through' : 'text-sm font-medium text-foreground'
                )}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
      {mode === 'demo' && (
        <p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">Simulated plan data</p>
      )}
    </Card>
  )
}
