import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import ResumeTailor from "@/components/ResumeTailor"

export default async function ResumeTailorPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ResumeTailor />
    </div>
  )
}
