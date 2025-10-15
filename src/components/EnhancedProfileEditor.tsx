'use client'
import { useState, useEffect } from 'react'
import { XMarkIcon, UserCircleIcon, BriefcaseIcon, CogIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import CVUpload from './CVUpload'

interface EnhancedProfile {
  name?: string
  email?: string
  location?: string
  summary?: string
  primarySkills: string[]
  secondarySkills: string[]
  learningSkills: string[]
  yearsOfExperience?: number
  seniorityLevel?: string
  workHistory: Array<{
    company: string
    role: string
    duration: string
    achievements: string[]
  }>
  education: Array<{
    degree: string
    institution: string
    year?: string
  }>
  jobTitles: string[]
  industries: string[]
  salaryExpectation?: string
  workPreference?: string
  availability?: string
}

interface Props {
  userId: string
  onClose: () => void
}

type TabType = 'cv' | 'basic' | 'experience' | 'preferences'

export default function EnhancedProfileEditor({ userId, onClose }: Props) {
  const [profile, setProfile] = useState<EnhancedProfile>({
    primarySkills: [],
    secondarySkills: [],
    learningSkills: [],
    workHistory: [],
    education: [],
    jobTitles: [],
    industries: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('cv')
  const [newSkill, setNewSkill] = useState('')

  useEffect(() => {
    loadProfile()
    // Prevent body scroll on mobile
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [userId])

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/profile?userId=${userId}`)
      const data = await response.json()
      if (data.profile) {
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, profile })
      })
      if (response.ok) {
        alert('Profile saved successfully!')
        onClose()
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const addSkill = (category: 'primarySkills' | 'secondarySkills' | 'learningSkills') => {
    if (newSkill.trim()) {
      setProfile(prev => ({
        ...prev,
        [category]: [...prev[category], newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (category: 'primarySkills' | 'secondarySkills' | 'learningSkills', skill: string) => {
    setProfile(prev => ({
      ...prev,
      [category]: prev[category].filter(s => s !== skill)
    }))
  }

  const tabs = [
    { id: 'cv' as TabType, name: 'Upload CV', icon: DocumentArrowUpIcon },
    { id: 'basic' as TabType, name: 'Basic Info', icon: UserCircleIcon },
    { id: 'experience' as TabType, name: 'Experience', icon: BriefcaseIcon },
    { id: 'preferences' as TabType, name: 'Preferences', icon: CogIcon }
  ]

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="absolute inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-4xl sm:w-full sm:max-h-[90vh] bg-white dark:bg-gray-800 sm:rounded-lg shadow-xl flex flex-col">

        {/* Header - sticky */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Enhanced Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs - horizontal scroll on mobile */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-[4.5rem] sm:top-[4rem] z-10">
          <nav className="-mb-px flex overflow-x-auto scrollbar-hide px-2 sm:px-6">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center space-x-2 px-3 sm:px-4 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="whitespace-nowrap">{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">

          {/* CV Upload Tab */}
          {activeTab === 'cv' && (
            <div className="space-y-4">
              <CVUpload userId={userId} onProfileExtracted={loadProfile} />
            </div>
          )}

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={profile.name || ''}
                    onChange={e => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email || ''}
                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Professional Summary
                </label>
                <textarea
                  value={profile.summary || ''}
                  onChange={e => setProfile({ ...profile, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 sm:px-4 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Brief summary of your experience and goals..."
                />
              </div>

              {/* Skills Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Skills</h3>

                {/* Primary Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Skills (Core Expertise)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill('primarySkills'))}
                      className="flex-1 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Add primary skill..."
                    />
                    <button
                      onClick={() => addSkill('primarySkills')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.primarySkills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        {skill}
                        <button onClick={() => removeSkill('primarySkills', skill)} className="hover:text-blue-600">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Secondary Skills */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secondary Skills
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill('secondarySkills'))}
                      className="flex-1 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="Add secondary skill..."
                    />
                    <button
                      onClick={() => addSkill('secondarySkills')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.secondarySkills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm">
                        {skill}
                        <button onClick={() => removeSkill('secondarySkills', skill)} className="hover:text-gray-600">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Experience Tab */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Work History</h3>
                {profile.workHistory.length > 0 ? (
                  <div className="space-y-4">
                    {profile.workHistory.map((work, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">{work.role}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{work.company} • {work.duration}</p>
                        {work.achievements.length > 0 && (
                          <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                            {work.achievements.map((achievement, i) => (
                              <li key={i}>{achievement}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No work history added yet. Upload your CV to populate this section.</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Education</h3>
                {profile.education.length > 0 ? (
                  <div className="space-y-3">
                    {profile.education.map((edu, idx) => (
                      <div key={idx} className="border-l-2 border-blue-500 pl-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">{edu.degree}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{edu.institution} {edu.year && `• ${edu.year}`}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No education added yet. Upload your CV to populate this section.</p>
                )}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Work Preference
                  </label>
                  <select
                    value={profile.workPreference || ''}
                    onChange={e => setProfile({ ...profile, workPreference: e.target.value })}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select preference</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Availability
                  </label>
                  <select
                    value={profile.availability || ''}
                    onChange={e => setProfile({ ...profile, availability: e.target.value })}
                    className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select availability</option>
                    <option value="Immediate">Immediate</option>
                    <option value="2 weeks">2 weeks</option>
                    <option value="1 month">1 month</option>
                    <option value="2+ months">2+ months</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Salary Expectation
                </label>
                <input
                  type="text"
                  value={profile.salaryExpectation || ''}
                  onChange={e => setProfile({ ...profile, salaryExpectation: e.target.value })}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., €60k-80k"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - sticky */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 text-sm sm:text-base font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}
