/**
 * User Sources Fetcher
 * Fetches jobs from user-configured sources
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface JobPosting {
  title: string
  company: string
  description: string
  requirements?: string
  location?: string
  salary?: string
  jobUrl: string
  postedDate?: Date
  source?: string
}

/**
 * Fetch jobs from user-specific sources
 */
export async function fetchFromUserSources(
  userId: string,
  skills: string[]
): Promise<JobPosting[]> {
  try {
    const sources = await prisma.userJobSource.findMany({
      where: {
        userId,
        enabled: true,
      },
    })

    console.log(`[User Sources] Found ${sources.length} enabled sources for user`)

    const allJobs: JobPosting[] = []

    for (const source of sources) {
      try {
        console.log(`[${source.name}] Fetching jobs...`)

        let jobs: JobPosting[] = []

        if (source.sourceType === "rss" && source.feedUrl) {
          jobs = await fetchFromRSS(source.feedUrl, source.name)
        } else if (source.sourceType === "api" && source.apiEndpoint) {
          jobs = await fetchFromAPI(
            source.apiEndpoint,
            source.apiKey || undefined,
            source.name
          )
        } else {
          console.log(`[${source.name}] Unsupported source type: ${source.sourceType}`)
        }

        console.log(`[${source.name}] Fetched ${jobs.length} jobs`)
        allJobs.push(...jobs)
      } catch (error) {
        console.error(`[${source.name}] Error fetching jobs:`, error)
      }
    }

    // Filter jobs based on skills
    const filteredJobs = allJobs.filter(job => {
      const jobText = `${job.title} ${job.description} ${job.requirements || ''}`.toLowerCase()
      return skills.some(skill => jobText.includes(skill.toLowerCase()))
    })

    console.log(`[User Sources] Filtered ${allJobs.length} jobs to ${filteredJobs.length} matching jobs`)
    return filteredJobs
  } catch (error) {
    console.error("[User Sources] Error fetching from user sources:", error)
    return []
  }
}

/**
 * Fetch from RSS feed
 */
async function fetchFromRSS(feedUrl: string, sourceName: string): Promise<JobPosting[]> {
  try {
    const response = await fetch(feedUrl)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || ""

    // Handle JSON feeds (RSS.app style)
    if (contentType.includes("json")) {
      const data = await response.json()
      return parseJSONFeed(data, sourceName)
    }

    // Handle XML feeds
    const xmlText = await response.text()
    return parseXMLFeed(xmlText, sourceName)
  } catch (error) {
    console.error(`[${sourceName}] RSS fetch error:`, error)
    return []
  }
}

/**
 * Parse JSON feed (RSS.app format)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSONFeed(data: any, sourceName: string): JobPosting[] {
  if (!data.items || !Array.isArray(data.items)) {
    return []
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.items.map((item: any) => {
    let title = item.title || "Untitled"
    let company = "Unknown Company"

    // Try to parse "Title at Company" format
    const atMatch = title.split(" at ")
    if (atMatch.length > 1) {
      title = atMatch[0].trim()
      company = atMatch.slice(1).join(" at ").trim()
    }

    const description = item.content_html
      ? item.content_html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : item.content_text || ""

    return {
      title,
      company,
      description: description.substring(0, 2000),
      requirements: description.substring(0, 500),
      location: item.location || undefined,
      jobUrl: item.url || "",
      postedDate: item.date_published ? new Date(item.date_published) : new Date(),
      source: sourceName,
    }
  })
}

/**
 * Parse XML RSS feed
 */
function parseXMLFeed(xmlText: string, sourceName: string): JobPosting[] {
  const jobs: JobPosting[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xmlText)) !== null) {
    const itemContent = match[1]

    const title = extractTag(itemContent, "title")
    const link = extractTag(itemContent, "link")
    const description = extractTag(itemContent, "description")
    const pubDate = extractTag(itemContent, "pubDate")

    if (title && link) {
      jobs.push({
        title: decodeHtml(title),
        company: "Unknown Company",
        description: decodeHtml(description).substring(0, 2000),
        requirements: decodeHtml(description).substring(0, 500),
        jobUrl: link,
        postedDate: pubDate ? new Date(pubDate) : new Date(),
        source: sourceName,
      })
    }
  }

  return jobs
}

/**
 * Extract XML tag content
 */
function extractTag(content: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\s[^>]*)?>([\s\S]*?)<\/${tagName}>`, "i")
  const match = content.match(regex)
  return match ? match[1].trim() : ""
}

/**
 * Decode HTML entities
 */
function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Fetch from API endpoint
 */
async function fetchFromAPI(
  endpoint: string,
  apiKey: string | undefined,
  sourceName: string
): Promise<JobPosting[]> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(endpoint, { headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // Assume API returns { jobs: [...] } or just [...]
    const jobsArray = Array.isArray(data) ? data : data.jobs || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jobsArray.map((job: any) => ({
      title: job.title || job.name || "Untitled",
      company: job.company || job.company_name || "Unknown Company",
      description: job.description || "",
      requirements: job.requirements || "",
      location: job.location || undefined,
      salary: job.salary || undefined,
      jobUrl: job.url || job.link || "",
      postedDate: job.posted_date ? new Date(job.posted_date) : new Date(),
      source: sourceName,
    }))
  } catch (error) {
    console.error(`[${sourceName}] API fetch error:`, error)
    return []
  }
}
