import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { companyUpdateSchema } from "@/lib/schemas/company"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await ctx.params
  const company = await prisma.company.findUnique({ where: { id } })
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(company)
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = companyUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...parsed.data,
        spainPresenceUrl:
          parsed.data.spainPresenceUrl === "" ? null : parsed.data.spainPresenceUrl,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A company with this name or careers URL already exists" },
          { status: 409 }
        )
      }
    }
    console.error("[PATCH /api/companies/:id] Update failed:", error)
    return NextResponse.json({ error: "Update failed" }, { status: 500 })
  }
}

/**
 * DELETE semantics (per 01-SPEC.md discuss defaults):
 * - Default: soft delete — sets status='rejected'. Company row remains; linked
 *   UserJobSources keep their company_id.
 * - ?force=true: hard delete — removes the row; linked UserJobSources get
 *   company_id=NULL (FK is ON DELETE SET NULL).
 */
export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await ctx.params
  const force = request.nextUrl.searchParams.get("force") === "true"

  try {
    if (force) {
      await prisma.company.delete({ where: { id } })
      return NextResponse.json({ ok: true, mode: "hard" })
    }
    const soft = await prisma.company.update({
      where: { id },
      data: { status: "rejected" },
    })
    return NextResponse.json({ ok: true, mode: "soft", company: soft })
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("[DELETE /api/companies/:id] Delete failed:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
