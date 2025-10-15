'use client'
import { useState } from 'react'
import { SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface FitScore {
  overall: number
  skillMatch: number
  experienceMatch: number
  keywords: string[]
  matchedSkills: string[]
  missingSkills: string[]
  recommendations: string[]
}

export default function JobFitAnalyzer() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobRequirements, setJobRequirements] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [fitScore, setFitScore] = useState<FitScore | null>(null)
  const [error, setError] = useState('')

  const analyzeJob = async () => {
    if (!jobTitle || !jobDescription) {
      setError('Please fill in job title and description')
      return
    }

    setLoading(true)
    setError('')

    try {
      const userResponse = await fetch('/api/user')
      const userData = await userResponse.json()

      if (!userData.user) {
        setError('Please set up your profile first')
        setLoading(false)
        return
      }

      const userProfile = {
        skills: userData.user.skills || [],
        experience: userData.user.yearsOfExperience ? userData.user.yearsOfExperience + ' years' : '0 years',
        education: userData.user.education || ''
      }

      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProfile,
          jobDescription: {
            title: jobTitle,
            description: jobDescription,
            requirements: jobRequirements,
            company: companyName
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setFitScore(data.fitScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job fit')
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 75) return 'bg-green-100 dark:bg-green-900/20'
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20'
    return 'bg-red-100 dark:bg-red-900/20'
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <SparklesIcon className="h-5 w-5" />
        AI Job Fit Analyzer
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-purple-600" />
                AI Job Fit Analyzer
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setFitScore(null)
                  setError('')
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {!fitScore ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                      placeholder="e.g., Google"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Job Title *</label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Job Description *</label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                      rows={6}
                      placeholder="Paste the job description here..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Requirements</label>
                    <textarea
                      value={jobRequirements}
                      onChange={(e) => setJobRequirements(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                      rows={4}
                      placeholder="Paste job requirements here..."
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={analyzeJob}
                    disabled={loading}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? 'Analyzing...' : 'Analyze Job Fit'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={'p-6 rounded-lg ' + getScoreBackground(fitScore.overall)}>
                    <div className="text-center">
                      <div className={'text-6xl font-bold ' + getScoreColor(fitScore.overall)}>
                        {fitScore.overall}%
                      </div>
                      <div className="text-lg font-medium mt-2">Overall Fit Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg">
                      <div className={'text-3xl font-bold ' + getScoreColor(fitScore.skillMatch)}>
                        {fitScore.skillMatch}%
                      </div>
                      <div className="text-sm font-medium mt-1">Skill Match</div>
                    </div>
                    <div className="p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg">
                      <div className={'text-3xl font-bold ' + getScoreColor(fitScore.experienceMatch)}>
                        {fitScore.experienceMatch}%
                      </div>
                      <div className="text-sm font-medium mt-1">Experience Match</div>
                    </div>
                  </div>

                  {fitScore.matchedSkills.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-green-700 dark:text-green-400">
                        Matched Skills
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {fitScore.matchedSkills.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {fitScore.missingSkills.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 text-orange-700 dark:text-orange-400">
                        Skills to Develop
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {fitScore.missingSkills.map((skill, i) => (
                          <span key={i} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="space-y-2">
                      {fitScore.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-purple-600">-</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Key Topics</h3>
                    <div className="flex flex-wrap gap-2">
                      {fitScore.keywords.slice(0, 10).map((keyword, i) => (
                        <span key={i} className="px-3 py-1 bg-gray-200 dark:bg-neutral-700 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFitScore(null)
                      setJobTitle('')
                      setJobDescription('')
                      setJobRequirements('')
                      setCompanyName('')
                    }}
                    className="w-full py-2 bg-gray-200 dark:bg-neutral-700 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
                  >
                    Analyze Another Job
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
