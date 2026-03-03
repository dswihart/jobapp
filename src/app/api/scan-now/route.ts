import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { monitorJobBoards } from "@/lib/job-monitor"

export const maxDuration = 300

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const count = await monitorJobBoards(session.user.id)

    return NextResponse.json({
      success: true,
      jobsFound: count,
      message: `Scan complete. Found ${count} new job(s).`,
    })
  } catch (error) {
    console.error("[Scan Now] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scan failed",
      },
      { status: 500 }
    )
  }
}
