'use client'

import React, { useMemo } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { CalendarDays, History, Plus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layouts/page-header'
import { TodayPlan } from '@/components/dashboard/today-plan'
import type { Doc } from '@/convex/_generated/dataModel'
import { api } from '@/convex/_generated/api'
import { CARE_PLAN_CATEGORY_LABELS } from '@/lib/carePlan'
import { isE2ETestMode } from '@/lib/e2e'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function CarePlanSectionDemo() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Personalized pathway"
        title="Recovery plan"
        description="Clinician-provided instructions, appointments, and personal reminders in one place."
      />
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          2 of 4 clinician-directed items completed. Missed or skipped items are not emergencies — contact
          your care team if symptoms change.
        </p>
      </Card>
      <TodayPlan />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Plan reminders</h2>
          <div className="mt-4 flex flex-col gap-3">
            {['Bring symptom summary to follow-up', 'Write down questions for the care team'].map(x => (
              <div className="flex items-center justify-between rounded-lg bg-muted p-4" key={x}>
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
            <p className="mt-1 text-sm text-muted-foreground">Sep 3 · 10:30 AM · Dr. Olivia Brooks</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function CarePlanSectionLive() {
  const patient = useQuery(api.patients.getMePatient, {})
  const patientId = patient?._id

  const carePlans = useQuery(
    api.carePlans.listByPatient,
    patientId ? { patientId } : 'skip'
  )
  const adherence = useQuery(
    api.carePlans.getAdherenceSummary,
    patientId ? { patientId } : 'skip'
  )
  const reminders = useQuery(
    api.reminders.listByPatient,
    patientId ? { patientId, status: 'active' } : 'skip'
  )
  const planEvents = useQuery(
    api.carePlans.listEvents,
    patientId ? { patientId, limit: 5 } : 'skip'
  )
  const encounters = useQuery(
    api.patientDashboard.getSummary,
    patientId ? { patientId, today: todayIsoDate() } : 'skip'
  )

  const createReminder = useMutation(api.reminders.create)

  const upcomingAppointment = useMemo(() => {
    if (!carePlans) return null
    return carePlans.find(
      item =>
        item.category === 'appointment' &&
        item.completionStatus === 'pending' &&
        (item.scheduledDate === undefined || item.scheduledDate >= todayIsoDate())
    )
  }, [carePlans])

  const handleAddReminder = async () => {
    if (!patientId) return
    await createReminder({
      patientId,
      title: 'Write down questions for the care team',
      channel: 'email',
      scheduledTime: '18:00',
      timeZone: patient?.timeZone,
    })
  }

  const isLoading = patient === undefined

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Personalized pathway"
        title="Recovery plan"
        description="Clinician-provided instructions, appointments, and personal reminders in one place."
      />

      {adherence && (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{adherence.neutralSummary}</p>
        </Card>
      )}

      <TodayPlan
        mode="live"
        isLoading={isLoading}
        tasks={(carePlans ?? []).map(task => ({
          id: task._id,
          title: task.title,
          targetTime: task.targetTime,
          completed: task.completed,
          completionStatus: task.completionStatus,
          allowPatientCompletion: task.allowPatientCompletion,
        }))}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Plan reminders</h2>
            <Button variant="outline" size="sm" onClick={() => void handleAddReminder()} disabled={!patientId}>
              <Plus className="mr-1.5 size-4" />
              Add reminder
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Delivery respects your notification consent and quiet hours.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {(reminders ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active reminders yet.</p>
            ) : (
              (reminders ?? []).map((reminder: Doc<'planReminders'>) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-muted p-4"
                  key={reminder._id}
                >
                  <div>
                    <span className="text-sm font-medium text-foreground">{reminder.title}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reminder.scheduledTime} · {reminder.channel}
                    </p>
                  </div>
                  <Badge tone="neutral">
                    {reminder.createdByRole === 'patient' ? 'Added by patient' : 'Care team'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-foreground">Upcoming care</h2>
          <div className="mt-4 rounded-lg bg-muted p-4">
            {upcomingAppointment ? (
              <>
                <p className="font-semibold text-foreground">{upcomingAppointment.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {upcomingAppointment.scheduledDate ?? 'Date TBD'}
                  {upcomingAppointment.targetTime ? ` · ${upcomingAppointment.targetTime}` : ''}
                </p>
                {upcomingAppointment.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{upcomingAppointment.description}</p>
                )}
              </>
            ) : encounters?.nextEncounter ? (
              <>
                <p className="font-semibold text-foreground">Clinical follow-up</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {encounters.nextEncounter.datetime}
                  {encounters.nextEncounterClinicianName
                    ? ` · ${encounters.nextEncounterClinicianName}`
                    : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming visit on file.</p>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Appointments are clinician-directed — not clearance decisions.
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Recent plan activity</h2>
        </div>
        {(planEvents ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Plan changes will appear here for your review.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(planEvents ?? []).map(event => (
              <li key={event._id} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                {event.summary}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {carePlans && carePlans.some(item => item.category === 'medication') && (
        <Card className="border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-foreground">
            Medication items reflect clinician-recorded instructions only. CRI does not generate or adjust prescriptions.
          </p>
        </Card>
      )}

      {carePlans && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from(new Set(carePlans.map(item => item.category))).map(category => (
            <Card key={category} className="p-4">
              <p className="text-xs font-mono uppercase text-muted-foreground">Category</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {CARE_PLAN_CATEGORY_LABELS[category]}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function CarePlanSection() {
  if (isE2ETestMode) {
    return <CarePlanSectionDemo />
  }
  return <CarePlanSectionLive />
}
