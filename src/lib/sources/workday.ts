/**
 * Workday ATS adapter.
 * Public listing API:
 *   POST https://{host}/wday/cxs/{tenant}/{site}/jobs
 * Detail content is parsed from the public job page HTML.
 */

import { matchesSpain } from "./spain-filter"
import { AdapterContext, JobPosting, fetchJson, fetchText } from "./types"

interface WorkdayListingResponse {
  total?: number
  jobPostings?: WorkdayListing[]
}

interface WorkdayListing {
  title?: string
  externalPath?: string
  locationsText?: string
  postedOn?: string
}

interface WorkdayConfig {
  origin: string
  tenant: string
  site: string
  localePrefix: string
}

const PAGE_SIZE = 20
const DETAIL_CONCURRENCY = 4

export async function fetchWorkday(ctx: AdapterContext): Promise<JobPosting[]> {
  const config = resolveConfig(ctx)
  const listings = await fetchListings(config)
  if (listings.length === 0) return []

  const jobs = listings
    .filter((job): job is Required<Pick<WorkdayListing, "title" | "externalPath">> & WorkdayListing => {
      return Boolean(job.title && job.externalPath)
    })
    .map((job) => ({
      title: job.title,
      company: ctx.companyName,
      description: "",
      location: job.locationsText || "",
      jobUrl: buildJobUrl(config, job.externalPath),
      postedDate: parsePostedOn(job.postedOn),
      source: "workday",
    }))

  const detailCandidates = jobs.filter((job) => matchesSpain(job.location))
  await mapWithConcurrency(detailCandidates, DETAIL_CONCURRENCY, async (job) => {
    job.description = await fetchJobDescription(job.jobUrl)
  })

  return jobs
}

async function fetchListings(config: WorkdayConfig): Promise<WorkdayListing[]> {
  const all: WorkdayListing[] = []
  let knownTotal: number | null = null
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const data = await fetchJson<WorkdayListingResponse>(buildApiUrl(config), {
      method: "POST",
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Origin: config.origin,
        Referer: `${config.origin}/${config.site}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit: PAGE_SIZE,
        offset,
        searchText: "",
      }),
    })
    const page = data.jobPostings || []
    if (page.length === 0) break
    all.push(...page)
    if (typeof data.total === "number" && data.total > 0) {
      knownTotal = data.total
    }
    if (knownTotal !== null && all.length >= knownTotal) break
    if (page.length < PAGE_SIZE) break
  }
  return all
}

function resolveConfig(ctx: AdapterContext): WorkdayConfig {
  const careersUrl = new URL(ctx.careersUrl)
  const pathParts = careersUrl.pathname.split("/").filter(Boolean)
  const localeRegex = /^[a-z]{2}(?:-[A-Z]{2})?$/
  const hasLocalePrefix = pathParts.length > 1 && localeRegex.test(pathParts[0])
  const site = hasLocalePrefix ? pathParts[1] : pathParts[0]
  if (!site) {
    throw new Error(`Could not derive Workday site from careersUrl: ${ctx.careersUrl}`)
  }

  let tenant = careersUrl.hostname.split(".")[0]
  if (ctx.atsSlug) {
    const parts = ctx.atsSlug.split(/[|/]/).map((part) => part.trim()).filter(Boolean)
    if (parts.length === 2) {
      tenant = parts[0]
      return {
        origin: careersUrl.origin,
        tenant,
        site: parts[1],
        localePrefix: hasLocalePrefix ? pathParts[0] : "en-US",
      }
    }
    if (parts.length === 1 && parts[0]) {
      tenant = parts[0]
    }
  }

  return {
    origin: careersUrl.origin,
    tenant,
    site,
    localePrefix: hasLocalePrefix ? pathParts[0] : "en-US",
  }
}

function buildApiUrl(config: WorkdayConfig): string {
  return `${config.origin}/wday/cxs/${encodeURIComponent(config.tenant)}/${encodeURIComponent(config.site)}/jobs`
}

function buildJobUrl(config: WorkdayConfig, externalPath: string): string {
  const normalizedPath = externalPath.startsWith("/") ? externalPath : `/${externalPath}`
  return `${config.origin}/${config.localePrefix}/${config.site}${normalizedPath}`
}

async function fetchJobDescription(jobUrl: string): Promise<string> {
  try {
    const jobPage = new URL(jobUrl)
    const html = await fetchText(jobUrl, {
      headers: {
        "Accept-Language": "en-US,en;q=0.9",
        Referer: jobPage.origin,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    })
    const ldJsonMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i)
    if (ldJsonMatch) {
      try {
        const parsed = JSON.parse(ldJsonMatch[1]) as { description?: string }
        if (parsed.description) return normalizeText(parsed.description)
      } catch {
        // Fall through to meta tag parse
      }
    }

    const metaMatch = html.match(
      /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
    )
    if (metaMatch) return normalizeText(metaMatch[1])
  } catch (error) {
    console.error(`[workday] Failed to hydrate ${jobUrl}:`, error)
  }
  return ""
}

function normalizeText(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function parsePostedOn(raw: string | undefined): Date {
  if (!raw) return new Date()
  const value = raw.trim().toLowerCase()
  if (value === "posted today") return new Date()
  if (value === "posted yesterday") return new Date(Date.now() - 24 * 60 * 60 * 1000)
  const daysMatch = value.match(/posted\s+(\d+)\+?\s+day/)
  if (daysMatch) {
    const days = Number(daysMatch[1])
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  }
  const weeksMatch = value.match(/posted\s+(\d+)\+?\s+week/)
  if (weeksMatch) {
    const weeks = Number(weeksMatch[1])
    return new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000)
  }
  return new Date()
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index++]
      await fn(current)
    }
  })
  await Promise.all(workers)
}
