'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Check, Loader2, MoreHorizontal, SkipForward, XCircle } from 'lucide-react'
import { useMutation } from 'convex/react'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  COMPLETION_STATUS_DESCRIPTIONS,
  COMPLETION_STATUS_LABELS,
  type CarePlanCompletionStatus,
} from '@/lib/carePlan'
import { cn } from '@/lib/utils'

export interface TodayPlanTask {
  id?: Id<'carePlans'>
  title: string
  targetTime?: string
  completed: boolean
  completionStatus?: CarePlanCompletionStatus
  allowPatientCompletion?: boolean
}

export interface TodayPlanProps {
  tasks?: TodayPlanTask[]
  mode?: 'live' | 'demo'
  isLoading?: boolean
  emptyMessage?: string
}

const DEMO_TASKS: TodayPlanTask[] = [
  {
    title: 'Morning symptom check-in · 8:00 AM',
    completed: true,
    completionStatus: 'completed',
    allowPatientCompletion: true,
  },
  {
    title: "Review today's clinician-provided plan",
    completed: false,
    completionStatus: 'pending',
    allowPatientCompletion: true,
  },
  {
    title: 'Prepare questions for the next appointment',
    completed: false,
    completionStatus: 'pending',
    allowPatientCompletion: true,
  },
]

export function TodayPlan(props: TodayPlanProps) {
  if (props.mode === 'live') {
    return <TodayPlanLive {...props} />
  }
  return <TodayPlanDemo {...props} />
}

function TodayPlanDemo({
  tasks,
  isLoading = false,
  emptyMessage,
}: TodayPlanProps) {
  const [demoTasks, setDemoTasks] = useState(
    (tasks ?? DEMO_TASKS).map(task => ({
      ...task,
      completionStatus: task.completionStatus ?? (task.completed ? 'completed' : 'pending'),
    }))
  )

  const handleStatus = (index: number, status: CarePlanCompletionStatus) => {
    setDemoTasks(prev =>
      prev.map((task, itemIndex) =>
        itemIndex === index
          ? {
              ...task,
              completionStatus: status,
              completed: status === 'completed',
            }
          : task
      )
    )
  }

  return (
    <TodayPlanLayout
      tasks={demoTasks}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onStatusChange={handleStatus}
      footer={<p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">Simulated plan data</p>}
    />
  )
}

function TodayPlanLive({
  tasks = [],
  isLoading = false,
  emptyMessage,
}: TodayPlanProps) {
  const updateStatus = useMutation(api.carePlans.updateCompletionStatus)
  const [pendingTaskId, setPendingTaskId] = useState<Id<'carePlans'> | null>(null)

  const handleStatus = async (index: number, status: CarePlanCompletionStatus) => {
    const task = tasks[index]
    if (!task?.id || task.allowPatientCompletion === false) return

    setPendingTaskId(task.id)
    try {
      await updateStatus({ taskId: task.id, completionStatus: status })
    } finally {
      setPendingTaskId(null)
    }
  }

  return (
    <TodayPlanLayout
      tasks={tasks}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      onStatusChange={(index, status) => void handleStatus(index, status)}
      pendingTaskId={pendingTaskId}
    />
  )
}

function TodayPlanLayout({
  tasks,
  isLoading,
  emptyMessage,
  onStatusChange,
  pendingTaskId,
  footer,
}: {
  tasks: TodayPlanTask[]
  isLoading?: boolean
  emptyMessage?: string
  onStatusChange: (index: number, status: CarePlanCompletionStatus) => void
  pendingTaskId?: Id<'carePlans'> | null
  footer?: React.ReactNode
}) {
  const resolvedTasks = tasks.map(task => ({
    ...task,
    completionStatus: task.completionStatus ?? (task.completed ? 'completed' : 'pending'),
  }))

  const remaining = resolvedTasks.filter(
    task => task.completionStatus === 'pending'
  ).length

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
        <p className="mt-3 text-xs text-muted-foreground">
          Missed plan items are not emergencies. Contact your clinician if symptoms change.
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
          const status = task.completionStatus ?? 'pending'
          const isPending = task.id !== undefined && pendingTaskId === task.id
          const label = task.targetTime ? `${task.title} · ${task.targetTime}` : task.title
          const canUpdate = task.allowPatientCompletion !== false

          return (
            <div
              key={task.id ?? task.title}
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-left"
            >
              {isPending ? (
                <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Checkbox
                  checked={status === 'completed'}
                  disabled={!canUpdate}
                  onCheckedChange={checked =>
                    onStatusChange(index, checked ? 'completed' : 'pending')
                  }
                  className="size-5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    status === 'completed'
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground',
                    status === 'skipped' && 'text-muted-foreground',
                    status === 'unable_to_complete' && 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
                {status !== 'pending' && status !== 'completed' && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {COMPLETION_STATUS_LABELS[status]} — {COMPLETION_STATUS_DESCRIPTIONS[status]}
                  </p>
                )}
              </div>
              {canUpdate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Plan item actions">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onStatusChange(index, 'completed')}>
                      <Check className="mr-2 size-4" />
                      Mark completed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(index, 'skipped')}>
                      <SkipForward className="mr-2 size-4" />
                      Skip for today
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusChange(index, 'unable_to_complete')}>
                      <XCircle className="mr-2 size-4" />
                      Unable to complete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Skipped or missed items are not emergencies. Your care team reviews adherence without scores or grades.
      </p>
      {footer}
    </Card>
  )
}
