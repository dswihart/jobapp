/**
 * Location filter for target-company ingestion.
 *
 * Accepts roles that are EITHER Spain-based OR remote / Europe-eligible, while
 * EXCLUDING roles locked to a non-European region (e.g. "Remote - USA",
 * "United States - Remote", "Remote - LATAM"), which a Spain-based candidate
 * cannot take. Per-user AI fit-scoring + the opportunities display filter handle
 * final relevance ranking.
 *
 * History: loosened 2026-06-06 from strict Spain-only (which zeroed out
 * remote-first companies); re-tightened 2026-06-21 to drop US/other-region-only
 * remote roles that were leaking through on "remote". Function names kept.
 */

const SPAIN_TERMS = [
  "spain",
  "españa",
  "espana",
  "madrid",
  "barcelona",
  "valencia",
  "seville",
  "sevilla",
  "malaga",
  "málaga",
  "bilbao",
] as const

const REMOTE_EUROPE_TERMS = [
  "remote",
  "worldwide",
  "anywhere",
  "global",
  "emea",
  "europe",
  "european",
] as const

// Roles locked to a non-European region — excluded even when tagged "remote".
// (European countries like UK/Germany/Belgium/etc. are intentionally NOT here.)
const NON_EU_REGION_TERMS = [
  "united states",
  "usa",
  "u.s.",
  "remote - us",
  "remote, us",
  "remote (us",
  "us - remote",
  "us remote",
  "us-based",
  "(us)",
  "americas",
  "latam",
  "latin america",
  "apac",
  "asia pacific",
  "india",
  "canada",
  "australia",
  "brazil",
  "mexico",
  "singapore",
  "japan",
  "israel",
  "philippines",
  "argentina",
  "colombia",
] as const

export function matchesSpain(location: string | null | undefined): boolean {
  if (!location) return false
  const normalized = location.toLowerCase()

  // Explicit Spain mention always qualifies, regardless of other tags.
  if (SPAIN_TERMS.some((term) => normalized.includes(term))) return true

  // Drop roles pinned to a non-European region (even if marked "remote").
  if (NON_EU_REGION_TERMS.some((term) => normalized.includes(term))) return false

  // Otherwise accept remote / Europe-eligible roles.
  if (REMOTE_EUROPE_TERMS.some((term) => normalized.includes(term))) return true

  return false
}

export function filterSpainJobs<T extends { location?: string | null }>(jobs: T[]): T[] {
  return jobs.filter((job) => matchesSpain(job.location))
}
