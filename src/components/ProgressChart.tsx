'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface Application {
  id: string
  company: string
  role: string
  status: 'DRAFT' | 'PENDING' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'ARCHIVED'
  notes?: string
  jobUrl?: string
  appliedDate?: string
  createdAt: string
  updatedAt: string
  contacts: Contact[]
}

interface Contact {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  notes?: string
}

interface ProgressChartProps {
  applications: Application[]
}

const statusLabels = {
  DRAFT: 'Draft',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  REJECTED: 'Rejected'
}

const COLORS = ['#6B7280', '#A855F7', '#3B82F6', '#F59E0B', '#EF4444']

export default function ProgressChart({ applications }: ProgressChartProps) {
  // Count applications by status
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Prepare data for charts
  const chartData = Object.entries(statusLabels).map(([status, label]) => ({
    status: label,
    count: statusCounts[status] || 0,
    value: statusCounts[status] || 0
  }))

  const pieData = chartData.filter(item => item.count > 0)

  const totalApplications = applications.length

  if (totalApplications === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg mb-2">No applications yet</div>
        <p className="text-gray-400">Start adding applications to see your progress</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-600">{statusCounts.DRAFT || 0}</div>
          <div className="text-sm text-gray-600">Draft</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{statusCounts.PENDING || 0}</div>
          <div className="text-sm text-purple-600">Pending</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{statusCounts.APPLIED || 0}</div>
          <div className="text-sm text-blue-600">Applied</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">{statusCounts.INTERVIEWING || 0}</div>
          <div className="text-sm text-yellow-600">Interviewing</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">{statusCounts.REJECTED || 0}</div>
          <div className="text-sm text-red-600">Rejected</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Applications by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progress Insights */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Insights</h3>
        <div className="space-y-2 text-sm text-gray-600">
          {statusCounts.INTERVIEWING > 0 && (
            <p>• You have {statusCounts.INTERVIEWING} application{statusCounts.INTERVIEWING !== 1 ? 's' : ''} in the interview stage</p>
          )}
          {statusCounts.OFFER > 0 && (
            <p>• Congratulations! You have {statusCounts.OFFER} offer{statusCounts.OFFER !== 1 ? 's' : ''}</p>
          )}
          {statusCounts.APPLIED > 0 && statusCounts.INTERVIEWING === 0 && (
            <p>• Consider following up on your {statusCounts.APPLIED} application{statusCounts.APPLIED !== 1 ? 's' : ''}</p>
          )}
          {totalApplications > 0 && (
            <p>• You&apos;ve applied to {totalApplications} position{totalApplications !== 1 ? 's' : ''} total</p>
          )}
        </div>
      </div>
    </div>
  )
}
