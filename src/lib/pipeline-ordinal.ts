// Pipeline ordinal — the single source of truth for the "Round ①②③" a user
// sees. The stored Interview.round is an internal monotonic sort key (and, from
// Phase 3, a uniqueness backstop) that can have gaps once a middle round is
// cancelled/deleted; it is NEVER shown directly. The DISPLAY ordinal is derived
// from an interview's position among its application's non-cancelled rounds in
// pipeline order, so the app, the .ics feed, and the AI prompt text always
// agree even after a mid-pipeline delete.
//
// The ordinal basis is the FULL non-cancelled ordered set for the application —
// filter tabs (upcoming/past/archived) change which cards are visible but never
// the numbering basis, so a round keeps its number across tabs.

export interface OrdinalInterview {
  id: string
  round: number
  scheduledDate: string | null
  createdAt?: string
  status: string
}

const CANCELLED = new Set(['cancelled', 'canceled'])

export function isCancelled(status: string | undefined | null): boolean {
  return CANCELLED.has((status || '').toLowerCase())
}

// Pipeline order: stored round asc, then earliest scheduled date (undated rounds
// sort last), then creation order as a stable tiebreak.
export function comparePipelineOrder(a: OrdinalInterview, b: OrdinalInterview): number {
  if (a.round !== b.round) return a.round - b.round
  const ad = a.scheduledDate ? new Date(a.scheduledDate).getTime() : Number.POSITIVE_INFINITY
  const bd = b.scheduledDate ? new Date(b.scheduledDate).getTime() : Number.POSITIVE_INFINITY
  if (ad !== bd) return ad - bd
  const ac = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const bc = b.createdAt ? new Date(b.createdAt).getTime() : 0
  return ac - bc
}

// Map<interviewId, ordinal> (1-based) over the application's non-cancelled
// rounds in pipeline order. Cancelled interviews are intentionally absent — they
// carry no round number.
export function computeOrdinals<T extends OrdinalInterview>(interviews: T[]): Map<string, number> {
  const ordered = interviews
    .filter(i => !isCancelled(i.status))
    .slice()
    .sort(comparePipelineOrder)
  const map = new Map<string, number>()
  ordered.forEach((iv, idx) => map.set(iv.id, idx + 1))
  return map
}

// The header badge count = number of non-cancelled rounds (== the last ordinal).
export function roundCount<T extends OrdinalInterview>(interviews: T[]): number {
  return interviews.filter(i => !isCancelled(i.status)).length
}

// Interviews in pipeline order (used to render the round rail top-to-bottom).
export function inPipelineOrder<T extends OrdinalInterview>(interviews: T[]): T[] {
  return interviews.slice().sort(comparePipelineOrder)
}
