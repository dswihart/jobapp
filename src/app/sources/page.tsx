import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import JobSourcesManager from "@/components/JobSourcesManager"

export default async function SourcesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <JobSourcesManager userId={session.user.id as string} />
    </div>
  )
}
