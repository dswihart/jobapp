'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon, UserPlusIcon, DocumentTextIcon, ChevronUpIcon, ChevronDownIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useToast } from './ToastProvider'
import ContactModal from './ContactModal'

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

interface ApplicationListProps {
  applications: Application[]
  onEdit: (application: Application) => void
  onDelete: (id: string) => void
  onStatusUpdate: (id: string, status: Application['status']) => void
  onRefresh: () => void
  onGenerateCoverLetter?: (application: Application) => void
  userId: string
}

type SortField = 'company' | 'role' | 'status' | 'appliedDate' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const statusColors = {
  DRAFT: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
  APPLIED: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  INTERVIEWING: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  REJECTED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  ARCHIVED: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
}

const statusLabels = {
  DRAFT: 'Draft',
  APPLIED: 'Applied',
  INTERVIEWING: 'Interviewing',
  REJECTED: 'Rejected'
}

export default function ApplicationList({ applications, onEdit, onDelete, onStatusUpdate, onRefresh, userId, onGenerateCoverLetter }: ApplicationListProps) {
  const toast = useToast()
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'ALL' | Application['status']>('ALL')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [showArchived2025, setShowArchived2025] = useState(false)

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
        toast.success('Contact added')
        onRefresh() // Refresh applications to show new contact
      } else {
        console.error('Failed to add contact:', data.error)
        toast.error('Failed to add contact: ' + data.error)
      }
    } catch (error) {
      console.error('Error adding contact:', error)
      toast.error('Error adding contact')
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4"></div>
    }
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4" />
    ) : (
      <ChevronDownIcon className="w-4 h-4" />
    )
  }

  // Separate 2025 archived applications
  const archived2025 = applications.filter(app =>
    app.status === 'ARCHIVED' && new Date(app.createdAt).getFullYear() <= 2025
  )
  const currentApplications = applications.filter(app =>
    !(app.status === 'ARCHIVED' && new Date(app.createdAt).getFullYear() <= 2025)
  )

  const filteredApplications = currentApplications
    .filter(app => statusFilter === 'ALL' || app.status === statusFilter)
    .filter(app => {
      if (!searchTerm) return true
      const searchLower = searchTerm.toLowerCase()
      return (
        app.company.toLowerCase().includes(searchLower) ||
        app.role.toLowerCase().includes(searchLower) ||
        (app.notes && app.notes.toLowerCase().includes(searchLower))
      )
    })

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    if (sortField === 'appliedDate') {
      aValue = aValue || ''
      bValue = bValue || ''
    }

    if (sortField === 'appliedDate' || sortField === 'createdAt') {
      aValue = aValue ? new Date(aValue).getTime() : 0
      bValue = bValue ? new Date(bValue).getTime() : 0
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

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
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <label htmlFor="statusFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | Application['status'])}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All ({currentApplications.length})</option>
            <option value="DRAFT">Draft ({applications.filter(a => a.status === 'DRAFT').length})</option>
            <option value="PENDING">Pending ({applications.filter(a => a.status === 'PENDING').length})</option>
            <option value="APPLIED">Applied ({applications.filter(a => a.status === 'APPLIED').length})</option>
            <option value="INTERVIEWING">Interviewing ({applications.filter(a => a.status === 'INTERVIEWING').length})</option>
            <option value="REJECTED">Rejected ({applications.filter(a => a.status === 'REJECTED').length})</option>
            <option value="ARCHIVED">Archived ({currentApplications.filter(a => a.status === 'ARCHIVED').length})</option>
          </select>
          {statusFilter !== 'ALL' && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {sortedApplications.length} of {currentApplications.length} applications
            </span>
          )}
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="hidden md:grid md:grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div
              className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('company')}
            >
              Company
              <SortIcon field="company" />
            </div>
            <div
              className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('role')}
            >
              Role
              <SortIcon field="role" />
            </div>
            <div
              className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('status')}
            >
              Status
              <SortIcon field="status" />
            </div>
            <div
              className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('appliedDate')}
            >
              Applied Date
              <SortIcon field="appliedDate" />
            </div>
            <div
              className="flex items-center gap-1 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('createdAt')}
            >
              Created
              <SortIcon field="createdAt" />
            </div>
            <div>Resume</div>
            <div>Cover Letter</div>
            <div>Contacts</div>
            <div>Actions</div>
            <div></div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedApplications.map((application) => (
            <div key={application.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="md:hidden space-y-3 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/applications/${application.id}`} className="font-bold text-gray-900 dark:text-white text-lg hover:text-blue-600 dark:hover:text-blue-400 hover:underline">{application.company}</Link>
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
                  <div>👥 Contacts: {(application.contacts?.length || 0)}</div>
                  {application.resume && (
                    <div className="flex items-center gap-1">📄 Resume: <a href={`/api/resumes/${application.resume.id}/download`} download className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1" title={`Download ${application.resume.fileName}`}><ArrowDownTrayIcon className="h-3.5 w-3.5" />{application.resume.name}</a></div>
                  )}
                  {application.coverLetter && (
                    <div>📧 Cover Letter: <a href={application.coverLetter.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">{application.coverLetter.name}</a></div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => onEdit(application)} className="flex-1 min-w-[100px] px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
                    Edit
                  </button>
                  <button onClick={() => handleAddContact(application.id)} className="px-3 py-2 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg text-sm bg-white dark:bg-gray-800">
                    Contact
                  </button>
                  {onGenerateCoverLetter && (
                    <button onClick={() => onGenerateCoverLetter(application)} className="flex-1 min-w-[120px] px-3 py-2 bg-purple-600 text-white rounded-lg text-sm">
                      Cover Letter
                    </button>
                  )}
                  <button onClick={() => onDelete(application.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm">
                    Delete
                  </button>
                </div>
              </div>

              <div className="hidden md:grid md:grid-cols-12 gap-4 items-center">
                <div className="col-span-2 min-w-0 break-words font-medium text-gray-900 dark:text-white"><Link href={`/applications/${application.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">{application.company}</Link></div>
                <div className="col-span-2 min-w-0 break-words text-gray-900 dark:text-gray-100">{application.role}</div>
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
                <div className="text-sm">
                  {application.resume ? (
                    <a href={`/api/resumes/${application.resume.id}/download`} download className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 max-w-xs" title={`Download ${application.resume.fileName}`}>
                      <ArrowDownTrayIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{application.resume.name}</span>
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </div>
                <div className="text-sm">
                  {application.coverLetter ? (
                    <a href={application.coverLetter.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-xs">
                      {application.coverLetter.name}
                    </a>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {(application.contacts?.length || 0)}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onEdit(application)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    title="Edit Application"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  {onGenerateCoverLetter && (
                    <button
                      onClick={() => onGenerateCoverLetter(application)}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors"
                      title="Generate Cover Letter"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                    </button>
                  )}
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
                    className="px-2.5 py-1 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors text-xs flex items-center gap-1"
                  >
                    <UserPlusIcon className="h-3 w-3" />
                    Contact
                  </button>
                </div>
              </div>
              {application.notes && (
                <details className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <summary className="cursor-pointer select-none font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                    Notes
                  </summary>
                  <p className="mt-1 whitespace-pre-wrap">{application.notes}</p>
                </details>
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
              {(application.contacts && (application.contacts?.length || 0) > 0) && (
                <div className="mt-3 pl-4 border-l-2 border-green-200">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">CONTACTS:</div>
                  <div className="space-y-2">
                    {application.contacts?.map((contact) => (
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

      
      {/* Archived 2025 Section */}
      {archived2025.length > 0 && (
        <div className="mt-8 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowArchived2025(!showArchived2025)}
            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-150 dark:hover:bg-gray-750 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Archived ({archived2025.length})
            </span>
            {showArchived2025 ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {showArchived2025 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {archived2025.map(app => (
                    <tr key={app.id} className="opacity-60 hover:opacity-80 transition-opacity">
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{app.company}</td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {app.jobUrl ? (
                          <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">{app.role}</a>
                        ) : app.role}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(app.createdAt)}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">Archived</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSave={handleSaveContact}
        applicationId={selectedApplicationId || ''}
      />
    </>
  )
}
