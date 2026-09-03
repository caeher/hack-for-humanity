'use client'

import React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { recoveryTrend } from '@/lib/cri-data'
import type { TrendChartDatum } from '@/lib/patientDashboard'

export interface TrendChartProps {
  clinical?: boolean
  data?: TrendChartDatum[]
  emptyMessage?: string
}

export function TrendChart({ clinical = false, data, emptyMessage }: TrendChartProps) {
  const chartData = data ?? recoveryTrend
  const isEmpty = chartData.length === 0

  if (isEmpty) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {emptyMessage ??
            'No complete check-ins in this window yet. Missing days stay blank — not shown as zero symptoms.'}
        </p>
      </div>
    )
  }

  const firstTotal = chartData[0]?.symptomBurden
  const lastTotal = chartData[chartData.length - 1]?.symptomBurden
  const ariaLabel =
    firstTotal !== undefined && lastTotal !== undefined
      ? `Patient-reported symptom total changed from ${firstTotal} to ${lastTotal} over ${chartData.length} logged days`
      : 'Patient-reported symptom total trend chart'

  return (
    <div className="relative h-64 w-full" role="region" aria-label={ariaLabel}>
      {/* Screen Reader Equivalent Data Table (WCAG 1.1.1 Non-text Content) */}
      <div className="sr-only">
        <table>
          <caption>
            Longitudinal patient-reported symptom total data ({chartData.length} logged entries).
            Range is 0 to 48.
          </caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Symptom total (0–48)</th>
              {clinical && <th scope="col">Headache (0–6)</th>}
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, index) => (
              <tr key={index}>
                <td>{item.day}</td>
                <td>{item.symptomBurden} out of 48</td>
                {clinical && <td>{item.headache ?? 'N/A'} out of 6</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 15, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="symptomBurden" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f9a600" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#f9a600" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e3dfd5" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#726957' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="symptom-total"
            domain={[0, 48]}
            tick={{ fontSize: 11, fill: '#726957' }}
            axisLine={false}
            tickLine={false}
          />
          {clinical && (
            <YAxis
              yAxisId="headache"
              orientation="right"
              domain={[0, 6]}
              hide
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e3dfd5',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            yAxisId="symptom-total"
            type="monotone"
            dataKey="symptomBurden"
            name="Symptom total"
            stroke="#996515"
            strokeWidth={2}
            fill="url(#symptomBurden)"
          />
          {clinical && (
            <Line
              yAxisId="headache"
              type="monotone"
              dataKey="headache"
              name="Headache"
              stroke="#261b07"
              strokeWidth={1.5}
              dot={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
