'use client'

import { useState } from 'react'
import { PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import ContactModal from './ContactModal'

interface Application {
  id: string
  company: string
  role: string
  status: 'DRAFT' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED'
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

interface ApplicationListProps {
  applications: Application[]
  onEdit: (application: Application) => void
  onDelete: (id: string) => void
  onStatusUpdate: (id: string, status: Application['status']) => void
  onRefresh: () => void
  userId: string
}

const statusColors = {
  DRAFT: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
  APPLIED: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  INTERVIEWING: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  REJECTED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
}

const statusLabels = {
  DRAFT: 'Draft',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  REJECTED: 'Rejected'
}

export default function ApplicationList({ applications, onEdit, onDelete, onStatusUpdate, onRefresh, userId }: ApplicationListProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleAddContact = (applicationId: string) => {
    setSelectedApplicationId(applicationId)
    setContactModalOpen(true)
  }

  const handleSaveContact = async (contactData: Omit<Contact, 'id'>) => {
    if (!selectedApplicationId) return

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...contactData,
          userId,
          applicationId: selectedApplicationId
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('Contact added successfully')
        onRefresh() // Refresh applications to show new contact
      } else {
        console.error('Failed to add contact:', data.error)
        alert('Failed to add contact: ' + data.error)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      alert('Error adding contact')
    }
  }

  if (applications.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400 text-lg mb-4">No applications yet</div>
        <p className="text-gray-400 dark:text-gray-500">Click &quot;Add Application&quot; to get started</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="hidden md:grid md:grid-cols-8 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div>Company</div>
            <div>Role</div>
            <div>Status</div>
            <div>Applied Date</div>
            <div>Created</div>
            <div>Contacts</div>
            <div>Actions</div>
            <div></div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {applications.map((application) => (
            <div key={application.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">{application.company}</div>
                    <div className="text-gray-700 dark:text-gray-300">{application.role}</div>
                  </div>
                  <select
                    value={application.status}
                    onChange={(e) => onStatusUpdate(application.id, e.target.value as Application['status'])}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[application.status]} border-0`}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>📅 Applied: {application.appliedDate ? formatDate(application.appliedDate) : 'Not set'}</div>
                  <div>🗓️ Created: {formatDate(application.createdAt)}</div>
                  <div>👥 Contacts: {application.contacts.length}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onEdit(application)} className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
                    Edit
                  </button>
                  <button onClick={() => handleAddContact(application.id)} className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 text-white rounded-lg text-sm">
                    Add Contact
                  </button>
                  <button onClick={() => onDelete(application.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm">
                    Delete
                  </button>
                </div>
              </div>

              <div className="hidden md:grid md:grid-cols-8 gap-4 items-center">
                <div className="font-medium text-gray-900 dark:text-white">{application.company}</div>
                <div className="text-gray-900 dark:text-gray-100">{application.role}</div>
                <div>
                  <select
                    value={application.status}
                    onChange={(e) => onStatusUpdate(application.id, e.target.value as Application['status'])}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[application.status]} border-0 focus:ring-2 focus:ring-blue-500`}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {application.appliedDate ? formatDate(application.appliedDate) : 'Not set'}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  {formatDate(application.createdAt)}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {application.contacts.length} contact{application.contacts.length !== 1 ? 's' : ''}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(application)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    title="Edit Application"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(application.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                    title="Delete Application"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => handleAddContact(application.id)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs flex items-center gap-1"
                  >
                    <UserPlusIcon className="h-3 w-3" />
                    Add Contact
                  </button>
                </div>
              </div>
              {application.notes && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <strong>Notes:</strong> {application.notes}
                </div>
              )}
              {application.jobUrl && (
                <div className="mt-1">
                  <a
                    href={application.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                  >
                    View Job Posting →
                  </a>
                </div>
              )}
              {application.contacts.length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-green-200">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">CONTACTS:</div>
                  <div className="space-y-2">
                    {application.contacts.map((contact) => (
                      <div key={contact.id} className="text-sm bg-gray-50 dark:bg-gray-800 rounded p-2">
                        <div className="font-medium text-gray-900 dark:text-white">{contact.name}</div>
                        {contact.title && <div className="text-gray-600 dark:text-gray-400 text-xs">{contact.title}</div>}
                        {contact.email && <div className="text-gray-600 dark:text-gray-400 text-xs">{contact.email}</div>}
                        {contact.phone && <div className="text-gray-600 dark:text-gray-400 text-xs">{contact.phone}</div>}
                        {contact.notes && <div className="text-gray-500 dark:text-gray-500 text-xs mt-1">{contact.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSave={handleSaveContact}
        applicationId={selectedApplicationId || ''}
      />
    </>
  )
}
