'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import {
  COMPARISON_VIEW_DEFINITIONS,
  SYMPTOM_GROUP_DEFINITIONS,
  TIMELINE_COPY,
  type ComparisonViewKey,
  type SymptomGroupKey,
  type TimelineDayPoint,
  type TimelineEventMarker,
  TIMELINE_EVENT_LABELS,
  formatExposureCellValue,
  formatSymptomValue,
} from '@/lib/recoveryTimeline'

export interface RecoveryTimelineTableProps {
  points: TimelineDayPoint[]
  events: TimelineEventMarker[]
  symptomGroup: SymptomGroupKey
  comparisonView: ComparisonViewKey
  timeZone: string
  className?: string
}

export function RecoveryTimelineTable({
  points,
  events,
  symptomGroup,
  comparisonView,
  timeZone,
  className,
}: RecoveryTimelineTableProps) {
  const symptomDef = SYMPTOM_GROUP_DEFINITIONS[symptomGroup]
  const comparisonDef = COMPARISON_VIEW_DEFINITIONS[comparisonView]

  const eventsByDate = new Map<string, TimelineEventMarker[]>()
  for (const event of events) {
    const existing = eventsByDate.get(event.date) ?? []
    existing.push(event)
    eventsByDate.set(event.date, existing)
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[320px] border-collapse text-sm">
        <caption className="mb-3 text-left text-xs text-muted-foreground">
          {TIMELINE_COPY.tableCaption} Times shown in {timeZone}.
        </caption>
        <thead>
          <tr className="border-b border-border text-left">
            <th scope="col" className="px-2 py-2 font-medium text-foreground">
              Date
            </th>
            <th scope="col" className="px-2 py-2 font-medium text-foreground">
              {symptomDef.shortLabel}
            </th>
            <th scope="col" className="px-2 py-2 font-medium text-foreground">
              {comparisonDef.exposureLabel}
            </th>
            <th scope="col" className="px-2 py-2 font-medium text-foreground">
              Events
            </th>
            <th scope="col" className="sr-only">
              Source records
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map(point => {
            const dayEvents = eventsByDate.get(point.date) ?? []
            const isGap = point.symptomValue === null && point.exposureValue === null
            return (
              <tr
                key={point.date}
                className={cn(
                  'border-b border-border/70',
                  isGap && 'bg-muted/20 text-muted-foreground'
                )}
              >
                <th scope="row" className="px-2 py-2 font-normal">
                  <span className="font-medium text-foreground">{point.dayLabel}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {point.date}
                  </span>
                </th>
                <td className="px-2 py-2">
                  {point.symptomValue === null ? (
                    <span aria-label="No check-in recorded">—</span>
                  ) : (
                    formatSymptomValue(point.symptomValue, symptomGroup)
                  )}
                </td>
                <td className="px-2 py-2">
                  {point.exposureValue === null ? (
                    <span aria-label="No exposure log recorded">—</span>
                  ) : (
                    formatExposureCellValue(point.exposureValue, comparisonView)
                  )}
                </td>
                <td className="px-2 py-2">
                  {dayEvents.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <ul className="space-y-1">
                      {dayEvents.map(event => (
                        <li key={event.id} className="text-xs">
                          <span className="font-medium text-foreground">
                            {TIMELINE_EVENT_LABELS[event.kind]}
                          </span>
                          <span className="text-muted-foreground"> · {event.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="sr-only">
                  {point.checkInId ? `Check-in ${point.checkInId}` : 'No check-in'}
                  {point.exposureId ? `; Exposure ${point.exposureId}` : '; No exposure'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
