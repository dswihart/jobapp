import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { companyCreateSchema } from "@/lib/schemas/company"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sp = request.nextUrl.searchParams
  const status = sp.get("status")
  const platform = sp.get("platform")

  const where: Prisma.CompanyWhereInput = {}
  if (status) where.status = status as Prisma.CompanyWhereInput["status"]
  if (platform) where.atsPlatform = platform as Prisma.CompanyWhereInput["atsPlatform"]

  const companies = await prisma.company.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(companies)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = companyCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const created = await prisma.company.create({
      data: {
        ...parsed.data,
        spainPresenceUrl: parsed.data.spainPresenceUrl || null,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A company with this name or careers URL already exists" },
        { status: 409 }
      )
    }
    console.error("[POST /api/companies] Create failed:", error)
    return NextResponse.json({ error: "Create failed" }, { status: 500 })
  }
}
