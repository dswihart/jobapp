import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { sourceId } = await request.json()

    const source = await prisma.userJobSource.findUnique({
      where: { id: sourceId },
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Source not found" },
        { status: 404 }
      )
    }

    const url = source.feedUrl || source.scrapeUrl || source.apiEndpoint
    if (!url) {
      return NextResponse.json({
        success: false,
        error: "No URL configured",
      })
    }

    const headers: Record<string, string> = { "User-Agent": USER_AGENT }

    if (source.sourceType === "rss") {
      headers["Accept"] =
        "application/rss+xml, application/xml, text/xml, application/json, */*"
    } else if (source.sourceType === "api") {
      headers["Accept"] = "application/json"
      headers["Content-Type"] = "application/json"
      if (source.apiKey) {
        headers["Authorization"] = `Bearer ${source.apiKey}`
      }
    } else {
      headers["Accept"] = "text/html,application/xhtml+xml,*/*"
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `HTTP ${response.status} ${response.statusText}`,
      })
    }

    const text = await response.text()
    let jobCount = 0
    let sampleTitles: string[] = []

    if (source.sourceType === "rss") {
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("json")) {
        const data = JSON.parse(text)
        const items = data.items || []
        jobCount = items.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sampleTitles = items
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((i: any) => i.title || "Untitled")
      } else {
        const titleMatches =
          text.match(
            /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/gi
          ) || []
        // Skip the first <title> which is the channel title
        const itemTitles = titleMatches.slice(1)
        jobCount = itemTitles.length
        sampleTitles = itemTitles.slice(0, 5).map((t) =>
          t
            .replace(/<\/?title>/gi, "")
            .replace(/<!\[CDATA\[|\]\]>/g, "")
            .trim()
        )
      }
    } else if (source.sourceType === "api") {
      const data = JSON.parse(text)
      const items = Array.isArray(data) ? data : data.jobs || data.data || []
      jobCount = items.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sampleTitles = items
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((i: any) => i.title || i.name || "Untitled")
    } else {
      // Web scrape - count potential job containers
      const containerPatterns = [
        /class="[^"]*job[^"]*"/gi,
        /class="[^"]*posting[^"]*"/gi,
        /class="[^"]*listing[^"]*"/gi,
        /class="[^"]*vacancy[^"]*"/gi,
      ]
      for (const pattern of containerPatterns) {
        const matches = text.match(pattern) || []
        jobCount += matches.length
      }
      if (jobCount > 0) {
        sampleTitles = [`Found ~${jobCount} potential job elements on page`]
      } else {
        sampleTitles = ["Page loaded but no obvious job containers found"]
      }
    }

    return NextResponse.json({
      success: true,
      jobCount,
      sampleTitles,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
