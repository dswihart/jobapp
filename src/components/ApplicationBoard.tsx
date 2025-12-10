'use client'

import { useState } from 'react'
import { PencilIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

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
  resume?: { id: string; name: string; fileUrl: string; fileName: string } | null
  coverLetter?: { id: string; name: string; fileUrl: string; fileName: string } | null
}

interface Contact {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  notes?: string
}

interface ApplicationBoardProps {
  applications: Application[]
  onEdit: (application: Application) => void
  onDelete: (id: string) => void
  onStatusUpdate: (id: string, status: Application['status']) => void
}

const columns = [
  { id: 'DRAFT', title: 'Draft', color: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800', badge: 'bg-gray-200 text-gray-700' },
  { id: 'PENDING', title: 'Pending', color: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800', badge: 'bg-purple-200 text-purple-700' },
  { id: 'APPLIED', title: 'Applied', color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800', badge: 'bg-blue-200 text-blue-700' },
  { id: 'INTERVIEWING', title: 'Interviewing', color: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800', badge: 'bg-yellow-200 text-yellow-700' },
  { id: 'REJECTED', title: 'Rejected', color: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800', badge: 'bg-red-200 text-red-700' },
  { id: 'ARCHIVED', title: 'Archived', color: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800', badge: 'bg-gray-300 text-gray-600' }
] as const

export default function ApplicationBoard({ applications, onEdit, onDelete, onStatusUpdate }: ApplicationBoardProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  // Detect touch device on first interaction
  const handleTouchStart = () => {
    if (!isTouchDevice) setIsTouchDevice(true)
  }

  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
    if (isTouchDevice) {
      e.preventDefault()
      return
    }
    setDraggedItem(applicationId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: Application['status']) => {
    e.preventDefault()
    if (draggedItem) {
      onStatusUpdate(draggedItem, newStatus)
      setDraggedItem(null)
    }
  }

  const handleStatusChange = (applicationId: string, newStatus: Application['status']) => {
    onStatusUpdate(applicationId, newStatus)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getApplicationsByStatus = (status: Application['status']) => {
    return applications.filter(app => app.status === status)
  }

  const getColumnInfo = (status: string) => {
    return columns.find(c => c.id === status) || columns[0]
  }

  return (
    <div className="p-6" onTouchStart={handleTouchStart}>
      {/* Mobile hint */}
      <div className="sm:hidden mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Tip: Use the status dropdown on each card to move applications between columns
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnApplications = getApplicationsByStatus(column.id as Application['status'])

          return (
            <div
              key={column.id}
              className={`rounded-lg border-2 border-dashed ${column.color} min-h-[400px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id as Application['status'])}
              role="region"
              aria-label={`${column.title} applications column with ${columnApplications.length} items`}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {column.title}
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({columnApplications.length})</span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {columnApplications.map((application) => (
                  <div
                    key={application.id}
                    draggable={!isTouchDevice}
                    onDragStart={(e) => handleDragStart(e, application.id)}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${!isTouchDevice ? 'cursor-move' : ''}`}
                    role="article"
                    aria-label={`${application.company} - ${application.role}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{application.company}</h4>
                        <p className="text-gray-600 dark:text-gray-400 text-xs">{application.role}</p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => onEdit(application)}
                          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"
                          aria-label={`Edit ${application.company} application`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(application.id)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1"
                          aria-label={`Delete ${application.company} application`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile-friendly status selector */}
                    <div className="mb-3">
                      <div className="relative">
                        <select
                          value={application.status}
                          onChange={(e) => handleStatusChange(application.id, e.target.value as Application['status'])}
                          className={`w-full text-xs font-medium rounded-md py-1.5 pl-2 pr-7 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${getColumnInfo(application.status).badge}`}
                          aria-label={`Change status for ${application.company}`}
                        >
                          {columns.map((col) => (
                            <option key={col.id} value={col.id}>
                              {col.title}
                            </option>
                          ))}
                        </select>
                        <ChevronDownIcon className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-current pointer-events-none" />
                      </div>
                    </div>

                    {application.appliedDate && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Applied: {formatDate(application.appliedDate)}
                      </div>
                    )}

                    {application.contacts.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {application.contacts.length} contact{application.contacts.length !== 1 ? 's' : ''}
                      </div>
                    )}

                    {application.resume && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span aria-hidden="true">📄</span> Resume: <a href={application.resume.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{application.resume.name}</a>
                      </div>
                    )}
                    {application.coverLetter && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span aria-hidden="true">📧</span> Cover Letter: <a href={application.coverLetter.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{application.coverLetter.name}</a>
                      </div>
                    )}

                    {application.notes && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2 mt-2">
                        {application.notes}
                      </div>
                    )}

                    {application.jobUrl && (
                      <div className="mt-2">
                        <a
                          href={application.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          View Job →
                        </a>
                      </div>
                    )}
                  </div>
                ))}

                {columnApplications.length === 0 && (
                  <div className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
                    No applications
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
