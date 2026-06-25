'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

const inputClass =
  'appearance-none rounded-lg relative block w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 placeholder-neutral-500 dark:placeholder-neutral-400 text-neutral-900 dark:text-neutral-50 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Failed to change password')
      } else {
        setSuccess('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to dashboard
          </Link>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-neutral-50 flex items-center justify-center gap-2">
            <KeyIcon className="h-7 w-7 text-blue-600" />
            Change Password
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="currentPassword" className="sr-only">
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className={inputClass}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="sr-only">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing password...' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
