/**
 * Target Companies Fetcher
 * Phase 1: scans all active Company rows, dispatches to the appropriate ATS adapter,
 * applies strict Spain location filter, and returns normalized JobPosting[].
 *
 * Per-company errors are tracked in Company.lastScrapeError (fail-soft).
 * See .planning/phases/01-target-company-pipeline-us-spain-bridge/01-SPEC.md
 */

import { prisma } from "../prisma"
import { fetchGreenhouse } from "./greenhouse"
import { fetchLever } from "./lever"
import { fetchAshby } from "./ashby"
import { filterSpainJobs } from "./spain-filter"
import { AdapterContext, JobPosting } from "./types"

export async function fetchFromTargetCompanies(): Promise<JobPosting[]> {
  const companies = await prisma.company.findMany({
    where: { status: "active" },
  })

  console.log(`[Target Companies] Scanning ${companies.length} active companies`)

  const all: JobPosting[] = []

  for (const company of companies) {
    try {
      if (!company.atsSlug && company.atsPlatform !== "custom") {
        await recordError(company.id, "Missing atsSlug for non-custom platform")
        continue
      }

      const ctx: AdapterContext = {
        companyId: company.id,
        companyName: company.name,
        atsSlug: company.atsSlug || "",
      }

      let jobs: JobPosting[] = []
      switch (company.atsPlatform) {
        case "greenhouse":
          jobs = await fetchGreenhouse(ctx)
          break
        case "lever":
          jobs = await fetchLever(ctx)
          break
        case "ashby":
          jobs = await fetchAshby(ctx)
          break
        case "workable":
        case "workday":
          console.log(
            `[Target Companies] ${company.name}: ${company.atsPlatform} adapter not implemented yet — skipping`
          )
          continue
        case "custom":
          // Custom companies fall through to the legacy UserJobSource.web_scrape path;
          // they should have a linked UserJobSource for that. Skip here.
          continue
      }

      console.log(`[Target Companies] ${company.name} (${company.atsPlatform}): ${jobs.length} jobs`)
      const spainOnly = filterSpainJobs(jobs)
      console.log(
        `[Target Companies] ${company.name}: ${spainOnly.length} after Spain filter (dropped ${jobs.length - spainOnly.length})`
      )
      all.push(...spainOnly)

      await prisma.company.update({
        where: { id: company.id },
        data: { lastScrapedAt: new Date(), lastScrapeError: null },
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[Target Companies] ${company.name} adapter failed:`, msg)
      await recordError(company.id, msg)
      // Fail-soft: continue to next company
    }
  }

  console.log(`[Target Companies] Scan complete. ${all.length} Spain-filtered jobs across all companies.`)
  return all
}

async function recordError(companyId: string, message: string): Promise<void> {
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        lastScrapedAt: new Date(),
        lastScrapeError: message.slice(0, 500),
      },
    })
  } catch (err) {
    console.error(`[Target Companies] Failed to record error for ${companyId}:`, err)
  }
}
