import { z } from "zod"

export const ATS_PLATFORMS = ["greenhouse", "lever", "ashby", "workable", "workday", "custom"] as const
export const COMPANY_STATUSES = ["active", "paused", "rejected"] as const
export const SPAIN_PRESENCE_EVIDENCE = ["manual", "careers_page"] as const
export const DISCOVERY_SOURCES = ["manual", "automated"] as const

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  careersUrl: z.string().trim().url().max(500),
  atsPlatform: z.enum(ATS_PLATFORMS),
  atsSlug: z.string().trim().max(200).optional().nullable(),
  status: z.enum(COMPANY_STATUSES).optional(),
  spainPresenceEvidence: z.enum(SPAIN_PRESENCE_EVIDENCE).optional().nullable(),
  spainPresenceUrl: z.string().trim().url().max(500).optional().nullable().or(z.literal("")),
  hqCountry: z.string().trim().min(2).max(3).optional(),
  sizeBand: z.string().trim().max(50).optional().nullable(),
  discoverySource: z.enum(DISCOVERY_SOURCES).optional(),
})

export const companyUpdateSchema = companyCreateSchema.partial()

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>
