'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, message, type, duration }

    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast])
  const error = useCallback((message: string) => addToast(message, 'error', 6000), [addToast])
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast])
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm" role="region" aria-label="Notifications">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onClose: () => void
}

const toastStyles: Record<ToastType, { bg: string; icon: typeof CheckCircleIcon; iconColor: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: CheckCircleIcon,
    iconColor: 'text-green-500'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: XCircleIcon,
    iconColor: 'text-red-500'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    icon: ExclamationTriangleIcon,
    iconColor: 'text-yellow-500'
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: InformationCircleIcon,
    iconColor: 'text-blue-500'
  }
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const style = toastStyles[toast.type]
  const Icon = style.icon

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right-5 duration-300 ${style.bg}`}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${style.iconColor}`} />
      <p className="text-sm text-gray-800 dark:text-gray-200 flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="Dismiss notification"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export default ToastProvider
