'use client'
import { useState, useEffect } from 'react'
import { DocumentTextIcon, TrashIcon, StarIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface Resume {
  id: string
  name: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  isPrimary: boolean
  description?: string
  createdAt: string
}

export default function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrimary: false,
    file: null as File | null
  })

  useEffect(() => {
    loadResumes()
  }, [])

  const loadResumes = async () => {
    try {
      const response = await fetch('/api/resumes')
      if (response.ok) {
        const data = await response.json()
        setResumes(data.resumes || [])
      }
    } catch (error) {
      console.error('Error loading resumes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, file, name: formData.name || file.name.replace(/\.[^/.]+$/, '') })
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.file) return

    setUploading(true)
    try {
      const data = new FormData()
      data.append('file', formData.file)
      data.append('name', formData.name)
      data.append('description', formData.description)
      data.append('isPrimary', formData.isPrimary.toString())

      const response = await fetch('/api/resumes', {
        method: 'POST',
        body: data
      })

      if (response.ok) {
        await loadResumes()
        setShowUploadForm(false)
        setFormData({ name: '', description: '', isPrimary: false, file: null })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload resume')
      }
    } catch (error) {
      console.error('Error uploading resume:', error)
      alert('Failed to upload resume')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return

    try {
      const response = await fetch(`/api/resumes?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setResumes(prev => prev.filter(r => r.id !== id))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete resume')
      }
    } catch (error) {
      console.error('Error deleting resume:', error)
      alert('Failed to delete resume')
    }
  }

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch('/api/resumes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isPrimary: true })
      })

      if (response.ok) {
        await loadResumes()
      }
    } catch (error) {
      console.error('Error setting primary resume:', error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return <div className="text-center py-8">Loading resumes...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Resumes</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage multiple versions of your resume
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <CloudArrowUpIcon className="h-5 w-5" />
          Upload Resume
        </button>
      </div>

      {showUploadForm && (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Upload New Resume</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Resume File</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Accepted formats: PDF, DOC, DOCX, TXT</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Resume Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Software Engineer Resume 2024"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Tailored for senior backend positions"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                rows={2}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrimary"
                checked={formData.isPrimary}
                onChange={e => setFormData({ ...formData, isPrimary: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="isPrimary" className="ml-2 text-sm">
                Set as primary resume (used by default for applications)
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
              >
                {uploading ? 'Uploading...' : 'Upload Resume'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {resumes.map(resume => (
          <div
            key={resume.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start justify-between"
          >
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {resume.name}
                  </h3>
                  {resume.isPrimary && (
                    <span className="flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                      <StarIconSolid className="h-3 w-3" />
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {resume.fileName}
                </p>
                {resume.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {resume.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>{formatFileSize(resume.fileSize)}</span>
                  <span>{new Date(resume.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!resume.isPrimary && (
                <button
                  onClick={() => handleSetPrimary(resume.id)}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg"
                  title="Set as primary resume"
                >
                  <StarIcon className="h-5 w-5" />
                </button>
              )}
              <a
                href={resume.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
              >
                View
              </a>
              <button
                onClick={() => handleDelete(resume.id, resume.name)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                title="Delete resume"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}

        {resumes.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500">
              No resumes uploaded yet. Upload your first resume to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
