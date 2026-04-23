import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import TargetCompaniesManager from "@/components/TargetCompaniesManager"

export default async function CompaniesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <TargetCompaniesManager />
    </div>
  )
}
