import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ToastProvider } from '@/components/ToastProvider'
import SessionProvider from '@/components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI-Powered Job Application Tracker',
  description: 'Streamline and enhance your job application process with intelligent tracking and insights',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Job Tracker',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className={`${inter.className} bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50`}>
        <SessionProvider>
          <ThemeProvider><ToastProvider>{children}</ToastProvider></ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
