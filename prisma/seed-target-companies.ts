/**
 * Seed target companies from prisma/seeds/target-companies.json.
 * Idempotent: upserts on careersUrl.
 *
 * Usage:
 *   npx tsx prisma/seed-target-companies.ts
 *
 * See .planning/phases/01-target-company-pipeline-us-spain-bridge/01-SPEC.md
 */

import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join } from "path"

const prisma = new PrismaClient()

interface SeedEntry {
  name: string
  careersUrl: string
  atsPlatform: "greenhouse" | "lever" | "ashby" | "workable" | "workday" | "custom"
  atsSlug?: string | null
  hqCountry?: string
  sizeBand?: string | null
  spainPresenceEvidence?: "manual" | "careers_page" | null
  spainPresenceUrl?: string | null
  status?: "active" | "paused" | "rejected"
  discoverySource?: "manual" | "automated"
}

async function main() {
  const seedPath = join(process.cwd(), "prisma/seeds/target-companies.json")
  console.log(`[seed] Reading ${seedPath}`)

  const raw = readFileSync(seedPath, "utf-8")
  const entries = JSON.parse(raw) as SeedEntry[]

  console.log(`[seed] ${entries.length} entries to upsert`)

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const entry of entries) {
    const existing = await prisma.company.findUnique({
      where: { careersUrl: entry.careersUrl },
    })

    if (!existing) {
      await prisma.company.create({
        data: {
          name: entry.name,
          careersUrl: entry.careersUrl,
          atsPlatform: entry.atsPlatform,
          atsSlug: entry.atsSlug || null,
          hqCountry: entry.hqCountry || "US",
          sizeBand: entry.sizeBand || null,
          spainPresenceEvidence: entry.spainPresenceEvidence || "careers_page",
          spainPresenceUrl: entry.spainPresenceUrl || null,
          status: entry.status || "active",
          discoverySource: entry.discoverySource || "manual",
        },
      })
      created++
      console.log(`[seed]   created: ${entry.name} (${entry.atsPlatform})`)
      continue
    }

    const changed =
      existing.name !== entry.name ||
      existing.atsPlatform !== entry.atsPlatform ||
      existing.atsSlug !== (entry.atsSlug || null) ||
      existing.hqCountry !== (entry.hqCountry || "US") ||
      existing.sizeBand !== (entry.sizeBand || null) ||
      existing.spainPresenceEvidence !== (entry.spainPresenceEvidence || "careers_page") ||
      existing.spainPresenceUrl !== (entry.spainPresenceUrl || null) ||
      existing.status !== (entry.status || "active")

    if (!changed) {
      unchanged++
      continue
    }

    await prisma.company.update({
      where: { careersUrl: entry.careersUrl },
      data: {
        name: entry.name,
        atsPlatform: entry.atsPlatform,
        atsSlug: entry.atsSlug || null,
        hqCountry: entry.hqCountry || "US",
        sizeBand: entry.sizeBand || null,
        spainPresenceEvidence: entry.spainPresenceEvidence || "careers_page",
        spainPresenceUrl: entry.spainPresenceUrl || null,
        status: entry.status || "active",
      },
    })
    updated++
    console.log(`[seed]   updated: ${entry.name}`)
  }

  console.log(
    `[seed] done. created=${created} updated=${updated} unchanged=${unchanged}`
  )
}

main()
  .catch((err) => {
    console.error("[seed] Fatal error:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
