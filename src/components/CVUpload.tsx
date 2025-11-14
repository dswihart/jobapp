'use client'
import { useState } from 'react'
import { DocumentArrowUpIcon, CheckCircleIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline'

interface CVUploadProps {
  userId: string
  onProfileExtracted: () => void
}

export default function CVUpload({ userId, onProfileExtracted }: CVUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type - check both MIME type and extension
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
      const validExtensions = ['.pdf', '.doc', '.docx', '.txt']
      const fileName = selectedFile.name.toLowerCase()
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
      
      // Accept file if either MIME type matches OR extension is valid (some browsers report incorrect MIME types)
      if (!validTypes.includes(selectedFile.type) && !hasValidExtension) {
        setError('Please upload a PDF, DOC, DOCX, or TXT file')
        return
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleUploadAndExtract = async () => {
    if (!file) return

    setUploading(true)
    setStatus('Uploading CV...')
    setError('')

    try {
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)

      const uploadResponse = await fetch('/api/profile/upload-cv', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload CV')
      }

      const { fileUrl, fileText } = await uploadResponse.json()
      setStatus('CV uploaded! Extracting profile with AI...')
      setUploading(false)
      setExtracting(true)

      // Extract profile using LLM
      const extractResponse = await fetch('/api/profile/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, resumeText: fileText, resumeUrl: fileUrl })
      })

      if (!extractResponse.ok) {
        throw new Error('Failed to extract profile')
      }

      await extractResponse.json()
      setStatus('Profile extracted successfully!')
      setExtracting(false)

      // Show success for 2 seconds then close
      setTimeout(() => {
        setFile(null)
        setStatus('')
        onProfileExtracted()
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setUploading(false)
      setExtracting(false)
      setStatus('')
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-dashed border-blue-300 dark:border-blue-700">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <SparklesIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            AI-Powered Profile Enhancement
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
            Upload your CV/Resume and our AI will automatically extract your skills, experience, education, and preferences to create a comprehensive profile for better job matching.
          </p>

          {/* File Input */}
          {!file && !uploading && !extracting && (
            <div>
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <DocumentArrowUpIcon className="h-5 w-5" />
                <span>Select CV/Resume</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
              </p>
            </div>
          )}

          {/* File Selected */}
          {file && !uploading && !extracting && (
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>

              <button
                onClick={handleUploadAndExtract}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>Upload & Extract Profile</span>
              </button>
            </div>
          )}

          {/* Uploading/Extracting Status */}
          {(uploading || extracting) && (
            <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-3">
                <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {uploading && 'Please wait...'}
                    {extracting && 'This may take 10-20 seconds...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Status */}
          {status && !uploading && !extracting && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                <p className="font-medium text-green-800 dark:text-green-300">{status}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-700">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* What Gets Extracted */}
          <div className="mt-4 bg-blue-100/50 dark:bg-blue-900/10 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
              AI will extract:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Skills (technical & soft skills)</li>
              <li>• Years of experience & seniority level</li>
              <li>• Work history & achievements</li>
              <li>• Education & certifications</li>
              <li>• Job titles & preferences</li>
              <li>• Location & salary expectations (if mentioned)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
