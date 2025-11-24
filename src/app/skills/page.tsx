'use client'

import { useState, useEffect } from 'react'
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  BeakerIcon,
  CpuChipIcon,
  CloudIcon,
  ShieldCheckIcon,
  CodeBracketIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Skill {
  id: string
  name: string
  normalizedName: string
  category: string
  subcategory?: string
  frequency: number
  demandTrend: string
  aliases: string[]
  lastSeenAt: string
  _count?: { jobSkills: number }
}

interface SkillStats {
  totalSkills: number
  totalJobSkills: number
  topSkills: Skill[]
  categoryBreakdown: Array<{ category: string; count: number; totalFrequency: number }>
  recentSkills: Skill[]
}

interface MatchResult {
  matched: Skill[]
  recommended: Skill[]
}

const categoryIcons: Record<string, any> = {
  'Programming Language': CodeBracketIcon,
  'Frontend Framework': CpuChipIcon,
  'Backend Framework': CpuChipIcon,
  'Database': BeakerIcon,
  'Cloud Platform': CloudIcon,
  'DevOps': WrenchScrewdriverIcon,
  'Security': ShieldCheckIcon,
  'Data & ML': SparklesIcon,
  'Soft Skill': AcademicCapIcon
}

const categoryColors: Record<string, string> = {
  'Programming Language': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Frontend Framework': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Backend Framework': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  'Database': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Cloud Platform': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  'DevOps': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Security': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Data & ML': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'Soft Skill': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
}

export default function SkillsPage() {
  const [stats, setStats] = useState<SkillStats | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [matches, setMatches] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [buildResult, setBuildResult] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'browse' | 'match' | 'build'>('overview')

  useEffect(() => {
    fetchStats()
    fetchSkills()
    fetchMatches()
  }, [])

  useEffect(() => {
    fetchSkills()
  }, [searchQuery, selectedCategory])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/skills?action=stats')
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'search', limit: '100' })
      if (searchQuery) params.set('q', searchQuery)
      if (selectedCategory) params.set('category', selectedCategory)

      const response = await fetch(`/api/skills?${params}`)
      const result = await response.json()
      if (result.success) {
        setSkills(result.data)
      }
    } catch (err) {
      console.error('Error fetching skills:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/skills?action=match')
      const result = await response.json()
      if (result.success) {
        setMatches(result.data)
      }
    } catch (err) {
      console.error('Error fetching matches:', err)
    }
  }

  const buildDatabase = async (source: 'opportunities' | 'applications') => {
    setBuilding(true)
    setBuildResult(null)
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: source === 'opportunities' ? 'build-from-opportunities' : 'build-from-applications',
          limit: 50
        })
      })
      const result = await response.json()
      if (result.success) {
        setBuildResult(result.data)
        // Refresh data
        fetchStats()
        fetchSkills()
        fetchMatches()
      }
    } catch (err) {
      console.error('Error building database:', err)
    } finally {
      setBuilding(false)
    }
  }

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'rising') return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
    if (trend === 'declining') return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
    return <MinusIcon className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AcademicCapIcon className="h-7 w-7" />
              Skill Database
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              AI-powered skill extraction and analysis from job postings
            </p>
          </div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                { id: 'browse', label: 'Browse Skills', icon: MagnifyingGlassIcon },
                { id: 'match', label: 'Skill Match', icon: SparklesIcon },
                { id: 'build', label: 'Build Database', icon: BeakerIcon }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSkills}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Unique Skills</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.totalJobSkills}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Skill Mentions</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-green-600">
                  {stats.categoryBreakdown.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.topSkills[0]?.frequency || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Top Skill Mentions</div>
              </div>
            </div>

            {/* Top Skills */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Most In-Demand Skills
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {stats.topSkills.slice(0, 10).map((skill, idx) => (
                  <div key={skill.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span className="text-2xl font-bold text-gray-400 w-8">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {skill.name}
                        <TrendIcon trend={skill.demandTrend} />
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {skill.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">{skill.frequency}</div>
                      <div className="text-xs text-gray-500">mentions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Skills by Category
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.categoryBreakdown.map(cat => {
                  const Icon = categoryIcons[cat.category] || AcademicCapIcon
                  const colorClass = categoryColors[cat.category] || 'bg-gray-100 text-gray-800'
                  return (
                    <div
                      key={cat.category}
                      className={`p-4 rounded-lg ${colorClass} cursor-pointer hover:opacity-80`}
                      onClick={() => {
                        setSelectedCategory(cat.category)
                        setActiveTab('browse')
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{cat.category}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{cat.count} skills</span>
                        <span>{cat.totalFrequency} mentions</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Browse Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {/* Search and Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {stats?.categoryBreakdown.map(cat => (
                    <option key={cat.category} value={cat.category}>{cat.category}</option>
                  ))}
                </select>
                <button
                  onClick={fetchSkills}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Skills Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : skills.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No skills found. Try building the database first.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {skills.map(skill => (
                    <div
                      key={skill.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {skill.name}
                        </h3>
                        <TrendIcon trend={skill.demandTrend} />
                      </div>
                      <div className={`inline-block px-2 py-1 rounded text-xs ${categoryColors[skill.category] || 'bg-gray-100 text-gray-800'}`}>
                        {skill.category}
                      </div>
                      <div className="mt-3 flex justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>{skill.frequency} mentions</span>
                        <span>{skill._count?.jobSkills || 0} jobs</span>
                      </div>
                      {skill.aliases.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          Also: {skill.aliases.slice(0, 3).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match Tab */}
        {activeTab === 'match' && (
          <div className="space-y-6">
            {/* Your Matched Skills */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-green-500" />
                Your Skills in Demand
              </h2>
              {matches?.matched && matches.matched.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.matched.map(skill => (
                    <div key={skill.id} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{skill.name}</span>
                        <TrendIcon trend={skill.demandTrend} />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {skill.category}
                      </div>
                      <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                        {skill.frequency} job mentions
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No skill matches found. Make sure you have skills in your profile and have built the skill database.
                </div>
              )}
            </div>

            {/* Recommended Skills */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
                Recommended Skills to Learn
              </h2>
              {matches?.recommended && matches.recommended.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.recommended.map(skill => (
                    <div key={skill.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{skill.name}</span>
                        <TrendIcon trend={skill.demandTrend} />
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {skill.category}
                      </div>
                      <div className="mt-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                        {skill.frequency} job mentions
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Build the skill database to see recommendations.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Build Tab */}
        {activeTab === 'build' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Build Skill Database
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Use AI to extract skills from your job opportunities and applications. This will analyze job descriptions
                and build a database of in-demand skills.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    From Job Opportunities
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Extract skills from saved job opportunities and their descriptions.
                  </p>
                  <button
                    onClick={() => buildDatabase('opportunities')}
                    disabled={building}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {building ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BeakerIcon className="h-5 w-5" />
                        Build from Opportunities
                      </>
                    )}
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    From Applications
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Extract skills from your job application notes and saved descriptions.
                  </p>
                  <button
                    onClick={() => buildDatabase('applications')}
                    disabled={building}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {building ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BeakerIcon className="h-5 w-5" />
                        Build from Applications
                      </>
                    )}
                  </button>
                </div>
              </div>

              {buildResult && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Build Complete!</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>Processed: {buildResult.processed} jobs</li>
                    <li>New skills added: {buildResult.totalSaved}</li>
                    <li>Existing skills updated: {buildResult.totalUpdated}</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
