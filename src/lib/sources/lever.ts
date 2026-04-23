/**
 * Lever ATS adapter.
 * Public JSON API: https://api.lever.co/v0/postings/{slug}?mode=json
 * No auth required for public postings.
 */

import { AdapterContext, JobPosting, fetchJson, safeDate } from "./types"

interface LeverCategories {
  location?: string
  team?: string
  commitment?: string
  department?: string
}

interface LeverPosting {
  id: string
  text: string
  hostedUrl: string
  applyUrl?: string
  descriptionPlain?: string
  description?: string
  categories?: LeverCategories
  country?: string
  createdAt?: number
}

export async function fetchLever(ctx: AdapterContext): Promise<JobPosting[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(ctx.atsSlug)}?mode=json`
  const data = await fetchJson<LeverPosting[]>(url)
  return (Array.isArray(data) ? data : []).map((post) => {
    const locationParts = [post.categories?.location, post.country].filter(Boolean) as string[]
    return {
      title: post.text,
      company: ctx.companyName,
      description: post.descriptionPlain || stripHtml(post.description || ""),
      location: locationParts.join(", "),
      jobUrl: post.hostedUrl,
      postedDate: safeDate(post.createdAt),
      source: "lever",
    }
  })
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
