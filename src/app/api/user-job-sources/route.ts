import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET - Fetch user job sources
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sources = await prisma.userJobSource.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isBuiltIn: "desc" }, { createdAt: "desc" }],
    })

    return NextResponse.json({ sources })
  } catch (error) {
    console.error("Error fetching sources:", error)
    return NextResponse.json(
      { error: "Failed to fetch sources" },
      { status: 500 }
    )
  }
}

// POST - Create new job source
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      sourceType,
      feedUrl,
      scrapeUrl,
      scrapeSelector,
      titleSelector,
      companySelector,
      linkSelector,
      descriptionSelector,
      apiEndpoint,
      apiKey,
      searchKeywords,
      excludeKeywords,
      enabled,
    } = body

    const newSource = await prisma.userJobSource.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        sourceType,
        feedUrl: feedUrl || null,
        scrapeUrl: scrapeUrl || null,
        scrapeSelector: scrapeSelector || null,
        titleSelector: titleSelector || null,
        companySelector: companySelector || null,
        linkSelector: linkSelector || null,
        descriptionSelector: descriptionSelector || null,
        apiEndpoint: apiEndpoint || null,
        apiKey: apiKey || null,
        searchKeywords: Array.isArray(searchKeywords) ? searchKeywords : [],
        excludeKeywords: Array.isArray(excludeKeywords) ? excludeKeywords : [],
        enabled: enabled !== false,
        isBuiltIn: false,
      },
    })

    return NextResponse.json({ source: newSource })
  } catch (error) {
    console.error("Error creating source:", error)
    return NextResponse.json(
      { error: "Failed to create source" },
      { status: 500 }
    )
  }
}

// PATCH - Update job source
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateFields } = body

    // Verify ownership
    const source = await prisma.userJobSource.findUnique({
      where: { id },
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Build update data from allowed fields
    const allowedFields = [
      "enabled",
      "name",
      "description",
      "feedUrl",
      "scrapeUrl",
      "scrapeSelector",
      "titleSelector",
      "companySelector",
      "linkSelector",
      "descriptionSelector",
      "apiEndpoint",
      "apiKey",
      "searchKeywords",
      "excludeKeywords",
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        updateData[field] = updateFields[field]
      }
    }

    const updated = await prisma.userJobSource.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ source: updated })
  } catch (error) {
    console.error("Error updating source:", error)
    return NextResponse.json(
      { error: "Failed to update source" },
      { status: 500 }
    )
  }
}

// DELETE - Delete job source
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 })
    }

    // Verify ownership
    const source = await prisma.userJobSource.findUnique({
      where: { id },
    })

    if (!source || source.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    await prisma.userJobSource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting source:", error)
    return NextResponse.json(
      { error: "Failed to delete source" },
      { status: 500 }
    )
  }
}
