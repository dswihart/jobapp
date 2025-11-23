'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

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
  resumeId?: string
  coverLetterId?: string
  resume?: Resume
  coverLetter?: CoverLetter
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

interface Resume {
  id: string
  name: string
  fileName: string
  isPrimary: boolean
}

interface CoverLetter {
  id: string
  name: string
}

interface ApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Partial<Application>) => void
  application?: Application | null
}

const statusOptions = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'INTERVIEWING', label: 'Interviewing' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ARCHIVED', label: 'Archived' }
]

export default function ApplicationModal({ isOpen, onClose, onSubmit, application }: ApplicationModalProps) {
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    status: 'DRAFT' as Application['status'],
    notes: '',
    jobUrl: '',
    appliedDate: '',
    createdAt: '',
    resumeId: '',
    coverLetterId: ''
  })

  const [resumes, setResumes] = useState<Resume[]>([])
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [loadingResumes, setLoadingResumes] = useState(false)
  const [loadingCoverLetters, setLoadingCoverLetters] = useState(false)

  // Fetch resumes and cover letters when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchResumes()
      fetchCoverLetters()
    }
  }, [isOpen])

  const fetchResumes = async () => {
    setLoadingResumes(true)
    try {
      const response = await fetch('/api/resumes')
      if (response.ok) {
        const data = await response.json()
        setResumes(Array.isArray(data.resumes) ? data.resumes : (Array.isArray(data) ? data : []))
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error)
    } finally {
      setLoadingResumes(false)
    }
  }

  const fetchCoverLetters = async () => {
    setLoadingCoverLetters(true)
    try {
      const response = await fetch('/api/cover-letter')
      if (response.ok) {
        const data = await response.json()
        setCoverLetters(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch cover letters:', error)
    } finally {
      setLoadingCoverLetters(false)
    }
  }

  useEffect(() => {
    if (application) {
      setFormData({
        company: application.company,
        role: application.role,
        status: application.status,
        notes: application.notes || '',
        jobUrl: application.jobUrl || '',
        appliedDate: application.appliedDate ? application.appliedDate.split('T')[0] : '',
        createdAt: application.createdAt ? application.createdAt.split('T')[0] : '',
        resumeId: application.resumeId || '',
        coverLetterId: application.coverLetterId || ''
      })
    } else {
      const today = new Date().toISOString().split('T')[0]
      setFormData({
        company: '',
        role: '',
        status: 'DRAFT',
        notes: '',
        jobUrl: '',
        appliedDate: '',
        createdAt: today,
        resumeId: '',
        coverLetterId: ''
      })
    }
  }, [application, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md sm:w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col animate-slide-up sm:animate-none">

          <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl sm:rounded-t-lg z-10">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {application ? 'Edit Application' : 'Add Application'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -mr-1"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="Enter job title"
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="resumeId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Resume
                </label>
                <select
                  id="resumeId"
                  name="resumeId"
                  value={formData.resumeId}
                  onChange={handleChange}
                  disabled={loadingResumes}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50"
                >
                  <option value="">-- No Resume --</option>
                  {resumes.map(resume => (
                    <option key={resume.id} value={resume.id}>
                      {resume.name} {resume.isPrimary ? '(Primary)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Attach a resume to this application
                </p>
              </div>

              <div>
                <label htmlFor="coverLetterId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Cover Letter
                </label>
                <select
                  id="coverLetterId"
                  name="coverLetterId"
                  value={formData.coverLetterId}
                  onChange={handleChange}
                  disabled={loadingCoverLetters}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-50"
                >
                  <option value="">-- No Cover Letter --</option>
                  {coverLetters.map(letter => (
                    <option key={letter.id} value={letter.id}>
                      {letter.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Attach a cover letter to this application
                </p>
              </div>

              <div>
                <label htmlFor="createdAt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Created Date
                </label>
                <input
                  type="date"
                  id="createdAt"
                  name="createdAt"
                  value={formData.createdAt}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  The date this application was created/added to your tracker
                </p>
              </div>

              <div>
                <label htmlFor="appliedDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Applied Date
                </label>
                <input
                  type="date"
                  id="appliedDate"
                  name="appliedDate"
                  value={formData.appliedDate}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>

              <div>
                <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Job URL
                </label>
                <input
                  type="url"
                  id="jobUrl"
                  name="jobUrl"
                  value={formData.jobUrl}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  placeholder="Add any additional notes..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-2xl sm:rounded-b-lg">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2 text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2 text-sm sm:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
              >
                {application ? 'Update' : 'Add'} Application
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
