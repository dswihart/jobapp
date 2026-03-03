import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { monitorJobBoards } from "@/lib/job-monitor"

export const maxDuration = 300

// In-memory rate limiting: userId -> timestamp of last scan
const scanCooldowns = new Map<string, number>()
const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes
const CLEANUP_THRESHOLD_MS = 60 * 60 * 1000 // 1 hour

function cleanupOldEntries() {
  const now = Date.now()
  for (const [key, timestamp] of scanCooldowns) {
    if (now - timestamp > CLEANUP_THRESHOLD_MS) {
      scanCooldowns.delete(key)
    }
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Check rate limit
    const lastScan = scanCooldowns.get(userId)
    if (lastScan) {
      const elapsed = Date.now() - lastScan
      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed
        const remainingMin = Math.ceil(remainingMs / 60000)
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${remainingMin} minute(s) between scans`,
          },
          { status: 429 }
        )
      }
    }

    // Periodic cleanup of old entries
    cleanupOldEntries()

    const count = await monitorJobBoards(userId)

    // Set cooldown only after successful scan
    scanCooldowns.set(userId, Date.now())

    return NextResponse.json({
      success: true,
      jobsFound: count,
      message: `Scan complete. Found ${count} new job(s).`,
    })
  } catch (error) {
    // Don't consume cooldown on failure — allow retry
    scanCooldowns.delete(userId)
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
