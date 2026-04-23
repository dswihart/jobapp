/**
 * Strict Spain-location filter for Phase 1 target-company ingestion.
 * Per SPEC 01-SPEC.md: only jobs whose location contains
 * Spain | España | Madrid | Barcelona | Valencia pass.
 *
 * Case-insensitive substring match. EMEA / Remote / EU strings do NOT pass
 * — this is a deliberate precision-over-recall choice.
 */

const SPAIN_TERMS = ["spain", "españa", "madrid", "barcelona", "valencia"] as const

export function matchesSpain(location: string | null | undefined): boolean {
  if (!location) return false
  const normalized = location.toLowerCase()
  return SPAIN_TERMS.some((term) => normalized.includes(term))
}

export function filterSpainJobs<T extends { location?: string | null }>(jobs: T[]): T[] {
  return jobs.filter((job) => matchesSpain(job.location))
}
