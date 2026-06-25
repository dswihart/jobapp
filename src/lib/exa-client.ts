/**
 * Exa REST client.
 * POST https://api.exa.ai/search — neural/web search.
 * Docs: https://exa.ai/docs/reference/search
 * Auth via x-api-key (EXA_API_KEY). NOTE: Exa has no "job posting" category;
 * discovery relies on query phrasing, not a category param.
 */

const EXA_SEARCH_URL = "https://api.exa.ai/search"
const FETCH_TIMEOUT_MS = 15000

export interface ExaResult {
  title: string
  url: string
  publishedDate?: string
  author?: string | null
  text?: string
}

interface ExaSearchOptions {
  numResults?: number
  includeDomains?: string[]
  startPublishedDate?: string
}

interface ExaApiResponse {
  requestId?: string
  costDollars?: { total?: number } | number
  results?: Array<{
    title?: string
    url: string
    publishedDate?: string
    author?: string | null
    text?: string
  }>
}

export async function exaSearch(
  query: string,
  opts: ExaSearchOptions = {}
): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not set")
  }

  const body: Record<string, unknown> = {
    query,
    type: "auto",
    numResults: opts.numResults ?? 25,
    contents: { text: true },
  }
  if (opts.includeDomains && opts.includeDomains.length > 0) {
    body.includeDomains = opts.includeDomains
  }
  if (opts.startPublishedDate) {
    body.startPublishedDate = opts.startPublishedDate
  }

  const res = await fetch(EXA_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`Exa HTTP ${res.status} ${res.statusText}: ${detail.slice(0, 200)}`)
  }

  const data = (await res.json()) as ExaApiResponse
  const cost =
    typeof data.costDollars === "number"
      ? data.costDollars
      : data.costDollars?.total ?? 0
  console.log(
    `[Exa] query="${query.slice(0, 60)}" results=${data.results?.length ?? 0} cost=$${cost}`
  )

  return (data.results || [])
    .filter((r) => r.url)
    .map((r) => ({
      title: r.title || "",
      url: r.url,
      publishedDate: r.publishedDate,
      author: r.author ?? null,
      text: r.text,
    }))
}
