/**
 * User Sources Fetcher
 * Fetches jobs from user-configured sources
 */

import { prisma } from "./prisma"
import { isAllowedUrl } from "./url-validation"
import * as cheerio from "cheerio"

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const FETCH_TIMEOUT_MS = 15000

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
 * NOTE: No pre-AI skill filter - AI fit-score handles all quality filtering
 */
export async function fetchFromUserSources(
  userId: string
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

        // URL validation (defense-in-depth)
        const sourceUrl = source.feedUrl || source.apiEndpoint || source.scrapeUrl
        if (sourceUrl) {
          const urlCheck = isAllowedUrl(sourceUrl)
          if (!urlCheck.allowed) {
            console.log(`[${source.name}] URL blocked: ${urlCheck.reason} — skipping`)
            continue
          }
        }

        let jobs: JobPosting[] = []

        if (source.sourceType === "rss" && source.feedUrl) {
          jobs = await fetchFromRSS(source.feedUrl, source.name)
        } else if (source.sourceType === "api" && source.apiEndpoint) {
          jobs = await fetchFromAPI(
            source.apiEndpoint,
            source.apiKey || undefined,
            source.name
          )
        } else if (source.sourceType === "web_scrape" && source.scrapeUrl) {
          jobs = await fetchFromWebScrape(
            source.scrapeUrl,
            source.name,
            source.scrapeSelector || undefined,
            source.titleSelector || undefined,
            source.companySelector || undefined,
            source.linkSelector || undefined,
            source.descriptionSelector || undefined
          )
        } else if (!source.feedUrl && !source.apiEndpoint && !source.scrapeUrl) {
          continue
        } else {
          console.log(`[${source.name}] Unsupported source type: ${source.sourceType}`)
          continue
        }

        console.log(`[${source.name}] Fetched ${jobs.length} jobs`)

        // Apply per-source searchKeywords filter if configured
        const searchKeywords = source.searchKeywords || []
        if (searchKeywords.length > 0) {
          const before = jobs.length
          jobs = jobs.filter((job) => {
            const jobText =
              `${job.title} ${job.description} ${job.requirements || ""}`.toLowerCase()
            return searchKeywords.some((kw: string) => jobText.includes(kw.toLowerCase()))
          })
          console.log(`[${source.name}] searchKeywords filter: ${before} -> ${jobs.length} jobs`)
        }

        // Apply per-source excludeKeywords filter if configured
        const excludeKeywords = source.excludeKeywords || []
        if (excludeKeywords.length > 0) {
          const before = jobs.length
          jobs = jobs.filter((job) => {
            const jobText =
              `${job.title} ${job.description} ${job.requirements || ""}`.toLowerCase()
            return !excludeKeywords.some((kw: string) => jobText.includes(kw.toLowerCase()))
          })
          console.log(`[${source.name}] excludeKeywords filter: ${before} -> ${jobs.length} jobs`)
        }

        allJobs.push(...jobs)
      } catch (error) {
        console.error(`[${source.name}] Error fetching jobs:`, error)
      }
    }

    // No pre-AI skill filter - let AI fit-score handle matching
    console.log(
      `[User Sources] Returning all ${allJobs.length} jobs (AI fit-score will filter)`
    )
    return allJobs
  } catch (error) {
    console.error("[User Sources] Error fetching from user sources:", error)
    return []
  }
}

/**
 * Fetch from RSS feed
 */
async function fetchFromRSS(
  feedUrl: string,
  sourceName: string
): Promise<JobPosting[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml, application/xml, text/xml, application/json, */*",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

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

    // Check if response is actually HTML (not RSS)
    if (
      xmlText.trim().startsWith("<!DOCTYPE html") ||
      (xmlText.includes("<html") && !xmlText.includes("<rss") && !xmlText.includes("<feed"))
    ) {
      console.log(`[${sourceName}] URL returned HTML instead of RSS/XML, skipping`)
      return []
    }

    return parseXMLFeed(xmlText, sourceName)
  } catch (error) {
    console.error(`[${sourceName}] RSS fetch error:`, error)
    return []
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJSONFeed(data: any, sourceName: string): JobPosting[] {
  if (!data.items || !Array.isArray(data.items)) {
    return []
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.items.map((item: any) => {
    let title = item.title || "Untitled"
    let company = "Unknown Company"

    const atMatch = title.split(" at ")
    if (atMatch.length > 1) {
      title = atMatch[0].trim()
      company = atMatch.slice(1).join(" at ").trim()
    }

    const description = item.content_html
      ? item.content_html
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      : item.content_text || ""

    return {
      title,
      company,
      description: description.substring(0, 2000),
      requirements: description.substring(0, 500),
      location: item.location || undefined,
      jobUrl: item.url || "",
      postedDate: item.date_published
        ? new Date(item.date_published)
        : new Date(),
      source: sourceName,
    }
  })
}

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

    const company =
      extractTag(itemContent, "company") ||
      extractTag(itemContent, "dc:creator") ||
      extractTag(itemContent, "himalayasJobs:companyName") ||
      parseCompanyFromTitle(title) ||
      "Unknown Company"

    const location =
      extractTag(itemContent, "location") ||
      extractTag(itemContent, "region") ||
      extractTag(itemContent, "himalayasJobs:locationRestriction") ||
      undefined

    if (title && link) {
      jobs.push({
        title: decodeHtml(title).trim(),
        company: decodeHtml(company).trim(),
        description: decodeHtml(description).substring(0, 2000),
        requirements: decodeHtml(description).substring(0, 500),
        location: location ? decodeHtml(location).trim() : undefined,
        jobUrl: link.trim(),
        postedDate: pubDate ? new Date(pubDate) : new Date(),
        source: sourceName,
      })
    }
  }

  return jobs
}

function parseCompanyFromTitle(title: string): string | undefined {
  const colonMatch = title.match(/^(.+?):\s+/)
  if (colonMatch && colonMatch[1].length < 50) {
    return colonMatch[1].trim()
  }
  return undefined
}

function extractTag(content: string, tagName: string): string {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const regex = new RegExp(
    "<" +
      escapedTag +
      "(?:\\s[^>]*)?>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*<\\/" +
      escapedTag +
      ">",
    "i"
  )
  const match = content.match(regex)
  if (!match) return ""
  return (match[1] || match[2] || "").trim()
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchFromAPI(
  endpoint: string,
  apiKey: string | undefined,
  sourceName: string
): Promise<JobPosting[]> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    }

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`
    }

    const response = await fetch(endpoint, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    const jobsArray = Array.isArray(data)
      ? data
      : data.jobs || data.data || []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jobsArray.map((job: any) => ({
      title: job.title || job.name || "Untitled",
      company:
        job.company || job.company_name || job.company_name || "Unknown Company",
      description: (job.description || "").substring(0, 2000),
      requirements: job.requirements || job.tags?.join(", ") || "",
      location:
        job.location ||
        job.candidate_required_location ||
        job.remote ||
        undefined,
      salary: job.salary || undefined,
      jobUrl: job.url || job.link || "",
      postedDate: job.posted_date || job.publication_date || job.created_at
        ? new Date(job.posted_date || job.publication_date || job.created_at)
        : new Date(),
      source: sourceName,
    }))
  } catch (error) {
    console.error(`[${sourceName}] API fetch error:`, error)
    return []
  }
}

async function fetchFromWebScrape(
  scrapeUrl: string,
  sourceName: string,
  scrapeSelector?: string,
  titleSelector?: string,
  companySelector?: string,
  linkSelector?: string,
  descriptionSelector?: string
): Promise<JobPosting[]> {
  try {
    const response = await fetch(scrapeUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const jobs: JobPosting[] = []

    const containerSel = scrapeSelector || ".job-listing, .job-card, .job-item, [data-job-id], .job, .posting"
    const titleSel = titleSelector || "h2, h3, .title, .job-title"
    const companySel = companySelector || ".company, .company-name, .employer"
    const linkSel = linkSelector || "a"
    const descSel = descriptionSelector || ".description, .summary, p"

    $(containerSel).each((_i, el) => {
      const $el = $(el)

      const title = $el.find(titleSel).first().text().trim()
      if (!title) return

      const company = $el.find(companySel).first().text().trim() || "Unknown Company"

      let jobUrl = ""
      const linkEl = $el.find(linkSel).first()
      if (linkEl.length) {
        jobUrl = linkEl.attr("href") || ""
      }
      if (!jobUrl) {
        jobUrl = $el.is("a") ? ($el.attr("href") || "") : ""
      }
      if (!jobUrl) return

      if (jobUrl.startsWith("/")) {
        const urlObj = new URL(scrapeUrl)
        jobUrl = `${urlObj.origin}${jobUrl}`
      }

      const description = $el.find(descSel).first().text().trim()
      const location = $el.find(".location, .job-location").first().text().trim() || undefined

      jobs.push({
        title,
        company,
        description: description.substring(0, 2000),
        requirements: description.substring(0, 500),
        location,
        jobUrl,
        postedDate: new Date(),
        source: sourceName,
      })
    })

    return jobs
  } catch (error) {
    console.error(`[${sourceName}] Web scrape error:`, error)
    return []
  }
}
