/**
 * Greenhouse ATS adapter.
 * Public JSON API: https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
 * No auth required for public boards.
 */

import { AdapterContext, JobPosting, fetchJson, safeDate } from "./types"

interface GreenhouseLocation {
  name?: string
}

interface GreenhouseJob {
  id: number
  title: string
  absolute_url: string
  location?: GreenhouseLocation
  content?: string
  updated_at?: string
  first_published?: string
  requisition_id?: string
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[]
  meta?: { total?: number }
}

export async function fetchGreenhouse(ctx: AdapterContext): Promise<JobPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ctx.atsSlug)}/jobs?content=true`
  const data = await fetchJson<GreenhouseResponse>(url)
  return (data.jobs || []).map((job) => ({
    title: job.title,
    company: ctx.companyName,
    description: stripHtml(job.content || ""),
    location: job.location?.name || "",
    jobUrl: job.absolute_url,
    postedDate: safeDate(job.first_published || job.updated_at),
    source: "greenhouse",
  }))
}

function stripHtml(html: string): string {
  if (!html) return ""
  try {
    const decoded = html
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
    return decoded
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  } catch {
    return html
  }
}
