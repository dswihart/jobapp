import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import JobSourcesManager from '@/components/JobSourcesManager'
import RejectionPatternsPanel from '@/components/RejectionPatternsPanel'

export default async function SourcesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <a href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">← Back to Dashboard</a>
      <JobSourcesManager userId={session.user.id as string} />
      <RejectionPatternsPanel />
    </div>
  )
}
