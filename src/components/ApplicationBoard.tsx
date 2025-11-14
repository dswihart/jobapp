'use client'

import { useState } from 'react'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

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
  { id: 'DRAFT', title: 'Draft', color: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800' },
  { id: 'PENDING', title: 'Pending', color: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800' },
  { id: 'APPLIED', title: 'Applied', color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' },
  { id: 'INTERVIEWING', title: 'Interviewing', color: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' },
  { id: 'REJECTED', title: 'Rejected', color: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' },
  { id: 'ARCHIVED', title: 'Archived', color: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800' }
] as const

export default function ApplicationBoard({ applications, onEdit, onDelete, onStatusUpdate }: ApplicationBoardProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getApplicationsByStatus = (status: Application['status']) => {
    return applications.filter(app => app.status === status)
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnApplications = getApplicationsByStatus(column.id as Application['status'])
          
          return (
            <div
              key={column.id}
              className={`rounded-lg border-2 border-dashed ${column.color} min-h-[400px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id as Application['status'])}
            >
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">
                  {column.title}
                  <span className="ml-2 text-sm text-gray-500">({columnApplications.length})</span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {columnApplications.map((application) => (
                  <div
                    key={application.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, application.id)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-move"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{application.company}</h4>
                        <p className="text-gray-600 text-xs">{application.role}</p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <button
                          onClick={() => onEdit(application)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDelete(application.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    {application.appliedDate && (
                      <div className="text-xs text-gray-500 mb-2">
                        Applied: {formatDate(application.appliedDate)}
                      </div>
                    )}
                    
                    {application.contacts.length > 0 && (
                      <div className="text-xs text-gray-500 mb-2">
                        {application.contacts.length} contact{application.contacts.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    {application.resume && (
                      <div className="text-xs text-gray-500 mb-2">
                        📄 Resume: <a href={application.resume.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{application.resume.name}</a>
                      </div>
                    )}
                    {application.coverLetter && (
                      <div className="text-xs text-gray-600">
                        📧 Cover Letter: <a href={application.coverLetter.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{application.coverLetter.name}</a>
                      </div>
                    )}
                    
                    {application.notes && (
                      <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                        {application.notes}
                      </div>
                    )}
                    
                    {application.jobUrl && (
                      <div className="mt-2">
                        <a
                          href={application.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View Job →
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                
                {columnApplications.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
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
