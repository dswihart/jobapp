'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface ChartData {
  date: string
  added: number
  applied: number
  formattedDate: string
}

interface ApplicationsByDateChartProps {
  showTitle?: boolean
  height?: number
  userId?: string
}

export default function ApplicationsByDateChart({ showTitle = true, height = 300, userId }: ApplicationsByDateChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [total, setTotal] = useState(0)
  const [totalApplied, setTotalApplied] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/stats/applications-by-date')
      const result = await response.json()

      if (result.success) {
        setData(result.last30Days)
        setTotal(result.total)
        setTotalApplied(result.totalApplied || 0)
      }
    } catch (error) {
      console.error('Failed to fetch application statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg" style={{ height: height + 60 }}>
        <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          Loading chart...
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6" style={{ height: height + 60 }}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Applications Over Time
          </h3>
        )}
        <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
          No application data yet. Start adding applications!
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {showTitle && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Applications Over Time
          </h3>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last 30 days
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Added: {total}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Applied: {totalApplied}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="formattedDate"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#f9fafb'
            }}
            labelStyle={{ color: '#f9fafb' }}
            formatter={(value: number, name: string) => {
              const label = name === 'added' ? 'Jobs Added' : 'Jobs Applied'
              return [value, label]
            }}
          />
          <Area
            type="monotone"
            dataKey="added"
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorAdded)"
            strokeWidth={2}
            name="added"
          />
          <Area
            type="monotone"
            dataKey="applied"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorApplied)"
            strokeWidth={2}
            name="applied"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
