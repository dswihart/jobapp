/**
 * Exa Whole-Web Job Discovery
 * Builds neural search queries from the user's profile + recent GOOD_MATCH liked titles,
 * runs them via the Exa API, and normalizes hits into the shared JobPosting shape so they
 * flow through the existing job-monitor scoring/dedup/save pipeline.
 *
 * Additive + fail-soft: kill switch via EXA_DISCOVERY_ENABLED / EXA_API_KEY; per-query
 * failures are isolated; no outbound fetch of discovered URLs (uses Exa-returned text).
 */

import { prisma } from "../prisma"
import { exaSearch, ExaResult } from "../exa-client"
import { JobPosting, safeDate } from "./types"

const MAX_RESULTS_PER_QUERY = 25
const DEFAULT_MAX_AGE_DAYS = 7
const MAX_LIKED_TITLES = 5
const DESCRIPTION_MAX_CHARS = 5000

interface DiscoveryUser {
  skills: string[]
  primarySkills: string[]
  jobTitles: string[]
  preferredCountries: string[]
  location: string | null
}

export async function fetchFromExaDiscovery(userId: string): Promise<JobPosting[]> {
  if (process.env.EXA_DISCOVERY_ENABLED === "false") {
    console.log("[Exa Discovery] Disabled via EXA_DISCOVERY_ENABLED=false — skipping")
    return []
  }
  if (!process.env.EXA_API_KEY) {
    console.warn("[Exa Discovery] EXA_API_KEY not set — skipping")
    return []
  }

  // Cost control: the scan cron runs hourly, but Exa (paid, ~$0.20/run) rarely
  // surfaces genuinely-new jobs within a single hour. Only run discovery every
  // EXA_INTERVAL_HOURS (default 3), keyed off the wall-clock hour, so the free
  // sources keep scanning hourly while Exa spend drops ~3x. Set EXA_INTERVAL_HOURS=1
  // to restore hourly Exa.
  const intervalHours = Math.max(1, parseInt(process.env.EXA_INTERVAL_HOURS || "3", 10) || 3)
  const hour = new Date().getUTCHours()
  if (hour % intervalHours !== 0) {
    console.log(
      `[Exa Discovery] Skipped (runs every ${intervalHours}h for cost control; current hour=${hour})`
    )
    return []
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      skills: true,
      primarySkills: true,
      jobTitles: true,
      preferredCountries: true,
      location: true,
      maxJobAgeDays: true,
    },
  })
  if (!user) {
    console.warn(`[Exa Discovery] User ${userId} not found — skipping`)
    return []
  }

  const likedTitles = await getLikedTitles(userId)
  const queries = buildProfileQueries(user, likedTitles)
  if (queries.length === 0) {
    console.log("[Exa Discovery] No queries could be built from profile — skipping")
    return []
  }

  const maxAgeDays = user.maxJobAgeDays ?? DEFAULT_MAX_AGE_DAYS
  const startPublishedDate = new Date(
    Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  ).toISOString()

  const all: JobPosting[] = []
  for (const query of queries) {
    try {
      const results = await exaSearch(query, {
        numResults: MAX_RESULTS_PER_QUERY,
        startPublishedDate,
      })
      for (const r of results) {
        const jp = toJobPosting(r)
        if (jp) all.push(jp)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[Exa Discovery] Query failed "${query.slice(0, 60)}": ${msg}`)
      // Fail-soft: continue with the next query
    }
  }

  const unique = Array.from(new Map(all.map((j) => [j.jobUrl, j])).values())
  console.log(
    `[Exa Discovery] ${queries.length} queries → ${all.length} hits (${unique.length} unique)`
  )
  return unique
}

export function buildProfileQueries(
  user: DiscoveryUser,
  likedTitles: string[]
): string[] {
  const titles = (user.jobTitles || []).filter(Boolean).slice(0, 3)
  const skills = ((user.primarySkills?.length ? user.primarySkills : user.skills) || [])
    .filter(Boolean)
    .slice(0, 4)
  const countries = (user.preferredCountries || []).filter(Boolean)
  const locationHint =
    countries.length > 0
      ? `remote ${countries.join(" OR ")}`
      : user.location
        ? `remote ${user.location}`
        : "remote"

  const queries: string[] = []
  for (const title of titles) {
    queries.push(`hiring ${title} ${locationHint} job posting`)
  }
  if (skills.length > 0) {
    queries.push(`${skills.join(" ")} ${locationHint} job posting`)
  }
  for (const liked of likedTitles) {
    queries.push(`${liked} ${locationHint} job`)
  }

  const seen = new Set<string>()
  const deduped: string[] = []
  for (const q of queries) {
    const key = q.trim().toLowerCase().replace(/\s+/g, " ")
    if (key && !seen.has(key)) {
      seen.add(key)
      deduped.push(q.trim())
    }
  }
  return deduped
}

async function getLikedTitles(userId: string): Promise<string[]> {
  const liked = await prisma.jobOpportunity.findMany({
    where: { userId, userFeedback: "GOOD_MATCH" },
    select: { title: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_LIKED_TITLES,
  })
  return liked.map((j) => j.title).filter(Boolean)
}

// Known job-aggregator / content-farm hosts. Exa whole-web search ranks these
// highly because they keyword-stuff our queries, but they are NOT employers and
// their domain is not a real company name. Skip results from these entirely.
const AGGREGATOR_HOST_DENYLIST = [
  "hireza", "hirevector", "hirro", "hirequorum", "hirebase", "jobflarely",
  "quickswoop", "zenvok", "wfh", "wfhverse", "wfhforgeon", "dailyremote",
  "remoterocketship", "echojobs", "joblaze", "jaabz", "jobera", "jobijoba",
  "jobspresso", "jooble", "talent.com", "ziprecruiter", "neuvoo", "adzuna",
  "jobgether", "remoteok", "remotive", "weworkremotely", "himalayas", "jobicy",
  "english-jobs", "bulldogjob", "sportstechjobs", "jobfluent", "coberonchronos",
  // Paywalled boards — listings are gated behind a paid membership, so they are
  // useless to the user even when the posting is real. See PAYWALLED_HOST_DENYLIST
  // in job-monitor.ts, which also drops these from non-Exa sources.
  "workingnomads", "flexjobs",
]

function isAggregatorHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase()
    return AGGREGATOR_HOST_DENYLIST.some(d => host === d || host.includes(d))
  } catch {
    return false
  }
}

export function toJobPosting(r: ExaResult): JobPosting | null {
  if (!r.url) return null
  // Aggregator/content-farm results pollute the DB with fake company names and
  // duplicate real postings under different "brands" — drop them at the source.
  if (isAggregatorHost(r.url)) return null
  const title = (r.title || "").trim()
  if (!title) return null
  return {
    title,
    company: parseCompany(title, r.url),
    description: (r.text || "").slice(0, DESCRIPTION_MAX_CHARS),
    jobUrl: r.url,
    postedDate: safeDate(r.publishedDate),
    source: "exa",
  }
}

function parseCompany(title: string, url: string): string {
  // Strong company indicators only ("Role at Company", "Role with Company", and
  // em-dash/pipe separators). We deliberately do NOT fall back to the URL
  // hostname — a domain is never a reliable employer name and was the source of
  // the "Hireza/Wfh/Jobflarely" junk-company problem. ("-" is too noisy to use.)
  for (const sep of [" at ", " with ", " — ", " | "]) {
    const idx = title.lastIndexOf(sep)
    if (idx > 0) {
      const cleaned = cleanCompany(title.slice(idx + sep.length))
      if (cleaned) return cleaned
    }
  }
  return "Unknown Company"
}

function cleanCompany(raw: string): string | null {
  // Drop trailing " | 12345" / " - DailyRemote" style segments
  const candidate = raw.trim().split(/\s+[|\-]\s+/)[0].trim()
  if (candidate.length < 2 || candidate.length > 60) return null
  // Reject all-numeric / punctuation-only (job req IDs)
  if (/^[\d\s#.\-]+$/.test(candidate)) return null
  return candidate
}
