/**
 * Ashby ATS adapter.
 * Primary path: POST https://api.ashbyhq.com/posting-api/job-board/{slug}
 *   body: {"jobBoardName": "<slug>"}
 * Fallback path: parse __NEXT_DATA__ JSON from https://jobs.ashbyhq.com/{slug}
 */

import { AdapterContext, JobPosting, fetchJson, fetchText, safeDate } from "./types"

interface AshbyLocation {
  locationName?: string
  isRemote?: boolean
}

interface AshbyJobPosting {
  id: string
  title: string
  locationName?: string
  location?: AshbyLocation
  departmentName?: string
  teamName?: string
  isListed?: boolean
  isRemote?: boolean
  descriptionPlain?: string
  descriptionHtml?: string
  jobUrl?: string
  externalLink?: string
  publishedAt?: string
  updatedAt?: string
}

interface AshbyApiResponse {
  jobs?: AshbyJobPosting[]
  postings?: AshbyJobPosting[]
}

export async function fetchAshby(ctx: AdapterContext): Promise<JobPosting[]> {
  try {
    const data = await fetchJson<AshbyApiResponse>(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(ctx.atsSlug)}?includeCompensation=false`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobBoardName: ctx.atsSlug }),
      }
    )
    const jobs = data.jobs || data.postings || []
    if (jobs.length > 0) return jobs.map((j) => normalize(j, ctx))
  } catch (err) {
    console.log(
      `[ashby:${ctx.atsSlug}] POST API failed (${(err as Error).message}), falling back to __NEXT_DATA__ parse`
    )
  }

  const html = await fetchText(`https://jobs.ashbyhq.com/${encodeURIComponent(ctx.atsSlug)}`)
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(match[1])
  } catch {
    return []
  }
  const postings = extractAshbyJobs(parsed)
  return postings.map((j) => normalize(j, ctx))
}

function extractAshbyJobs(data: unknown): AshbyJobPosting[] {
  if (!data || typeof data !== "object") return []
  const queue: unknown[] = [data]
  const found: AshbyJobPosting[] = []
  const seen = new WeakSet<object>()
  while (queue.length) {
    const node = queue.shift()
    if (!node || typeof node !== "object") continue
    if (seen.has(node as object)) continue
    seen.add(node as object)
    if (Array.isArray(node)) {
      for (const item of node) {
        if (isAshbyJob(item)) found.push(item as AshbyJobPosting)
        else queue.push(item)
      }
    } else {
      for (const val of Object.values(node as Record<string, unknown>)) {
        if (Array.isArray(val) && val.some(isAshbyJob)) {
          for (const item of val) if (isAshbyJob(item)) found.push(item as AshbyJobPosting)
        } else {
          queue.push(val)
        }
      }
    }
  }
  return found
}

function isAshbyJob(v: unknown): boolean {
  return (
    typeof v === "object" &&
    v !== null &&
    "id" in v &&
    "title" in v &&
    ("locationName" in v || "location" in v || "jobUrl" in v || "externalLink" in v)
  )
}

function normalize(j: AshbyJobPosting, ctx: AdapterContext): JobPosting {
  const url =
    j.jobUrl ||
    j.externalLink ||
    `https://jobs.ashbyhq.com/${encodeURIComponent(ctx.atsSlug)}/${encodeURIComponent(j.id)}`
  const loc = j.locationName || j.location?.locationName || (j.isRemote ? "Remote" : "")
  const description = j.descriptionPlain || stripHtml(j.descriptionHtml || "")
  return {
    title: j.title,
    company: ctx.companyName,
    description,
    location: loc,
    jobUrl: url,
    postedDate: safeDate(j.publishedAt || j.updatedAt),
    source: "ashby",
  }
}

function stripHtml(html: string): string {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
