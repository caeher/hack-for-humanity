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

export interface TrendChartProps {
  clinical?: boolean
}

export function TrendChart({ clinical = false }: TrendChartProps) {
  return (
    <div
      className="h-64 w-full"
      aria-label="Patient-reported symptom total decreased from 27 to 15 over seven days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={recoveryTrend} margin={{ top: 15, right: 8, left: -24, bottom: 0 }}>
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
