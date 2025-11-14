'use client'
import { useState, useEffect } from 'react'
import { Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface SearchSettings {
  minFitScore: number
  maxJobAgeDays: number
  autoScan: boolean
  scanFrequency: string
  dailyApplicationGoal: number
}

export default function JobSearchSettings({ userId, onSettingsSaved }: { userId: string; onSettingsSaved?: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<SearchSettings>({
    minFitScore: 40,
    maxJobAgeDays: 7,
    autoScan: false,
    scanFrequency: 'daily',
    dailyApplicationGoal: 6
  })
  const [saved, setSaved] = useState(false)
  

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, settings })
      })
      const data = await response.json()
      if (data.success) {
        setSaved(true)
        if (onSettingsSaved) onSettingsSaved()
        // Close modal after 1 second to show success message
        setTimeout(() => {
          setSaved(false)
          setIsOpen(false)
        }, 1000)
      } else {
        console.error('Failed to save settings:', data.error)
        alert('Failed to save settings. Please try again.')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Error saving settings. Please try again.')
    }
  }

  useEffect(() => {
    // Load settings from API
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/settings?userId=${userId}`)
        const data = await response.json()
        if (data.success) {
          setSettings(data.settings)
        }
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    loadSettings()
  }, [userId])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg transition-colors bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
        title="Job Search Settings"
      >
        <Cog6ToothIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Cog6ToothIcon className="h-6 w-6" />
                Job Search Settings
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Minimum Fit Score: {settings.minFitScore}%
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Only show jobs with at least this fit score
                </p>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={settings.minFitScore}
                  onChange={(e) => setSettings({ ...settings, minFitScore: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>30% (Show More)</span>
                  <span>90% (Very Selective)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Job Posting Age
                </label>
                <select
                  value={settings.maxJobAgeDays}
                  onChange={(e) => setSettings({ ...settings, maxJobAgeDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                >
                  <option value={1}>Last 24 hours</option>
                  <option value={3}>Last 3 days</option>
                  <option value={7}>Last week</option>
                  <option value={14}>Last 2 weeks</option>
                  <option value={30}>Last month</option>
                </select>
              </div>

              <div className="border-t border-gray-200 dark:border-neutral-700 pt-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoScan}
                    onChange={(e) => setSettings({ ...settings, autoScan: e.target.checked })}
                    className="h-5 w-5"
                  />
                  <div>
                    <div className="font-medium">Enable Auto-Scan</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Automatically scan for new jobs daily
                    </div>
                  </div>
                </label>

                {settings.autoScan && (
                  <div className="mt-4 ml-8">
                    <label className="block text-sm font-medium mb-2">
                      Scan Frequency
                    </label>
                    <select
                      value={settings.scanFrequency}
                      onChange={(e) => setSettings({ ...settings, scanFrequency: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-700 dark:border-neutral-600"
                    >
                      <option value="hourly">Every hour</option>
                      <option value="daily">Once daily (9 AM)</option>
                      <option value="twice-daily">Twice daily (9 AM & 6 PM)</option>
                      <option value="weekly">Once weekly (Monday 9 AM)</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Daily Application Goal: {settings.dailyApplicationGoal} applications/day
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Set your target number of applications per day
                </p>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={settings.dailyApplicationGoal}
                  onChange={(e) => setSettings({ ...settings, dailyApplicationGoal: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Current Configuration
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Minimum fit score: <strong>{settings.minFitScore}%</strong></li>
                  <li>• Jobs from last <strong>{settings.maxJobAgeDays} days</strong></li>
                  <li>• Auto-scan: <strong>{settings.autoScan ? `Yes (${settings.scanFrequency})` : 'No'}</strong></li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={saveSettings}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Settings
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-neutral-700 rounded-lg hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {saved && (
                <div className="text-center text-green-600 dark:text-green-400 font-medium">
                  ✓ Settings saved! Changes will take effect on next scan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
