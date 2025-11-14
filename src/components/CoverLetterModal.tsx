'use client'

import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'

interface Application {
  id: string
  company: string
  role: string
  jobUrl?: string
  notes?: string
}

interface CoverLetterModalProps {
  isOpen: boolean
  onClose: () => void
  application: Application | null
  onSuccess?: () => void
}

export default function CoverLetterModal({ isOpen, onClose, application, onSuccess }: CoverLetterModalProps) {
  const [coverLetter, setCoverLetter] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !application) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          company: application.company,
          role: application.role,
          jobUrl: application.jobUrl,
          notes: application.notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate cover letter')
      }

      if (data.coverLetter) {
        setCoverLetter(data.coverLetter)
      }
    } catch (err) {
      console.error('Error generating cover letter:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate cover letter')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!coverLetter) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/cover-letter/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: coverLetter,
          applicationId: application.id,
          company: application.company,
          role: application.role
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save cover letter')
      }

      alert('Cover letter saved successfully and attached to application!')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving cover letter:', err)
      setError(err instanceof Error ? err.message : 'Failed to save cover letter')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!coverLetter) return

    setIsDownloading(true)
    try {
      const filename = `cover_letter_${application.company}_${application.role.replace(/[^a-z0-9]/gi, "_")}.docx`

      const lines = coverLetter.split('\n')
      const paragraphs = lines.filter(line => line.trim()).map(line =>
        new Paragraph({
          children: [new TextRun(line.trim())],
          spacing: { before: 120, after: 120 }
        })
      )

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, filename)
    } catch (error) {
      console.error('Error downloading cover letter:', error)
      alert('Failed to download cover letter')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col">
          <div className="sticky top-0 bg-white dark:bg-gray-800 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl sm:rounded-t-lg z-10">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              Cover Letter for {application.role} at {application.company}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 -mr-1"
              aria-label="Close"
            >
              <XMarkIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {!coverLetter && (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Generate a customized cover letter for this application using AI.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
                </button>
              </div>
            )}

            {coverLetter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cover Letter Content (Editable)
                </label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono resize-none"
                />
              </div>
            )}
          </div>

          {coverLetter && (
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full sm:w-auto px-5 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-300 rounded-lg transition-colors"
              >
                {isDownloading ? 'Downloading...' : 'Download DOCX'}
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full sm:w-auto px-5 py-2.5 text-base font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:bg-blue-200 rounded-lg transition-colors"
              >
                {isGenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-2.5 text-base font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save & Attach to Application'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
