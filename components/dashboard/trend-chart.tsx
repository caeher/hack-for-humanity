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
      aria-label="Recovery score increased from 58 to 78 over seven days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={recoveryTrend} margin={{ top: 15, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="score" x1="0" y1="0" x2="0" y2="1">
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
            domain={[30, 100]}
            tick={{ fontSize: 11, fill: '#726957' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e3dfd5',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#996515"
            strokeWidth={2}
            fill="url(#score)"
          />
          <Line
            type="monotone"
            dataKey={clinical ? 'mobility' : 'score'}
            stroke="#261b07"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
