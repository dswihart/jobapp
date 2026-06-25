import { redirect } from "next/navigation"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import ResumeTailor from "@/components/ResumeTailor"

export default async function ResumeTailorPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="px-4 pt-4">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">← Back to Dashboard</a>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <ResumeTailor />
      </Suspense>
    </div>
  )
}
