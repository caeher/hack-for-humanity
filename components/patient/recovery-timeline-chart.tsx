'use client'

import React, { useCallback, useId, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  COMPARISON_VIEW_DEFINITIONS,
  SYMPTOM_GROUP_DEFINITIONS,
  type ComparisonViewKey,
  type SymptomGroupKey,
  type TimelineDayPoint,
  type TimelineEventMarker,
  formatExposureCellValue,
  formatSymptomValue,
} from '@/lib/recoveryTimeline'

export interface RecoveryTimelineChartProps {
  points: TimelineDayPoint[]
  events: TimelineEventMarker[]
  symptomGroup: SymptomGroupKey
  comparisonView: ComparisonViewKey
  className?: string
}

interface ChartDatum {
  date: string
  dayLabel: string
  symptomValue: number | null
  exposureValue: number | null
  checkInId: string | null
  exposureId: string | null
}

function buildChartData(points: TimelineDayPoint[]): ChartDatum[] {
  return points.map(point => ({
    date: point.date,
    dayLabel: point.dayLabel,
    symptomValue: point.symptomValue,
    exposureValue: point.exposureValue,
    checkInId: point.checkInId,
    exposureId: point.exposureId,
  }))
}

interface PointInspectorProps {
  point: ChartDatum
  symptomGroup: SymptomGroupKey
  comparisonView: ComparisonViewKey
  events: TimelineEventMarker[]
}

function PointInspector({ point, symptomGroup, comparisonView, events }: PointInspectorProps) {
  const dayEvents = events.filter(event => event.date === point.date)

  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm">
      <p className="font-semibold text-foreground">{point.dayLabel}</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{point.date}</p>
      <dl className="mt-3 grid gap-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {SYMPTOM_GROUP_DEFINITIONS[symptomGroup].shortLabel}
          </dt>
          <dd className="font-medium text-foreground">
            {formatSymptomValue(point.symptomValue, symptomGroup)}
            {point.checkInId ? (
              <span className="sr-only"> from check-in record {point.checkInId}</span>
            ) : (
              <span className="text-muted-foreground"> · no check-in</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {COMPARISON_VIEW_DEFINITIONS[comparisonView].exposureShortLabel}
          </dt>
          <dd className="font-medium text-foreground">
            {formatExposureCellValue(point.exposureValue, comparisonView)}
            {point.exposureId ? (
              <span className="sr-only"> from exposure record {point.exposureId}</span>
            ) : (
              <span className="text-muted-foreground"> · no exposure log</span>
            )}
          </dd>
        </div>
      </dl>
      {dayEvents.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3" aria-label="Events on this day">
          {dayEvents.map(event => (
            <li key={event.id} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{event.title}</span>
              {event.detail ? ` — ${event.detail}` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function RecoveryTimelineChart({
  points,
  events,
  symptomGroup,
  comparisonView,
  className,
}: RecoveryTimelineChartProps) {
  const chartId = useId()
  const chartData = useMemo(() => buildChartData(points), [points])
  const [selectedIndex, setSelectedIndex] = useState(() => {
    for (let index = chartData.length - 1; index >= 0; index -= 1) {
      const point = chartData[index]
      if (point && (point.symptomValue !== null || point.exposureValue !== null)) {
        return index
      }
    }
    return 0
  })

  const symptomDef = SYMPTOM_GROUP_DEFINITIONS[symptomGroup]
  const comparisonDef = COMPARISON_VIEW_DEFINITIONS[comparisonView]

  const loggedPoints = chartData.filter(
    point => point.symptomValue !== null || point.exposureValue !== null
  )

  if (loggedPoints.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-48 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-4 text-center',
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          No logged symptom or exposure data in this range. Missing days stay blank — not shown as
          zero.
        </p>
      </div>
    )
  }

  const selectedPoint = chartData[selectedIndex] ?? chartData[chartData.length - 1]!

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex(index => Math.min(chartData.length - 1, index + 1))
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex(index => Math.max(0, index - 1))
      }
    },
    [chartData.length]
  )

  const ariaLabel = `Longitudinal chart comparing ${symptomDef.shortLabel} with ${comparisonDef.exposureShortLabel} across ${chartData.length} days`

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="min-h-52 w-full min-w-0"
        id={chartId}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              yAxisId="symptoms"
              domain={[0, symptomDef.maxValue]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <YAxis
              yAxisId="exposure"
              orientation="right"
              domain={[0, comparisonDef.exposureMax]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]?.payload) return null
                const datum = payload[0].payload as ChartDatum
                return (
                  <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-sm">
                    <p className="font-semibold text-foreground">{datum.dayLabel}</p>
                    <p className="mt-1 text-muted-foreground">
                      {symptomDef.shortLabel}: {formatSymptomValue(datum.symptomValue, symptomGroup)}
                    </p>
                    <p className="text-muted-foreground">
                      {comparisonDef.exposureShortLabel}:{' '}
                      {formatExposureCellValue(datum.exposureValue, comparisonView)}
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              verticalAlign="top"
              height={28}
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              yAxisId="symptoms"
              type="monotone"
              dataKey="symptomValue"
              name={symptomDef.shortLabel}
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            <Line
              yAxisId="exposure"
              type="monotone"
              dataKey="exposureValue"
              name={comparisonDef.exposureShortLabel}
              stroke="var(--foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={{ r: 2, strokeWidth: 1 }}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-foreground" id={`${chartId}-nav-label`}>
          Inspect daily values (keyboard: arrow keys)
        </p>
        <div
          role="listbox"
          aria-labelledby={`${chartId}-nav-label`}
          aria-activedescendant={`${chartId}-point-${selectedIndex}`}
          className="flex gap-1 overflow-x-auto pb-1"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {chartData.map((point, index) => {
            const hasData = point.symptomValue !== null || point.exposureValue !== null
            const isSelected = index === selectedIndex
            return (
              <button
                key={point.date}
                type="button"
                role="option"
                id={`${chartId}-point-${index}`}
                aria-selected={isSelected}
                aria-label={`${point.dayLabel}: ${formatSymptomValue(point.symptomValue, symptomGroup)}, ${comparisonDef.exposureShortLabel} ${formatExposureCellValue(point.exposureValue, comparisonView)}`}
                disabled={!hasData}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  'shrink-0 rounded-md border px-2 py-1.5 text-[10px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary bg-primary/10 text-foreground'
                    : hasData
                      ? 'border-border bg-card text-muted-foreground hover:bg-accent'
                      : 'cursor-not-allowed border-dashed border-border/60 bg-muted/20 text-muted-foreground/60'
                )}
              >
                <span className="block font-medium">{point.dayLabel}</span>
                {hasData ? (
                  <span className="mt-0.5 block font-mono">
                    {point.symptomValue ?? '—'}/{point.exposureValue ?? '—'}
                  </span>
                ) : (
                  <span className="mt-0.5 block">gap</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <PointInspector
        point={selectedPoint}
        symptomGroup={symptomGroup}
        comparisonView={comparisonView}
        events={events}
      />
    </div>
  )
}
